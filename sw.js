const CACHE = 'dohatv-static-v9';
const SHELL = [
  './', './index.html', './styles.css', './app.js', './manifest.webmanifest', './favicon.svg', './doha-skyline.svg',
  './assets/backgrounds/doha-night.svg', './assets/backgrounds/lusail.svg', './assets/backgrounds/katara.svg',
  './assets/products/keto-coffee-box.jpg', './assets/products/matcha-tea.jpg',
  './assets/products/dnpr-chocolate-boxes.jpg', './assets/products/dnpr-lite-chocolate.jpg',
  './assets/products/coffee-and-chocolate.jpg', './assets/products/perfect-plus.jpg',
  './assets/products/laperwa-coffee.jpg', './assets/products/perfect-weight-range.jpg',
  './assets/products/perfect-plus-front.jpg', './assets/products/keto-coffee-sachets.jpg',
  './assets/products/perfect-plus-benefits.jpg'
];
self.addEventListener('install', (event) => { event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL))); self.skipWaiting(); });
self.addEventListener('activate', (event) => { event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  event.respondWith(caches.match(request).then((cached) => cached || fetch(request).then((response) => {
    if (response.ok) { const copy = response.clone(); caches.open(CACHE).then((cache) => cache.put(request, copy)); }
    return response;
  }).catch(() => caches.match('./index.html'))));
});
