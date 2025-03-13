const CACHE_NAME = 'ba-cache-v3';
let ASSETS_TO_CACHE = [
  './index.html',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js',
  'https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap',
  'https://thefarawaydev.github.io/home/index.css',
  'https://raw.githubusercontent.com/thefarawaydev/Watch/refs/heads/main/other/BA.png',
  'https://thefarawaydev.github.io/home/poster.png',
  'https://thefarawaydev.github.io/home/manifest.json',
  './anime-search-results.json',
  './results',
  'https://thefarawaydev.github.io/watch/series/player',
  'https://thefarawaydev.github.io/home/continue-watching'
];

// Install event - caching assets
self.addEventListener('install', event => {
  console.log('[ServiceWorker] Install');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[ServiceWorker] Caching app shell');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate event - cleaning up old caches if necessary
self.addEventListener('activate', event => {
  console.log('[ServiceWorker] Activate');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('[ServiceWorker] Removing old cache', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serving cached assets when offline
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      if (response) {
        return response; // Serve asset from cache
      }
      return fetch(event.request).then(networkResponse => {
        // Optionally cache new assets
        return caches.open(CACHE_NAME).then(cache => {
          // Clone the response before caching
          cache.put(event.request, networkResponse.clone());
          return networkResponse;
        });
      }).catch(() => {
        // Fallback response if both cache & network fail
        if (event.request.headers.get('accept').includes('text/html')) {
          return caches.match('../home'); // Serve a fallback HTML page
        }
      });
    })
  );
});
