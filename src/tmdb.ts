import type { Episode, SeasonSummary, Show } from './types';

const BASE = 'https://api.themoviedb.org/3';
const IMAGE_BASE = 'https://image.tmdb.org/t/p';
const KEY_STORAGE = 'tier-ranker:tmdb-key';

/**
 * The key comes from `.env` (VITE_TMDB_API_KEY) when present, but a key saved
 * in localStorage wins so a visitor can supply their own without a rebuild.
 */
export function getApiKey(): string {
  return (
    localStorage.getItem(KEY_STORAGE) ??
    (import.meta.env.VITE_TMDB_API_KEY as string | undefined) ??
    ''
  );
}

export function setApiKey(key: string): void {
  const trimmed = key.trim();
  if (trimmed) localStorage.setItem(KEY_STORAGE, trimmed);
  else localStorage.removeItem(KEY_STORAGE);
}

export function hasApiKey(): boolean {
  return getApiKey().length > 0;
}

export function stillUrl(path: string | null, size: 'w300' | 'w780' = 'w300'): string | null {
  return path ? `${IMAGE_BASE}/${size}${path}` : null;
}

export function posterUrl(path: string | null, size: 'w154' | 'w342' = 'w154'): string | null {
  return path ? `${IMAGE_BASE}/${size}${path}` : null;
}

export class TmdbError extends Error {}

async function request<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const key = getApiKey();
  if (!key) throw new TmdbError('No TMDB API key set. Add one in Settings.');

  const url = new URL(BASE + path);
  // A v3 key goes in the query string; a v4 token (long, dotted JWT) goes in a header.
  const isV4Token = key.split('.').length === 3;
  if (!isV4Token) url.searchParams.set('api_key', key);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const res = await fetch(url, {
    headers: isV4Token ? { Authorization: `Bearer ${key}` } : {},
  });

  if (res.status === 401) throw new TmdbError('TMDB rejected the API key. Check it in Settings.');
  if (res.status === 404) throw new TmdbError('Not found on TMDB.');
  if (!res.ok) throw new TmdbError(`TMDB request failed (${res.status}).`);
  return (await res.json()) as T;
}

interface RawSearchResult {
  id: number;
  name: string;
  first_air_date?: string;
  poster_path: string | null;
  overview: string;
}

export async function searchShows(query: string): Promise<Show[]> {
  if (!query.trim()) return [];
  const data = await request<{ results: RawSearchResult[] }>('/search/tv', {
    query,
    include_adult: 'false',
  });
  return data.results.map((r) => ({
    id: r.id,
    name: r.name,
    firstAirYear: r.first_air_date ? r.first_air_date.slice(0, 4) : null,
    posterPath: r.poster_path,
    overview: r.overview,
  }));
}

interface RawShowDetail {
  id: number;
  name: string;
  first_air_date?: string;
  poster_path: string | null;
  overview: string;
  seasons: { season_number: number; name: string; episode_count: number }[];
}

export async function getShow(id: number): Promise<{ show: Show; seasons: SeasonSummary[] }> {
  const data = await request<RawShowDetail>(`/tv/${id}`);
  return {
    show: {
      id: data.id,
      name: data.name,
      firstAirYear: data.first_air_date ? data.first_air_date.slice(0, 4) : null,
      posterPath: data.poster_path,
      overview: data.overview,
    },
    // Season 0 is TMDB's "Specials" bucket — keep it, but it sorts last.
    seasons: data.seasons
      .filter((s) => s.episode_count > 0)
      .map((s) => ({
        seasonNumber: s.season_number,
        name: s.name,
        episodeCount: s.episode_count,
      }))
      .sort((a, b) => (a.seasonNumber || 999) - (b.seasonNumber || 999)),
  };
}

interface RawSeason {
  episodes: {
    id: number;
    season_number: number;
    episode_number: number;
    name: string;
    overview: string;
    still_path: string | null;
    air_date: string | null;
    vote_average: number;
  }[];
}

export async function getSeasonEpisodes(showId: number, season: number): Promise<Episode[]> {
  const data = await request<RawSeason>(`/tv/${showId}/season/${season}`);
  return data.episodes.map((e) => ({
    id: e.id,
    season: e.season_number,
    number: e.episode_number,
    name: e.name,
    overview: e.overview,
    stillPath: e.still_path,
    airDate: e.air_date,
    voteAverage: e.vote_average,
  }));
}

/** Fetches every listed season in parallel and returns one flat, sorted list. */
export async function getAllEpisodes(
  showId: number,
  seasons: SeasonSummary[],
): Promise<Episode[]> {
  const results = await Promise.all(
    seasons.map((s) => getSeasonEpisodes(showId, s.seasonNumber)),
  );
  return results
    .flat()
    .sort((a, b) => (a.season || 999) - (b.season || 999) || a.number - b.number);
}
