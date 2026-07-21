const SHELL_CACHE = 'opic-shell-v2';
const SHELL = ['./', 'index.html', 'app.js', 'style.css', 'manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(SHELL_CACHE).then(c => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== SHELL_CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // data 파일은 network-first (새 레슨 반영)
  if (url.pathname.includes('/data/')) {
    e.respondWith(
      fetch(e.request).catch(() => caches.match(e.request))
    );
    return;
  }
  // 셸은 cache-first
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});