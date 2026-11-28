// Liturgical Texts service worker: offline shell + page cache.
// 20261128T172117Z is replaced by publish_site.py with the index
// 'generated' stamp on every publish, so each publish rolls the
// shell cache. The pages cache is managed by the app's own sync
// (it re-downloads everything when the index stamp changes).
const SHELL_CACHE = 'shell-20261128T172117Z';
const PAGES_CACHE = 'pages-v1';
const SHELL = ['./app.html', './manifest.webmanifest', './icon-192.png',
               './icon-512.png', './apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(SHELL_CACHE).then(c => c.addAll(SHELL))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys
      .filter(k => k.startsWith('shell-') && k !== SHELL_CACHE)
      .map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  // The app's sync fetches with cache:'reload' — always network,
  // and refresh the cached copy.
  if (req.cache === 'reload' || req.cache === 'no-store' ||
      req.cache === 'no-cache') {
    e.respondWith(fetch(req).then(r => {
      const copy = r.clone();
      caches.open(PAGES_CACHE).then(c => c.put(req, copy));
      return r;
    }));
    return;
  }
  e.respondWith(caches.match(req, {ignoreSearch: true}).then(hit =>
    hit || fetch(req).then(r => {
      if (r.ok) {
        const copy = r.clone();
        caches.open(PAGES_CACHE).then(c => c.put(req, copy));
      }
      return r;
    })));
});
