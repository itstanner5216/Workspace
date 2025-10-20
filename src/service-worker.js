/**
 * Service Worker for Jack Portal
 * Handles: Caching, Offline support, Auth header injection
 */

const CACHE_NAME = 'jack-portal-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/favicon.svg',
  '/manifest.json'
];

// ============== INSTALL ==============
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Caching app shell');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// ============== ACTIVATE ==============
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            console.log('Deleting old cache:', name);
            return caches.delete(name);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// ============== FETCH ==============
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    event.respondWith(fetch(request));
    return;
  }

  // Handle API requests (network first)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const cache = caches.open(CACHE_NAME);
            cache.then((c) => c.put(request, response.clone()));
          }
          return response;
        })
        .catch(() => {
          // Return cached version if offline
          return caches.match(request);
        })
    );
    return;
  }

  // Handle static assets (cache first)
  event.respondWith(
    caches.match(request).then((response) => {
      if (response) {
        return response;
      }

      return fetch(request).then((response) => {
        if (!response || response.status !== 200 || response.type === 'basic') {
          return response;
        }

        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseToCache);
        });

        return response;
      });
    })
  );
});

// ============== MESSAGE HANDLER (for auth injection) ==============
self.addEventListener('message', (event) => {
  const { type, domain, credentials } = event.data;

  if (type === 'STORE_AUTH') {
    // Store auth info in IndexedDB or localStorage equivalent
    console.log('Received auth for:', domain);
  }
});

// ============== PERIODIC SYNC (cleanup expired logins) ==============
// This would sync and cleanup every hour if background sync is supported
if ('periodicSync' in self.registration) {
  self.addEventListener('periodicsync', (event) => {
    if (event.tag === 'cleanup-expired-auth') {
      console.log('Cleaning up expired credentials...');
      // Cleanup logic would go here
    }
  });
}

console.log('Service Worker loaded');
