const CACHE = 'leadgen-v2';
const STATIC = [
  '/',
  '/lead-gen',
  '/tracker',
  '/style.css',
  '/app.js',
  '/tracker.js',
  '/config.js',
  '/icon-192.png',
  '/icon-512.png',
  '/manifest.json'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(STATIC)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

// API calls: network only
// Images/icons: cache-first (they never change)
// Everything else (HTML, JS, CSS): network-first so deploys are reflected immediately
self.addEventListener('fetch', e => {
  const url = e.request.url;

  if (url.includes('/api/')) {
    e.respondWith(fetch(e.request).catch(() => new Response('Offline', { status: 503 })));
    return;
  }

  if (/\.(png|jpg|jpeg|svg|ico|webp)$/.test(url)) {
    e.respondWith(
      caches.match(e.request).then(cached => cached || fetch(e.request))
    );
    return;
  }

  // Network-first for HTML, JS, CSS
  e.respondWith(
    fetch(e.request)
      .then(res => {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
