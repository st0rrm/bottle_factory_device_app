// Minimal Service Worker for PWA install prompt
// No caching, no offline support - just satisfies PWA requirements

self.addEventListener('install', (event) => {
  // Skip waiting to activate immediately
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Claim clients immediately
  event.waitUntil(clients.claim());
});

// Fetch event - just pass through to network
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
