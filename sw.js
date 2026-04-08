// Service Worker — Tablero UMP NOA Oeste
const CACHE_NAME = 'ump-noa-v3';
const OFFLINE_URL = '/TABLERO-UMP/';

const ASSETS = [
  '/TABLERO-UMP/',
  '/TABLERO-UMP/index.html',
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js',
  'https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700;800&family=Barlow+Condensed:wght@600;700;800&display=swap'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS).catch(e => console.warn('[SW] Cache parcial:', e)))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  // Solo manejar GET
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Apps Script → siempre red, nunca cachear
  if (url.hostname.includes('script.google.com')) {
    event.respondWith(
      fetch(event.request.clone()).catch(() =>
        new Response(JSON.stringify({error: 'Sin conexión'}),
          {headers: {'Content-Type': 'application/json'}})
      )
    );
    return;
  }

  // Fonts / CDN → cache-first, sin clonar dos veces
  if (url.hostname.includes('cdnjs.cloudflare.com') || url.hostname.includes('fonts.')) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request.clone()).then(resp => {
          if (resp && resp.ok) {
            const toCache = resp.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, toCache));
          }
          return resp;
        }).catch(() => cached);
      })
    );
    return;
  }

  // Navegación e index.html → network-first con fallback a cache
  if (event.request.mode === 'navigate' || url.pathname.includes('TABLERO-UMP')) {
    event.respondWith(
      fetch(event.request.clone())
        .then(resp => {
          if (resp && resp.ok) {
            const toCache = resp.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, toCache));
          }
          return resp;
        })
        .catch(() =>
          caches.match(event.request).then(cached =>
            cached || caches.match(OFFLINE_URL)
          )
        )
    );
    return;
  }

  // Default: cache-first
  event.respondWith(
    caches.match(event.request).then(cached =>
      cached || fetch(event.request.clone())
    )
  );
});
