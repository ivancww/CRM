const CACHE_NAME = 'crm-cache-v1.8.7';
const urlsToCache = [
  '/CRM/',
  '/CRM/index.html',
  '/CRM/client.html'
];

// 安裝並強制更新
self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(urlsToCache);
    })
  );
});

// 激活並刪除舊版本快取
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  e.waitUntil(self.clients.claim());
});

// 線上優先，若無網絡則回傳快取檔案
self.addEventListener('fetch', e => {
  if (e.request.method === 'GET') {
    e.respondWith(
      fetch(e.request).catch(() => {
        return caches.match(e.request);
      })
    );
  }
});
