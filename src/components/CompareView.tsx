import { useMemo } from 'react';
import { compareLists, sortComparisons } from '../compare';
import { stillUrl } from '../tmdb';
import { episodeKey, type Episode, type TierList } from '../types';

interface Props {
  mine: TierList;
  theirs: TierList;
  episodes: Episode[];
  onBack: () => void;
}

export function CompareView({ mine, theirs, episodes, onBack }: Props) {
  const result = useMemo(() => compareLists(mine, theirs), [mine, theirs]);
  const rows = useMemo(() => sortComparisons(result.shared), [result]);

  const byKey = useMemo(() => {
    const map = new Map<string, Episode>();
    for (const ep of episodes) map.set(episodeKey(ep.season, ep.number), ep);
    return map;
  }, [episodes]);

  if (!result.sameShow) {
    return (
      <div className="compare">
        <button type="button" className="btn" onClick={onBack}>
          &larr; Back to my list
        </button>
        <p className="error">
          These lists rank different shows &mdash; yours is <strong>{mine.showName}</strong> and
          theirs is <strong>{theirs.showName}</strong>. Rank the same show to compare.
        </p>
      </div>
    );
  }

  const pct = Math.round(result.overlapPercent);

  return (
    <div className="compare">
      <button type="button" className="btn" onClick={onBack}>
        &larr; Back to my list
      </button>

      <div className="score">
        <div className="score-ring" style={{ '--pct': `${pct}` } as React.CSSProperties}>
          <span className="score-value">{pct}%</span>
        </div>
        <div className="score-detail">
          <h2>{mine.showName}</h2>
          <p>
            You agree on <strong>{result.agreed}</strong> of{' '}
            <strong>{result.shared.length}</strong> episodes you both ranked.
          </p>
          {(result.onlyMine.length > 0 || result.onlyTheirs.length > 0) && (
            <p className="muted">
              {result.onlyMine.length} ranked only by you &middot; {result.onlyTheirs.length} ranked
              only by them &mdash; these are excluded from the percentage.
            </p>
          )}
        </div>
      </div>

      {result.shared.length === 0 ? (
        <p className="muted">
          No episodes in common yet. Rank some of the same episodes to get a score.
        </p>
      ) : (
        <table className="compare-table">
          <thead>
            <tr>
              <th>Episode</th>
              <th>You</th>
              <th>Them</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const ep = byKey.get(row.key);
              const still = stillUrl(ep?.stillPath ?? null);
              return (
                <tr key={row.key} className={row.agrees ? 'row-agree' : 'row-disagree'}>
                  <td className="cell-episode">
                    {still && <img src={still} alt="" className="cell-still" loading="lazy" />}
                    <span>
                      <span className="card-code">{`S${row.key.replace('-', 'E')}`}</span>
                      <span className="cell-name">{ep?.name ?? 'Unknown episode'}</span>
                    </span>
                  </td>
                  <td>
                    <span className={`pill tier-bg-${row.mine}`}>{row.mine}</span>
                  </td>
                  <td>
                    <span className={`pill tier-bg-${row.theirs}`}>{row.theirs}</span>
                  </td>
                  <td className="cell-verdict">{row.agrees ? '✓' : '✗'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
