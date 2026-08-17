import { useEffect, useMemo, useState } from 'react';
import { stillUrl } from '../tmdb';
import {
  TIERS,
  episodeKey,
  placementMap,
  type Episode,
  type Tier,
  type TierList,
} from '../types';

interface Props {
  episodes: Episode[];
  list: TierList;
  onAssign: (key: string, tier: Tier) => void;
  onViewList: () => void;
}

/**
 * Focused ranking mode: one episode at a time, image first. Picking a tier
 * advances to the next unranked episode; the board view is for reviewing and
 * fine-tuning afterwards.
 */
export function RankView({ episodes, list, onAssign, onViewList }: Props) {
  const placed = useMemo(() => placementMap(list), [list]);
  const unranked = useMemo(
    () => episodes.filter((e) => !placed.has(episodeKey(e.season, e.number))),
    [episodes, placed],
  );

  // Cursor into the unranked queue, so "skip" can defer an episode to later.
  const [cursor, setCursor] = useState(0);
  const current = unranked.length > 0 ? unranked[cursor % unranked.length] : null;

  // Ranking or filtering can shrink the queue; keep the cursor in range.
  useEffect(() => {
    if (cursor >= unranked.length) setCursor(0);
  }, [cursor, unranked.length]);

  // Keyboard: S/A/B/C/D/F ranks, arrows skip around the queue.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (!current || event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
      const tier = TIERS.find((t) => t.toLowerCase() === event.key.toLowerCase());
      if (tier) {
        onAssign(episodeKey(current.season, current.number), tier);
      } else if (event.key === 'ArrowRight') {
        setCursor((c) => (c + 1) % Math.max(1, unranked.length));
      } else if (event.key === 'ArrowLeft') {
        setCursor((c) => (c - 1 + Math.max(1, unranked.length)) % Math.max(1, unranked.length));
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [current, unranked.length, onAssign]);

  const ranked = episodes.length - unranked.length;

  if (!current) {
    return (
      <div className="rank-done">
        <h2>All {episodes.length} episodes ranked!</h2>
        <p className="muted">Head to your tier list to admire it, shuffle placements, or share.</p>
        <button type="button" className="btn btn--primary" onClick={onViewList}>
          View my tier list
        </button>
      </div>
    );
  }

  const still = stillUrl(current.stillPath, 'w780');

  return (
    <div className="rank">
      <div className="rank-progress">
        <div className="rank-progress-bar" style={{ width: `${(ranked / episodes.length) * 100}%` }} />
      </div>
      <p className="rank-counter muted">
        {ranked} of {episodes.length} ranked &middot; {unranked.length} to go
      </p>

      <div className="rank-card">
        {still ? (
          <img src={still} alt="" className="rank-still" />
        ) : (
          <div className="rank-still rank-still--empty">No image available</div>
        )}
        <div className="rank-info">
          <span className="card-code">
            S{current.season}E{current.number}
          </span>
          <h2 className="rank-title">{current.name}</h2>
          {current.airDate && <span className="muted">{current.airDate}</span>}
          {current.overview && <p className="rank-overview">{current.overview}</p>}
        </div>
      </div>

      <div className="rank-tiers">
        {TIERS.map((tier) => (
          <button
            key={tier}
            type="button"
            className={`rank-tier-btn tier-bg-${tier}`}
            onClick={() => onAssign(episodeKey(current.season, current.number), tier)}
          >
            {tier}
          </button>
        ))}
      </div>

      <div className="rank-nav">
        <button
          type="button"
          className="btn"
          disabled={unranked.length < 2}
          onClick={() => setCursor((c) => (c + 1) % unranked.length)}
        >
          Skip for now
        </button>
        <span className="muted rank-hint">Keys: S A B C D F to rank, arrows to skip</span>
      </div>
    </div>
  );
}
