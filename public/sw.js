const CACHE_NAME = "xplore-static-v2";
const OFFLINE_URL = "/offline.html";

// Pre-cached so a navigation that can't reach the network still renders a
// branded offline screen instead of the browser's error page. The icon is
// included because offline.html references it.
const PRECACHE_URLS = [OFFLINE_URL, "/icon-192.png"];

// On a local dev host (`next dev`) chunk names are NOT content-hashed, so
// caching them would keep serving stale code after every edit. Never cache
// there — this also heals browsers that registered an older worker in dev.
const IS_LOCAL_HOST = ["localhost", "127.0.0.1", "[::1]"].includes(
  self.location.hostname
);

// Only static, build-hashed assets are cached — page and data requests always
// hit the network so authenticated/per-user content is never served stale.
function isCacheableRequest(request) {
  if (IS_LOCAL_HOST) return false;
  if (request.method !== "GET") return false;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return false;
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname === "/manifest.webmanifest" ||
    /\.(?:png|svg|ico)$/.test(url.pathname)
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            // Locally, drop everything (including stale dev chunks in the
            // current cache); in production keep only the current cache.
            .filter((key) => IS_LOCAL_HOST || key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Navigations (opening the app, following a link) are network-first and are
  // never cached — auth gating and per-user content must come from the server.
  // Only when the network is unreachable do we fall back to the offline page.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() =>
        caches.open(CACHE_NAME).then((cache) => cache.match(OFFLINE_URL))
      )
    );
    return;
  }

  if (!isCacheableRequest(request)) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(request);
      if (cached) return cached;

      const response = await fetch(request);
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
  );
});
