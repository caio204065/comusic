const APP_CACHE = 'comusic-app-v1';
const MEDIA_CACHE = 'comusic-media-v1';

const APP_SHELL = [
  './',
  './index.html',
  './menu.html',
  './menu-mobile.html',
  './musicas.json',
  './manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(APP_CACHE).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => ![APP_CACHE, MEDIA_CACHE].includes(k)).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

function isMediaRequest(request) {
  const url = new URL(request.url);
  return /\.(mp3|m4a|aac|wav|ogg|mp4|webm|jpg|jpeg|png|webp)$/i.test(url.pathname);
}

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;

  if (isMediaRequest(request)) {
    event.respondWith(
      caches.open(MEDIA_CACHE).then(async cache => {
        const cached = await cache.match(request);
        if (cached) return cached;
        try {
          const network = await fetch(request);
          cache.put(request, network.clone());
          return network;
        } catch (_) {
          return cached || Response.error();
        }
      })
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(async cached => {
      try {
        const network = await fetch(request);
        const cache = await caches.open(APP_CACHE);
        cache.put(request, network.clone());
        return network;
      } catch (_) {
        return cached || caches.match('./index.html');
      }
    })
  );
});
