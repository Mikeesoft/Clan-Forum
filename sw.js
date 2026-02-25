// sw.js
const CACHE_NAME = 'guild-app-v3'; // غيرنا الرقم لـ 3
const urlsToCache = [
  '/',
  '/index.html',
  '/admin.html',
  '/style.css?v=2', // ضفنا v=2 هنا كمان
  '/app.js',
  '/admin.js',
  '/firebase-core.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

// 🌟 الكود السحري الجديد اللي بيمسح الكاش القديم أوتوماتيك 🌟
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('تم مسح الكاش القديم:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        return response || fetch(event.request);
      })
  );
});
