const SHELL_CACHE = 'opic-shell-v7';
const SHELL = ['./', 'index.html', 'app.js', 'style.css', 'manifest.json', 'icon.svg', 'opic-personal-workbook.md'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(SHELL_CACHE).then(cache => Promise.all(SHELL.map(async path => {
    const response = await fetch(new Request(path, { cache: 'reload' }));
    if (!response.ok) throw new Error(`Failed to cache ${path}`);
    await cache.put(path, response);
  }))));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== SHELL_CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
      .then(() => self.clients.matchAll({ type: 'window' }))
      .then(clients => Promise.all(clients.map(client => client.navigate(client.url))))
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  // data 파일은 network-first (새 레슨 반영)
  if (url.pathname.includes('/data/')) {
    e.respondWith(
      fetch(e.request).catch(() => caches.match(e.request))
    );
    return;
  }
  // 앱 파일은 온라인에서 최신 버전을 받고, 오프라인일 때 캐시를 사용한다.
  e.respondWith(
    fetch(e.request, { cache: 'no-store' }).then(response => {
      if (response.ok && url.origin === self.location.origin) {
        e.waitUntil(caches.open(SHELL_CACHE).then(cache => cache.put(e.request, response.clone())));
      }
      return response;
    }).catch(() => caches.match(e.request))
  );
});
