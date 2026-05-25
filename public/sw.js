// Service Worker mínimo para FOCO 360°.
// - Sin caching agresivo (el tour necesita data fresca de DB y R2).
// - Solo registrado para habilitar el prompt "Instalar app" en
//   Chrome/Edge. iOS Safari permite "Agregar a inicio" sin esto.

self.addEventListener('install', (event) => {
  // Activa el nuevo SW inmediatamente sin esperar a que el viejo termine.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Toma control de las páginas abiertas sin requerir reload.
  event.waitUntil(self.clients.claim());
});

// Fetch handler que solo pasa la request al network — sin caché.
// Necesario para que el SW sea "válido" según specs PWA.
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
