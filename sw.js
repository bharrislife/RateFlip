const CACHE_NAME = 'rateflip-v1';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(['/', '/index.html', '/app.js', '/styles.css', '/manifest.json']);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) => Promise.all(names.filter(n => n !== CACHE_NAME).map(caches.delete)))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  
  // Skip API calls - network only
  if (event.request.url.includes('open.er-api.com')) {
    event.respondWith(
      fetch(event.request).catch(() => new Response(JSON.stringify({ rates: { VND: 25000 } }), {
        headers: { 'Content-Type': 'application/json' }
      }))
    );
    return;
  }
  
  // Cache-first for everything else
  event.respondWith(
    caches.match(event.request).then(r => r || fetch(event.request).then(res => {
      caches.open(CACHE_NAME).then(c => c.put(event.request, res.clone()));
      return res;
    }))
  );
});
