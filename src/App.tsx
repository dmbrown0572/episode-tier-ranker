import { useCallback, useEffect, useMemo, useState } from 'react';
import { CompareView } from './components/CompareView';
import { Footer } from './components/Footer';
import { Settings } from './components/Settings';
import { ShowSearch } from './components/ShowSearch';
import { TierBoard } from './components/TierBoard';
import { buildShareUrl, clearSharedList, readSharedList } from './share';
import { clearLastShow, loadLastShowId, loadList, saveList } from './storage';
import { getAllEpisodes, getShow, hasApiKey, posterUrl } from './tmdb';
import { emptyPlacements, type Episode, type SeasonSummary, type Show, type TierList } from './types';
import './App.css';

type View = 'search' | 'board' | 'compare' | 'settings';

/** Page frame. Every screen renders through this so the TMDB attribution,
 *  which their terms require to be visible in the app, can't be missed. */
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="app">
      {children}
      <Footer />
    </main>
  );
}

export default function App() {
  const [keyReady, setKeyReady] = useState(hasApiKey);
  const [view, setView] = useState<View>('search');
  const [show, setShow] = useState<Show | null>(null);
  const [seasons, setSeasons] = useState<SeasonSummary[]>([]);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [list, setList] = useState<TierList | null>(null);
  const [seasonFilter, setSeasonFilter] = useState<number | 'all'>('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [sharedList, setSharedList] = useState<TierList | null>(() => readSharedList());

  /** Loads a show's seasons and every episode, then restores any saved list. */
  const openShow = useCallback(async (showId: number, fallbackName: string) => {
    setLoading(true);
    setError(null);
    try {
      const { show: detail, seasons: seasonList } = await getShow(showId);
      const eps = await getAllEpisodes(showId, seasonList);
      setShow(detail);
      setSeasons(seasonList);
      setEpisodes(eps);
      setSeasonFilter('all');
      setList(
        loadList(showId) ?? {
          showId,
          showName: detail.name || fallbackName,
          placements: emptyPlacements(),
        },
      );
    } catch (err) {
      setError((err as Error).message);
      setShow(null);
      setList(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // On first load: an incoming share link wins, otherwise resume the last show.
  useEffect(() => {
    if (!keyReady) {
      setView('settings');
      return;
    }
    const incoming = readSharedList();
    if (incoming) {
      void openShow(incoming.showId, incoming.showName).then(() => setView('compare'));
      return;
    }
    const last = loadLastShowId();
    if (last) void openShow(last, 'Show').then(() => setView('board'));
  }, [keyReady, openShow]);

  // Persist on every change so a refresh never loses a ranking.
  useEffect(() => {
    if (list) saveList(list);
  }, [list]);

  /** Bridges the board's updater form onto the nullable `list` state. */
  const updateList = useCallback((updater: (prev: TierList) => TierList) => {
    setList((prev) => (prev ? updater(prev) : prev));
  }, []);

  const visibleEpisodes = useMemo(
    () => (seasonFilter === 'all' ? episodes : episodes.filter((e) => e.season === seasonFilter)),
    [episodes, seasonFilter],
  );

  function pickShow(picked: Show) {
    void openShow(picked.id, picked.name).then(() => setView('board'));
  }

  function backToSearch() {
    clearLastShow();
    setShow(null);
    setList(null);
    setEpisodes([]);
    setView('search');
  }

  async function share() {
    if (!list) return;
    const url = buildShareUrl(list);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Clipboard can be blocked; fall back to letting the user copy manually.
      window.prompt('Copy your share link:', url);
    }
  }

  function dismissShared() {
    setSharedList(null);
    clearSharedList();
    setView('board');
  }

  if (view === 'settings') {
    return (
      <Shell>
        <Settings
          onSaved={() => {
            setKeyReady(hasApiKey());
            setView(show ? 'board' : 'search');
          }}
          onCancel={keyReady ? () => setView(show ? 'board' : 'search') : undefined}
        />
      </Shell>
    );
  }

  if (loading) {
    return (
      <Shell>
        <p className="muted center">Loading episodes&hellip;</p>
      </Shell>
    );
  }

  if (view === 'search' || !show || !list) {
    return (
      <Shell>
        <header className="topbar topbar--bare">
          <button type="button" className="btn" onClick={() => setView('settings')}>
            Settings
          </button>
        </header>
        {error && <p className="error">{error}</p>}
        <ShowSearch
          onPick={pickShow}
          onPickShowId={(id, name) => void openShow(id, name).then(() => setView('board'))}
        />
      </Shell>
    );
  }

  const poster = posterUrl(show.posterPath);

  return (
    <Shell>
      <header className="topbar">
        <div className="topbar-show">
          {poster && <img src={poster} alt="" className="topbar-poster" />}
          <div>
            <h1 className="topbar-title">{show.name}</h1>
            {show.firstAirYear && <span className="muted">{show.firstAirYear}</span>}
          </div>
        </div>
        <div className="topbar-actions">
          {sharedList && view === 'board' && (
            <button type="button" className="btn btn--primary" onClick={() => setView('compare')}>
              View comparison
            </button>
          )}
          {view === 'board' && (
            <button type="button" className="btn btn--primary" onClick={() => void share()}>
              {copied ? 'Link copied!' : 'Share my list'}
            </button>
          )}
          <button type="button" className="btn" onClick={backToSearch}>
            Change show
          </button>
          <button type="button" className="btn" onClick={() => setView('settings')}>
            Settings
          </button>
        </div>
      </header>

      {error && <p className="error">{error}</p>}

      {view === 'compare' && sharedList ? (
        <CompareView mine={list} theirs={sharedList} episodes={episodes} onBack={dismissShared} />
      ) : (
        <>
          {seasons.length > 1 && (
            <nav className="season-filter">
              <button
                type="button"
                className={`chip${seasonFilter === 'all' ? ' chip--on' : ''}`}
                onClick={() => setSeasonFilter('all')}
              >
                All seasons
              </button>
              {seasons.map((s) => (
                <button
                  key={s.seasonNumber}
                  type="button"
                  className={`chip${seasonFilter === s.seasonNumber ? ' chip--on' : ''}`}
                  onClick={() => setSeasonFilter(s.seasonNumber)}
                >
                  {s.seasonNumber === 0 ? 'Specials' : `Season ${s.seasonNumber}`}
                </button>
              ))}
            </nav>
          )}
          <TierBoard episodes={visibleEpisodes} list={list} onChange={updateList} />
        </>
      )}
    </Shell>
  );
}
