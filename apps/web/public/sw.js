/**
 * Prahari Tourist Safety — Progressive Web App (PWA) Service Worker
 * 
 * Caches offline HTML, CSS, JavaScript, icons, and Leaflet assets
 * so the application opens, functions, and dispatches offline SOS packets
 * even when internet connectivity is completely unavailable.
 */

const CACHE_NAME = 'prahari-pwa-v2';
const OFFLINE_MAP_CACHE_NAME = 'prahari-offline-map-v1';

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
          .filter((name) => name !== CACHE_NAME && name !== OFFLINE_MAP_CACHE_NAME)
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
        const offlineMapCache = await caches.open(OFFLINE_MAP_CACHE_NAME);
        const cachedResponse = await cache.match(request) || await offlineMapCache.match(request);
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

// The onboarding flow may request an explicit offline area download. We only
// receive URLs from a configured self-hosted/licensed provider; the app never
// prefetches public OpenStreetMap raster tiles because that is prohibited by
// OSM's tile policy. The cache is separate from the app shell so an upgrade
// never discards a traveller's selected regional map.
self.addEventListener('message', (event) => {
  if (event.data?.type !== 'PRAHARI_CACHE_OFFLINE_TILES') return;
  const urls = Array.isArray(event.data.urls)
    ? event.data.urls.filter((url) => typeof url === 'string' && url.startsWith('https://')).slice(0, 180)
    : [];
  const port = event.ports?.[0];

  event.waitUntil((async () => {
    if (!urls.length) {
      port?.postMessage({ cached: 0, error: 'No approved base-map tiles were supplied.' });
      return;
    }
    try {
      const cache = await caches.open(OFFLINE_MAP_CACHE_NAME);
      let cached = 0;
      let index = 0;
      const worker = async () => {
        while (index < urls.length) {
          const url = urls[index++];
          try {
            const request = new Request(url, { mode: 'no-cors' });
            const response = await fetch(request);
            if (response && (response.ok || response.type === 'opaque')) {
              await cache.put(request, response);
              cached += 1;
            }
          } catch {
            // A partial regional map remains useful; the caller receives the
            // successful count rather than failing the whole safety pack.
          }
        }
      };
      await Promise.all(Array.from({ length: Math.min(4, urls.length) }, worker));
      port?.postMessage({ cached });
    } catch {
      port?.postMessage({ cached: 0, error: 'Base-map cache could not be opened.' });
    }
  })());
});
