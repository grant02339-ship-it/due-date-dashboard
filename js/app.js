// Boot, hash router, nav, theme, Classroom sync.
// Adding a screen = creating js/views/<name>.js that exports render(el, params, ctx).
import { loadState, saveState } from './store.js';
import { readConnectParams, importPayload, syncHref, appBase } from './feed.js';
import { h, icon, brandMark, applyTheme, placeholder } from './ui.js';
import { initOffline, routeChanged } from './offline.js';

export const ROUTES = {
  today:    { title: 'Today', tab: 'today' },
  week:     { title: 'Week', tab: 'week' },
  settings: { title: 'Settings', tab: 'settings' },
  connect:  { title: 'Connect', tab: 'settings' }, // one-time setup link, see feed.js
  import:   { title: 'Sync', tab: 'today' },       // where the sync page sends you back, see feed.js
};
const NAV = [['today', 'Today'], ['week', 'Week'], ['settings', 'Settings']];

export function parseHash(hash) {
  const raw = String(hash || '').replace(/^#\/?/, '');
  const [path, query = ''] = raw.split('?');
  const parts = path.split('/').filter(Boolean);
  const valid = !parts[0] || Object.hasOwn(ROUTES, parts[0]);
  const name = valid ? parts[0] || 'today' : 'today';
  return { name, def: ROUTES[name], params: Object.fromEntries(new URLSearchParams(query)), key: valid && raw ? raw : 'today', valid };
}

/* ---------- Context shared with views ---------- */
// ?demo in the page URL shows sample assignments and never saves (for previews and screenshots).
const demo = new URLSearchParams(location.search).has('demo');
const ctx = {
  state: loadState(),
  lastError: '',
  save() { return demo ? true : saveState(ctx.state); },
  applyTheme,
  rerender() { return route({ keepScroll: true }); },
  // Goes to your sync page, which reads Classroom and sends you back to #/import.
  sync() {
    if (demo) { toast('Sync is off in the demo'); return; }
    if (!ctx.state.feed.url) { location.hash = '#/settings'; return; }
    location.href = syncHref(ctx.state.feed.url, appBase());
  },
};

/* ---------- Shell ---------- */
const view = document.getElementById('view');
const topTitle = document.querySelector('.topbar-title');
const tabbar = document.querySelector('.tabbar');
const sidebar = document.querySelector('.sidebar');

function buildNav() {
  tabbar.style.setProperty('--n', NAV.length);
  tabbar.append(h('span', { class: 'tab-ind', 'aria-hidden': 'true' }));
  for (const [id, label] of NAV) {
    tabbar.append(h('a', { class: 'tab', href: `#/${id}`, dataset: { tab: id } }, icon(id), h('span', null, label)));
  }
  sidebar.append(
    h('div', { class: 'brand' }, brandMark(), h('span', null, 'Due Date Dashboard')),
    h('div', { class: 'side-box' },
      ...NAV.slice(0, 2).map(([id, label]) => h('a', { class: 'side-link', href: `#/${id}`, dataset: { tab: id } }, icon(id), h('span', null, label)))),
    h('div', { class: 'side-box' },
      h('a', { class: 'side-link', href: '#/settings', dataset: { tab: 'settings' } }, icon('settings'), h('span', null, 'Settings'))),
  );
}

function setActiveNav(tab) {
  document.querySelectorAll('[data-tab]').forEach(a => {
    if (a.dataset.tab === tab) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  const i = NAV.findIndex(([id]) => id === tab);
  if (i >= 0) { tabbar.dataset.i = i; tabbar.style.setProperty('--i', i); }
  else delete tabbar.dataset.i;
}

let scrollQueued = false;
function syncScrolled() {
  scrollQueued = false;
  document.documentElement.classList.toggle('scrolled', window.scrollY > 40);
}
window.addEventListener('scroll', () => {
  if (!scrollQueued) { scrollQueued = true; requestAnimationFrame(syncScrolled); }
}, { passive: true });

/* ---------- Views ---------- */
const cache = new Map();
async function loadView(name) {
  if (cache.has(name)) return cache.get(name);
  try {
    const mod = await import(`./views/${name}.js`);
    cache.set(name, mod);
    return mod;
  } catch (e) {
    console.error('Screen failed to load', name, e);
    return { render: placeholder(ROUTES[name].title, 'This screen couldn’t load. Close the app and open it again to retry.', 'alert') };
  }
}

let navToken = 0;
let first = true;
let lastKey = null;

async function route({ keepScroll = false } = {}) {
  const r = parseHash(location.hash);
  if (!r.valid) history.replaceState(null, '', '#/today');
  if (r.name === 'connect') { handleConnect(r.params); return; }
  if (r.name === 'import') { handleImport(r.params); return; }
  const token = ++navToken;
  const mod = await loadView(r.name);
  if (token !== navToken) return;
  const same = keepScroll && lastKey === r.key;
  const y = window.scrollY;
  const page = h('div', { class: 'page' });
  try {
    await mod.render(page, r.params, ctx);
  } catch (e) {
    console.warn('View failed to render', r.name, e);
    page.replaceChildren();
    placeholder(r.def.title, 'Something went wrong showing this screen.', 'alert')(page, r.params, ctx);
  }
  if (token !== navToken) return;
  if (!same) page.classList.add("enter");
  view.replaceChildren(page);
  lastKey = r.key;
  const title = (page.querySelector('.lt') || {}).textContent || r.def.title;
  topTitle.textContent = title;
  document.title = r.name === 'today' ? 'Due Date Dashboard' : `${title} · Due Date Dashboard`;
  setActiveNav(r.def.tab);
  window.scrollTo(0, same ? y : 0);
  syncScrolled();
  if (!same && !first) view.focus({ preventScroll: true });
  first = false;
  routeChanged();
}

// #/connect?u=... saves your sync page link, then goes to Today.
function handleConnect(params) {
  const got = readConnectParams(params);
  if (got) { ctx.state.feed = got; ctx.save(); }
  history.replaceState(null, '', got ? '#/today' : '#/settings');
  route().then(() => { if (got) toast('Connected. Tap Sync to bring in your assignments.', 'practice', 4200); });
}

// #/import?d=... (from the sync page) saves the list; #/import?err=... shows what went wrong.
function handleImport(params) {
  let r;
  if (params.err) r = { ok: false, error: `Classroom said: ${params.err}` };
  else r = importPayload(ctx.state, params.d);
  ctx.lastError = r.ok ? '' : r.error;
  if (r.ok) ctx.save();
  history.replaceState(null, '', '#/today');
  route().then(() => { if (r.ok) toast(`Synced ${r.count} assignment${r.count === 1 ? '' : 's'}`); });
}

/* ---------- Boot ---------- */
async function boot() {
  if (demo) {
    const { sampleState } = await import('./demo.js');
    ctx.state = sampleState();
  }
  applyTheme(ctx.state.settings.theme);
  buildNav();
  if (!location.hash || location.hash === '#' || location.hash === '#/') history.replaceState(null, '', '#/today');
  window.addEventListener('hashchange', () => route());
  await route();
  // At midnight "today" changes: re-render when the app comes back to the front on a new day.
  let day = new Date().toDateString();
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && new Date().toDateString() !== day) { day = new Date().toDateString(); ctx.rerender(); }
  });
}
boot();

/* ---------- Offline support ---------- */
function toast(text, ico = 'practice', ms = 3200) {
  document.querySelectorAll('.toast').forEach(old => old.remove());
  const t = h('div', { class: 'toast', role: 'status' }, icon(ico), h('span', null, text));
  document.body.append(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 400); }, ms);
}
initOffline({ safe: () => parseHash(location.hash).name !== 'settings', onFirstReady: () => toast('Ready to use offline') });
