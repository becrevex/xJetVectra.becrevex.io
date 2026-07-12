const CACHE_NAME = "xJetVectra-v0.3.10-starfield-enemy-speed";

const CORE_FILES = [
  "./",
  "./index.html",
  "./style.css",
  "./manifest.json",

  "./js/state.js",
  "./js/core.js",
  "./js/sound.js",
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
    caches.open(CACHE_NAME).then(async cache => {
      for (const file of CORE_FILES) {
        try {
          await cache.add(file);
        } catch (err) {
          console.warn("Failed to cache:", file, err);
        }
      }

      return self.skipWaiting();
    })
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
    fetch(event.request)
      .then(response => {
        const copy = response.clone();

        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, copy);
        });

        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
