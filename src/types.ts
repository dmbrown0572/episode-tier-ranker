/** A TV show as returned from a TMDB search. */
export interface Show {
  id: number;
  name: string;
  firstAirYear: string | null;
  posterPath: string | null;
  overview: string;
}

/** A single episode, keyed within a show by (season, number). */
export interface Episode {
  id: number;
  season: number;
  number: number;
  name: string;
  overview: string;
  stillPath: string | null;
  airDate: string | null;
  voteAverage: number;
}

/** Season summary from the show detail endpoint. */
export interface SeasonSummary {
  seasonNumber: number;
  name: string;
  episodeCount: number;
}

export const TIERS = ['S', 'A', 'B', 'C', 'D', 'F'] as const;
export type Tier = (typeof TIERS)[number];

/** Where an episode sits: a tier, or `null` for the unranked pool. */
export type Placement = Tier | null;

/** Stable identifier for an episode within a show, e.g. "2-7". */
export type EpisodeKey = string;

export function episodeKey(season: number, number: number): EpisodeKey {
  return `${season}-${number}`;
}

/**
 * A complete ranking for one show. `placements` only contains entries for
 * episodes the user has actually placed; anything absent is unranked.
 */
export interface TierList {
  showId: number;
  showName: string;
  /** Ordered within each tier, so users can rank inside a tier too. */
  placements: Record<Tier, EpisodeKey[]>;
}

export function emptyPlacements(): Record<Tier, EpisodeKey[]> {
  return TIERS.reduce(
    (acc, tier) => {
      acc[tier] = [];
      return acc;
    },
    {} as Record<Tier, EpisodeKey[]>,
  );
}

/** Inverts placements into a flat key -> tier lookup. */
export function placementMap(list: TierList): Map<EpisodeKey, Tier> {
  const map = new Map<EpisodeKey, Tier>();
  for (const tier of TIERS) {
    for (const key of list.placements[tier]) map.set(key, tier);
  }
  return map;
}
