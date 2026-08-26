/**
 * Prahari Tourist Safety — Progressive Web App (PWA) Service Worker
 * 
 * Caches offline HTML, CSS, JavaScript, icons, and Leaflet assets
 * so the application opens, functions, and dispatches offline SOS packets
 * even when internet connectivity is completely unavailable.
 */

const CACHE_NAME = 'prahari-pwa-v1';

const STATIC_ASSETS = [
  '/',
  '/citizen',
  '/admin',
  '/login',
  '/manifest.json',
];

// Install Event: Cache Core Shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[PWA SW] Pre-caching offline application shell...');
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[PWA SW] Partial cache warning during install:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate Event: Clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event: Network-First with Cache Fallback for HTML/Navigations, Cache-First for static assets
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Skip non-GET requests or browser extension requests
  if (request.method !== 'GET' || !url.protocol.startsWith('http')) {
    return;
  }

  // Bypass API calls to let network/IndexedDB offline queue handle them
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      try {
        // Try network first
        const networkResponse = await fetch(request);
        if (networkResponse && networkResponse.status === 200) {
          cache.put(request, networkResponse.clone());
        }
        return networkResponse;
      } catch (err) {
        // Fallback to cache if network fails (OFFLINE MODE)
        const cachedResponse = await cache.match(request);
        if (cachedResponse) {
          return cachedResponse;
        }

        // Fallback for navigation requests to cached /citizen page
        if (request.mode === 'navigate') {
          const fallbackPage = await cache.match('/citizen') || await cache.match('/');
          if (fallbackPage) return fallbackPage;
        }

        throw err;
      }
    })
  );
});
