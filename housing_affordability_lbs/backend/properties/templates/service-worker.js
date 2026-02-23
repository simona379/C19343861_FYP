// service-worker.js
// Service worker for housing affordability lbs
/* This service worker provides an offline experience.

   - Pre-caches the core application shell (HTML, CSS, JS) during installation.
   - Serves cached resources instantly when offline ("cache-first" strategy).
   - Automatically updates when a new version of the cache is released.
   - Falls back to the cached app shell when navigating offline.
  */

const CACHE_NAME = "housing-pwa-v1";

const PRECACHE_URLS = [
  "/",                               // main shell
  "/static/properties/css/map.css",
  "/static/properties/js/map.js"
];

// Install: pre-cache core assets
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_URLS))
  );
});

// Activate: clean up old caches
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );
});

// Fetch: cache-first for same-origin GET requests
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // Only handle own origin
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) {
        return cached;
      }
      return fetch(event.request)
        .then(response => {
          // Put a copy into cache for next time
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
          return response;
        })
        .catch(() => {
          // If offline and request was for "/", fall back to shell
          if (event.request.mode === "navigate") {
            return caches.match("/");
          }
        });
    })
  );
});

