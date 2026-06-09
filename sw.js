// 🌟 v1.8.11 核心修復：精準定義緩存名稱，連動強制刷新機制
const CACHE_NAME = 'ins-crm-cache-v1.8.11';

// 需要離線快取的靜態資源清單 (只快取核心基礎框架)
const ASSETS_TO_CACHE = [
  'admin.html',
  'client.html',
  'manifest-admin.json',
  'admin-logo-192.png',
  'https://cdn.tailwindcss.com',
  'https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css',
  'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js'
];

// 安裝事件：寫入快取
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[Service Worker] 快取全新靜態骨架資源 v1.8.11');
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting()) // 強制跳過等待，立刻接管
  );
});

// 激活事件：【最重要】全自動清理舊版（如 v1.8.9 或更舊）的垃圾快取，防止畫面和 Logo 錯亂
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] 發現舊版快取，正在全自動清除抹除:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim()) // 立即接管所有開啟的網頁分頁
  );
});

// 攔截請求事件：網絡優先，過渡本地
self.addEventListener('fetch', event => {
  // 🎯 關鍵修復：如果是去問 Google Sheet 拿資料的請求（帶有 script.google 或者是參數查詢），絕對不吞快取，必須走實時網絡！
  if (event.request.url.includes('script.google.com') || event.request.url.includes('?action=')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // 靜態資源則實施安全過渡
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        // 背景偷偷更新靜態資源，確保下一次開啟是最新的
        fetch(event.request).then(networkResponse => {
          if (networkResponse.status === 200) {
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, networkResponse));
          }
        }).catch(() => {});
        return cachedResponse;
      }
      return fetch(event.request);
    })
  );
});
