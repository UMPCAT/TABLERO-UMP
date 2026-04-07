// Service Worker — Tablero UMP NOA Oeste
const CACHE_NAME = 'ump-noa-v1';
const OFFLINE_URL = '/TABLERO-UMP/';

// Recursos a cachear
const ASSETS = [
  '/TABLERO-UMP/',
  '/TABLERO-UMP/index.html',
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js',
  'https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700;800&family=Barlow+Condensed:wght@600;700;800&display=swap'
];

// Instalar y cachear recursos estáticos
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Cacheando recursos...');
      return cache.addAll(ASSETS).catch(e => console.warn('[SW] Cache parcial:', e));
    })
  );
  self.skipWaiting();
});

// Activar y limpiar caches viejos
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: cache-first para assets, network-first para datos
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Apps Script → siempre red (datos en tiempo real)
  if (url.hostname.includes('script.google.com')) {
    event.respondWith(
      fetch(event.request).catch(() => new Response(
        JSON.stringify({error: 'Sin conexión — datos no disponibles'}),
        {headers: {'Content-Type': 'application/json'}}
      ))
    );
    return;
  }

  // Fonts/CDN → cache primero
  if (url.hostname.includes('cdnjs.cloudflare.com') || url.hostname.includes('fonts.')) {
    event.respondWith(
      caches.match(event.request).then(cached => cached || fetch(event.request).then(resp => {
        if (resp.ok) caches.open(CACHE_NAME).then(cache => cache.put(event.request, resp.clone()));
        return resp;
      }))
    );
    return;
  }

  // index.html → network-first con fallback a cache
  if (url.pathname.includes('TABLERO-UMP') || event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(resp => {
          if (resp.ok) caches.open(CACHE_NAME).then(cache => cache.put(event.request, resp.clone()));
          return resp;
        })
        .catch(() => caches.match(event.request).then(cached => cached ||
          caches.match(OFFLINE_URL)
        ))
    );
    return;
  }

  // Default: cache then network
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});
