// Pulls your assignments from your own Apps Script web app (see apps-script/Code.gs).
import { pruneDone } from './store.js';

// Accepts only a deployed Apps Script web app URL.
export function validUrl(u) {
  return /^https:\/\/script\.google\.com\/(a\/macros\/[^/]+\/|macros\/)s\/[\w-]+\/exec$/.test(String(u || '').trim());
}

const ERRORS = {
  'bad-key': 'The key doesn’t match. Copy it again from the Apps Script log.',
};

// Returns {ok, error?}. On success updates state.cache (caller saves).
export async function refresh(state, { fresh = false, fetchFn = globalThis.fetch } = {}) {
  const { url, key } = state.feed;
  if (!url || !key) return { ok: false, error: 'not-connected' };
  let res;
  try {
    res = await fetchFn(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ key, fresh }),
      redirect: 'follow',
    });
  } catch (e) {
    return { ok: false, error: 'You look offline. Showing your last saved list.' };
  }
  let data;
  try { data = await res.json(); } catch (e) {
    return { ok: false, error: 'Classroom sent back something unexpected. Check the web app is deployed with access “Anyone”.' };
  }
  if (!data || !data.ok) return { ok: false, error: ERRORS[data && data.error] || `Classroom error: ${(data && data.error) || 'unknown'}` };
  state.cache = { updated: data.updated || new Date().toISOString(), assignments: Array.isArray(data.assignments) ? data.assignments : [] };
  pruneDone(state);
  return { ok: true };
}

// One-time setup link: #/connect?u=<url>&k=<key> (the part after # never leaves the phone).
export function readConnectParams(params) {
  const url = (params.u || '').trim(), key = (params.k || '').trim();
  return validUrl(url) && /^[\w-]{16,}$/.test(key) ? { url, key } : null;
}
