import { useEffect, useState } from 'react';
import { posterUrl, searchShows } from '../tmdb';
import { loadAllLists, deleteList } from '../storage';
import type { Show } from '../types';

interface Props {
  onPick: (show: Show) => void;
  onPickShowId: (showId: number, showName: string) => void;
}

export function ShowSearch({ onPick, onPickShowId }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Show[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recent, setRecent] = useState(() => loadAllLists());

  useEffect(() => {
    const term = query.trim();
    if (!term) {
      setResults([]);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    const timer = setTimeout(() => {
      searchShows(term)
        .then((shows) => {
          if (cancelled) return;
          setResults(shows);
          setError(null);
        })
        .catch((err: Error) => {
          if (!cancelled) setError(err.message);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  function removeRecent(showId: number) {
    deleteList(showId);
    setRecent(loadAllLists());
  }

  return (
    <div className="search">
      <h1 className="search-heading">Rank a show, episode by episode</h1>
      <p className="search-sub">
        Search for a series, drag every episode into an S&ndash;F tier, then share a link so
        friends can see how much your rankings overlap.
      </p>

      <input
        className="search-input"
        type="search"
        value={query}
        placeholder="Search for a TV show&hellip;"
        onChange={(e) => setQuery(e.target.value)}
        autoFocus
      />

      {error && <p className="error">{error}</p>}
      {loading && <p className="muted">Searching&hellip;</p>}

      <div className="show-grid">
        {results.map((show) => {
          const poster = posterUrl(show.posterPath);
          return (
            <button
              key={show.id}
              type="button"
              className="show-card"
              aria-label={`Rank ${show.name}${show.firstAirYear ? `, ${show.firstAirYear}` : ''}`}
              onClick={() => onPick(show)}
            >
              {poster ? (
                <img src={poster} alt="" className="show-poster" loading="lazy" />
              ) : (
                <div className="show-poster show-poster--empty">No poster</div>
              )}
              <span className="show-name">{show.name}</span>
              {show.firstAirYear && <span className="show-year">{show.firstAirYear}</span>}
            </button>
          );
        })}
      </div>

      {!query && recent.length > 0 && (
        <section className="recent">
          <h2 className="recent-heading">Your lists</h2>
          <ul className="recent-list">
            {recent.map((list) => (
              <li key={list.showId} className="recent-item">
                <button
                  type="button"
                  className="recent-open"
                  onClick={() => onPickShowId(list.showId, list.showName)}
                >
                  {list.showName}
                </button>
                <button
                  type="button"
                  className="recent-delete"
                  title={`Delete your ${list.showName} list`}
                  onClick={() => removeRecent(list.showId)}
                >
                  &times;
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
