const CACHE_NAME = 'crm-cache-v1.9.3'; // 🌟 已經更新至 v1.9.3 強制更新版本號

const urlsToCache = [
  '/',
  '/manifest-admin.json',
  '/manifest-client.json',
  '/admin-logo-192.png',
  '/client-logo-192.png'
];

self.addEventListener('install', event => {
  self.skipWaiting(); // 強制踢走舊版本，立刻讓新SW上線
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
  self.clients.claim(); // 立刻控制全域網頁
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  if (event.request.url.includes('script.google.com')) return;

  event.respondWith(
    fetch(event.request).then(response => {
      if (!response || response.status !== 200 || response.type !== 'basic') {
        return response;
      }
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
