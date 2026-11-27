// Cache-first service worker. The precache list is generated: run
// `python3 scripts/build_precache.py` after changing any file under app/.
/*PRECACHE_START*/
const VERSION = "6eddd4facb96";
const PRECACHE = [
  "./index.html",
  "./css/app.css",
  "./css/dd.css",
  "./css/settings.css",
  "./icons/apple-touch-icon.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./icons/icon.svg",
  "./icons/prov.svg",
  "./js/app.js",
  "./js/dates.js",
  "./js/demo.js",
  "./js/feed.js",
  "./js/fx.js",
  "./js/offline.js",
  "./js/rows.js",
  "./js/store.js",
  "./js/ui.js",
  "./js/version.js",
  "./js/views/settings.js",
  "./js/views/today.js",
  "./js/views/week.js",
  "./manifest.webmanifest",
  "./precache.js",
  "./"
];
/*PRECACHE_END*/

const CACHE = 'ddd-' + VERSION;

// Tell every open page how the offline download is going (drives the Settings row and toast).
async function tell(msg) {
  const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  for (const c of all) c.postMessage(msg);
}

async function fetchInto(cache, url) {
  const res = await fetch(new Request(url, { cache: 'reload' }));
  if (!res.ok) throw new Error('HTTP ' + res.status);
  await cache.put(url, res);
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    const failed = [];
    let done = 0;
    // Batches keep the request count modest; failures are collected, not swallowed.
    for (let i = 0; i < PRECACHE.length; i += 8) {
      await Promise.all(PRECACHE.slice(i, i + 8).map(async (url) => {
        // A file kept from an earlier, interrupted attempt at this same VERSION is reused,
        // so a retry only downloads what is still missing.
        if (await cache.match(url)) { done++; return; }
        try {
          await fetchInto(cache, url);
        } catch (e) {
          try { await fetchInto(cache, url); } // one retry for flaky networks
          catch (e2) { failed.push(url); console.error('[sw] precache failed:', url, e2); return; }
        }
        done++;
      }));
      tell({ type: 'precache-progress', done, total: PRECACHE.length });
    }
    // Abort install if anything is missing, so a half-cached version never activates.
    // The page re-registers later (online / next visit) and the retry resumes from here.
    if (failed.length) {
      await tell({ type: 'precache-failed', failed: failed.length, total: PRECACHE.length });
      throw new Error('[sw] precache incomplete: ' + failed.length + ' file(s) failed');
    }
    await tell({ type: 'precache-done', total: PRECACHE.length });
    // Take over right away; the page reloads itself into the new version at the next
    // moment it is not busy (see js/offline.js).
    await self.skipWaiting();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'skip-waiting') self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith('ddd-') && k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    // Ignore the query string and hash so '/?x=1' still finds the cached shell.
    let res = await cache.match(req, { ignoreSearch: true });
    if (!res && req.mode === 'navigate') res = await cache.match('./index.html');
    if (!res) {
      try { res = await fetch(req); }
      catch (e) { return new Response('Offline', { status: 503, statusText: 'Offline' }); }
      return res;
    }
    return res;
  })());
});
