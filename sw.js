const CACHE_NAME = 'crm-cache-v1.8.0'; // 🌟 升級版本號，強制客戶端與後台更新快取
const urlsToCache = [
  '/',
  '/manifest-admin.json',
  '/manifest-client.json',
  '/admin-logo-192.png',
  '/client-logo-192.png'
];

self.addEventListener('install', event => {
  self.skipWaiting(); // 強制跳過等待，立刻啟用新 Service Worker
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
            console.log('清除舊緩存並強制更新:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim(); // 讓新 Service Worker 立刻控制所有打開的網頁視窗
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
