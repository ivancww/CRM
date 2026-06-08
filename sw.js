const CACHE_NAME = 'crm-cache-v1.8.0'; // 🌟 強制更新版號
const urlsToCache = [
  '/',
  '/index.html',
  '/client.html',
  '/manifest-admin.json',
  '/manifest-client.json',
  '/admin-logo-192.png',
  '/client-logo-192.png'
];

self.addEventListener('install', event => {
  self.skipWaiting(); // 強制立刻啟用新版本
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('清除舊緩存:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim(); // 立刻接管所有頁面
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request).then(response => {
      const responseClone = response.clone();
      caches.open(CACHE_NAME).then(cache => {
        cache.put(event.request, responseClone);
      });
      return response;
    }).catch(() => {
      return caches.match(event.request);
    })
  );
});
