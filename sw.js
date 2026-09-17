// ==========================================
// AVA CRM & Portfolio Service Worker (v7.0.0)
// ==========================================
const CACHE_NAME = 'crm-cache-v7.0.0';

const urlsToCache = [
  './',
  './index.html',
  './client.html',
  './crm-data.js',
  './crm-ai-adapter.js',
  './client-v7.js',
  './manifest-admin.json',
  './manifest-client.json',
  './crmlogo-192.png',
  './crmlogo-512.png',
  './clientapp-192.png',
  './clientapp-512.png'
];

self.addEventListener('install', event => {
  self.skipWaiting();
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
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
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
    }).catch(() => caches.match(event.request))
  );
});
