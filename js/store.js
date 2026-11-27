// Everything the app remembers, saved only on this device (localStorage 'ddd.v1').
export const KEY = 'ddd.v1';

export function defaultState() {
  return {
    v: 1,
    settings: { theme: 'auto', name: '' },
    feed: { url: '' },                         // your Apps Script sync page
    cache: { updated: null, assignments: [] }, // last list pulled from Classroom
    done: {},                                  // id -> true/false: your own check-offs override Classroom
  };
}

const storage = () => { try { return globalThis.localStorage; } catch (e) { return null; } };

export function loadState(ls = storage()) {
  const base = defaultState();
  try {
    const s = JSON.parse(ls.getItem(KEY));
    if (!s || typeof s !== 'object' || Array.isArray(s) || s.v !== 1) return base;
    return {
      ...base, ...s,
      settings: { ...base.settings, ...s.settings },
      feed: { ...base.feed, ...s.feed },
      cache: { ...base.cache, ...s.cache, assignments: Array.isArray(s.cache && s.cache.assignments) ? s.cache.assignments : [] },
      done: s.done && typeof s.done === 'object' ? s.done : {},
    };
  } catch (e) { return base; }
}

export function saveState(state, ls = storage()) {
  try { ls.setItem(KEY, JSON.stringify(state)); return true; } catch (e) { return false; }
}

// Drops check-offs for assignments that are no longer in the feed, so the map can't grow forever.
export function pruneDone(state) {
  const ids = new Set(state.cache.assignments.map(a => a.id));
  for (const id of Object.keys(state.done)) if (!ids.has(id)) delete state.done[id];
}
