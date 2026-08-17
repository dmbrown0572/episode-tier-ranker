import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';
import { TIERS, emptyPlacements, type TierList } from './types';

const VERSION = 1;

/**
 * Wire form is a positional tuple rather than an object so the JSON stays
 * short before compression: [version, showId, showName, [keys per tier]].
 */
type Payload = [number, number, string, string[][]];

export function encodeTierList(list: TierList): string {
  const payload: Payload = [
    VERSION,
    list.showId,
    list.showName,
    TIERS.map((tier) => list.placements[tier]),
  ];
  return compressToEncodedURIComponent(JSON.stringify(payload));
}

export function decodeTierList(encoded: string): TierList | null {
  let payload: unknown;
  try {
    const json = decompressFromEncodedURIComponent(encoded);
    if (!json) return null;
    payload = JSON.parse(json);
  } catch {
    return null;
  }

  if (!Array.isArray(payload) || payload.length < 4) return null;
  const [version, showId, showName, tierKeys] = payload as Payload;
  if (version !== VERSION) return null;
  if (typeof showId !== 'number' || typeof showName !== 'string') return null;
  if (!Array.isArray(tierKeys)) return null;

  const placements = emptyPlacements();
  TIERS.forEach((tier, i) => {
    const keys = tierKeys[i];
    if (Array.isArray(keys)) {
      placements[tier] = keys.filter((k): k is string => typeof k === 'string');
    }
  });

  return { showId, showName, placements };
}

/** Absolute URL that opens the app in compare mode against `list`. */
export function buildShareUrl(list: TierList): string {
  const url = new URL(window.location.href);
  url.hash = '';
  url.search = `?compare=${encodeTierList(list)}`;
  return url.toString();
}

/** Reads an incoming `?compare=` list, if the current URL carries one. */
export function readSharedList(): TierList | null {
  const encoded = new URLSearchParams(window.location.search).get('compare');
  return encoded ? decodeTierList(encoded) : null;
}

export function clearSharedList(): void {
  const url = new URL(window.location.href);
  url.search = '';
  window.history.replaceState(null, '', url.toString());
}
