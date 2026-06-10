const CACHE_NAME = 'crm-cache-v1.8.1'; // 🌟 已精準修正至 v1.8.1 強制更新版本號

const urlsToCache = [
  '/',
  '/manifest-admin.json',
  '/manifest-client.json',
  '/admin-logo-192.png',
  '/client-logo-192.png'
];

// 安裝階段：立刻接管，不留等待
self.addEventListener('install', event => {
  self.skipWaiting(); // 強制踢走舊的 Service Worker，立刻讓新的上線
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

// 激活階段：立刻清除所有舊版本的快取資料
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
  self.clients.claim(); // 立刻控制所有打開的網頁視窗
});

// 網絡請求監聽（網絡優先，失敗時才抓快取，確保資料最新）
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  
  // 排除對 Google Apps Script API 的快取，確保雲端儲存永不卡舊資料
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
