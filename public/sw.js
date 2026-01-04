// Service Worker básico para permitir instalação PWA
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Necessário para validação do PWA
  event.respondWith(fetch(event.request).catch(() => {
    return new Response("Offline");
  }));
});