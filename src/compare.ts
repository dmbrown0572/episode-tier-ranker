import { placementMap, type EpisodeKey, type Tier, type TierList } from './types';

export interface EpisodeComparison {
  key: EpisodeKey;
  mine: Tier;
  theirs: Tier;
  agrees: boolean;
}

export interface ComparisonResult {
  /** Episodes both lists placed, in show order once sorted by the caller. */
  shared: EpisodeComparison[];
  /** Count of shared episodes placed in the identical tier. */
  agreed: number;
  /** Exact-tier-match percentage over shared episodes, 0-100. */
  overlapPercent: number;
  /** Placed by me but not by them, and vice versa. */
  onlyMine: EpisodeKey[];
  onlyTheirs: EpisodeKey[];
  sameShow: boolean;
}

/**
 * Overlap is exact tier agreement measured over the episodes *both* people
 * ranked. Episodes only one person placed are reported separately rather than
 * counted as disagreement, so a partially-filled list isn't unfairly penalised.
 */
export function compareLists(mine: TierList, theirs: TierList): ComparisonResult {
  const mineMap = placementMap(mine);
  const theirsMap = placementMap(theirs);

  const shared: EpisodeComparison[] = [];
  const onlyMine: EpisodeKey[] = [];

  for (const [key, myTier] of mineMap) {
    const theirTier = theirsMap.get(key);
    if (theirTier === undefined) {
      onlyMine.push(key);
    } else {
      shared.push({ key, mine: myTier, theirs: theirTier, agrees: myTier === theirTier });
    }
  }

  const onlyTheirs = [...theirsMap.keys()].filter((key) => !mineMap.has(key));

  const agreed = shared.filter((s) => s.agrees).length;
  const overlapPercent = shared.length === 0 ? 0 : (agreed / shared.length) * 100;

  return {
    shared,
    agreed,
    overlapPercent,
    onlyMine,
    onlyTheirs,
    sameShow: mine.showId === theirs.showId,
  };
}

/** Sorts comparison rows into broadcast order using the "season-episode" key. */
export function sortComparisons(rows: EpisodeComparison[]): EpisodeComparison[] {
  return [...rows].sort((a, b) => {
    const [as, ae] = a.key.split('-').map(Number);
    const [bs, be] = b.key.split('-').map(Number);
    return (as || 999) - (bs || 999) || ae - be;
  });
}
