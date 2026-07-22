/**
 * RPGACE service worker — installability only, NOT an offline-first cache.
 *
 * July 22 lesson learned the hard way (twice, same day): a stale cached copy
 * of rpgace_core.js/index.html silently serving old code is a real, already-
 * proven bug class here. A naive cache-first service worker would make that
 * bug permanent instead of "until next hard refresh" - so this SW is
 * deliberately network-first for everything that can change (HTML/JS/CSS),
 * and only cache-first for the icon/manifest files that never change without
 * a filename bump. Bump CACHE_NAME whenever this file's caching list changes.
 */
const CACHE_NAME = 'rpgace-shell-v20260722b';
const PRECACHE = [
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-192.png',
  '/icons/icon-maskable-512.png',
  '/icons/apple-touch-icon.png'
];

self.addEventListener('install', function (event) {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) { return cache.addAll(PRECACHE); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (names) {
      return Promise.all(
        names.filter(function (n) { return n !== CACHE_NAME; }).map(function (n) { return caches.delete(n); })
      );
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  var url = new URL(event.request.url);

  // Never touch API calls (Oracle, Supabase-proxying endpoints, etc.) -
  // these must always hit the network live, never be cached.
  if (url.pathname.indexOf('/api/') === 0) return;

  var isPrecached = PRECACHE.indexOf(url.pathname) !== -1;

  if (isPrecached) {
    // Icons/manifest: cache-first, they only change via a filename/CACHE_NAME bump.
    event.respondWith(
      caches.match(event.request).then(function (cached) {
        return cached || fetch(event.request);
      })
    );
    return;
  }

  // Everything else (index.html, rpgace_core.js, main.js, style.css, ...):
  // network-first, falling back to cache only when truly offline. This is
  // what stops the SW itself from ever becoming a second, worse source of
  // stale-code bugs on top of the cache-busting version string.
  event.respondWith(
    fetch(event.request)
      .then(function (response) {
        var copy = response.clone();
        caches.open(CACHE_NAME).then(function (cache) { cache.put(event.request, copy); });
        return response;
      })
      .catch(function () { return caches.match(event.request); })
  );
});
