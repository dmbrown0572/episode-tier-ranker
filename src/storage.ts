import type { TierList } from './types';

const LIST_PREFIX = 'tier-ranker:list:';
const LAST_SHOW = 'tier-ranker:last-show';

export function saveList(list: TierList): void {
  try {
    localStorage.setItem(LIST_PREFIX + list.showId, JSON.stringify(list));
    localStorage.setItem(LAST_SHOW, String(list.showId));
  } catch {
    // Storage can be full or blocked (private mode); ranking still works in memory.
  }
}

export function loadList(showId: number): TierList | null {
  const raw = localStorage.getItem(LIST_PREFIX + showId);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as TierList;
  } catch {
    return null;
  }
}

export function loadLastShowId(): number | null {
  const raw = localStorage.getItem(LAST_SHOW);
  const id = raw ? Number(raw) : NaN;
  return Number.isFinite(id) ? id : null;
}

export function clearLastShow(): void {
  localStorage.removeItem(LAST_SHOW);
}

/** Every show the user has started ranking, for the "recent" list on search. */
export function loadAllLists(): TierList[] {
  const lists: TierList[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key?.startsWith(LIST_PREFIX)) continue;
    try {
      const list = JSON.parse(localStorage.getItem(key) ?? '') as TierList;
      if (list?.showId) lists.push(list);
    } catch {
      // Skip corrupt entries.
    }
  }
  return lists;
}

export function deleteList(showId: number): void {
  localStorage.removeItem(LIST_PREFIX + showId);
}
