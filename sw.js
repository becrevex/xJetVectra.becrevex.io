const CACHE_NAME = "xJetVectra";

const FILES = [
  "./",
  "./index.html",
  "./style.css",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",

  "./js/state.js",
  "./js/core.js",
  "./js/controls.js",
  "./js/camera.js",
  "./js/ship.js",
  "./js/weapons.js",
  "./js/enemies.js",
  "./js/level.js",
  "./js/effects.js",
  "./js/graphics.js",
  "./js/loop.js",
  "./js/boot.js"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(FILES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => {
        return Promise.all(
          keys
            .filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
        );
      })
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      return cachedResponse || fetch(event.request);
    })
  );
});
