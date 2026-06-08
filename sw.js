const CACHE_NAME = 'crm-cache-v1.8.6';
const urlsToCache = ['/CRM/', '/CRM/index.html', '/CRM/client.html'];
self.addEventListener('install', e => { e.skipWaiting(); e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(urlsToCache))); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(keys => Promise.all(keys.map(k => k !== CACHE_NAME && caches.delete(k))))); e.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', e => { if (e.request.method === 'GET') e.respondWith(fetch(e.request).catch(() => caches.match(e.request))); });
