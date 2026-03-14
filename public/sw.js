const CACHE_NAME = 'f1-data-hub-v7';

// ... (existing code) ...

// Database and JSON data files - always fetch from network, no caching
if (url.pathname === '/data/f1.db' || url.pathname.startsWith('/data/') && url.pathname.endsWith('.json')) {
  event.respondWith(
    fetch(request).catch(() => {
      return new Response('Data not available', { status: 503 });
    })
  );
  return;
}
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/vite.svg',
  'https://cdn.jsdelivr.net/npm/sql.js@1.13.0/dist/sql-wasm.js'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .catch(err => console.error('Cache failed:', err))
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch event - Network first for development, skip caching Vite files
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip Chrome extensions
  if (url.protocol === 'chrome-extension:') return;

  // Skip Vite dev server files
  if (url.pathname.includes('/@vite') ||
    url.pathname.includes('/@react-refresh') ||
    url.pathname.includes('/src/') ||
    url.pathname.includes('node_modules')) {
    return;
  }

  // Database file - always fetch from network
  if (url.pathname === '/data/f1.db') {
    event.respondWith(
      fetch(request).catch(() => {
        return new Response('Database not available', { status: 503 });
      })
    );
    return;
  }

  // For development: network first
  event.respondWith(
    fetch(request)
      .then(response => {
        // Cache successful responses
        if (response && response.status === 200) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // Fallback to cache
        return caches.match(request).then(cachedResponse => {
          if (cachedResponse) {
            return cachedResponse;
          }
          if (request.mode === 'navigate') {
            return caches.match('/index.html');
          }
          return new Response('Offline - Content not available', {
            status: 503,
            statusText: 'Service Unavailable'
          });
        });
      })
  );
});
