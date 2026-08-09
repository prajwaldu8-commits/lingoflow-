/* LingoFlow service worker v4 — network-first (always get the latest version),
   with cache fallback for offline use. Old caches are purged on activate. */
const CACHE = 'lingoflow-v5';
const SHELL = ['/', '/styles.css', '/app.js', '/manifest.json', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  // never cache API/socket traffic — those stay live
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/socket.io')) return;

  const isShell = SHELL.includes(url.pathname) || e.request.mode === 'navigate';

  // network-first: try the server, fall back to cache when offline
  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(e.request).then(hit => hit || (url.pathname === '/' ? caches.match('/') : undefined)))
  );
});
