// Sync with your own Apps Script sync page (see apps-script/Code.gs).
// Schools only let those pages be opened by signed-in school accounts, so the app can't fetch
// from them. Instead: Sync sends you to the page, it reads your Classroom, and its button brings
// you back to #/import?d=<list> (the part after # never leaves the phone).
import { pruneDone } from './store.js';

// Accepts only a deployed Apps Script web app URL.
export function validUrl(u) {
  return /^https:\/\/script\.google\.com\/(a\/macros\/[\w.-]+\/|macros\/)s\/[\w-]+\/exec$/.test(String(u || '').trim());
}

// Where Sync goes: the sync page, told to come back to this app.
export function syncHref(feedUrl, appBase) {
  return `${feedUrl}?return=${encodeURIComponent(appBase)}`;
}

// The app's own address with no query or hash, e.g. https://grant02339-ship-it.github.io/due-date-dashboard/
export function appBase(loc = globalThis.location) {
  return loc.origin + loc.pathname.replace(/index\.html$/, '');
}

function fromBase64Url(s) {
  const b = s.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b + '='.repeat((4 - (b.length % 4)) % 4));
  // bytes -> UTF-8 text (works everywhere, no TextDecoder needed)
  return decodeURIComponent(Array.from(bin, ch => '%' + ch.charCodeAt(0).toString(16).padStart(2, '0')).join(''));
}

const str = (v, max = 300) => (typeof v === 'string' ? v.slice(0, max) : '');
const STATES = new Set(['NEW', 'CREATED', 'TURNED_IN', 'RETURNED', 'RECLAIMED_BY_STUDENT']);

// Cleans one assignment from the link. Anything odd is dropped or blanked, never trusted.
export function cleanAssignment(a) {
  if (!a || typeof a !== 'object') return null;
  const due = str(a.due, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(due) || !str(a.id)) return null;
  const dueAt = Number.isNaN(Date.parse(a.dueAt)) ? `${due}T23:59:00` : str(a.dueAt, 40);
  const link = str(a.link, 500);
  return {
    id: str(a.id, 120),
    course: str(a.course, 120),
    title: str(a.title) || 'Untitled',
    due,
    time: /^\d{1,2}:\d{2} [AP]M$/.test(a.time) ? a.time : '',
    dueAt,
    link: /^https:\/\/classroom\.google\.com\//.test(link) ? link : '',
    state: STATES.has(a.state) ? a.state : 'NEW',
    late: a.late === true,
  };
}

// Decodes #/import?d=... Returns {ok, count} or {ok:false, error}. On success updates state (caller saves).
export function importPayload(state, d) {
  let data;
  try { data = JSON.parse(fromBase64Url(String(d || ''))); } catch (e) { return { ok: false, error: 'That sync link was cut off. Tap Sync to try again.' }; }
  if (!data || data.v !== 1 || !Array.isArray(data.a)) return { ok: false, error: 'That sync link didn’t look right. Tap Sync to try again.' };
  const list = data.a.slice(0, 1000).map(cleanAssignment).filter(Boolean);
  const updated = Number.isNaN(Date.parse(data.updated)) ? new Date().toISOString() : data.updated;
  state.cache = { updated, assignments: list };
  pruneDone(state);
  return { ok: true, count: list.length };
}

// One-time setup link: #/connect?u=<sync page url>
export function readConnectParams(params) {
  const url = String(params.u || '').trim();
  return validUrl(url) ? { url } : null;
}
