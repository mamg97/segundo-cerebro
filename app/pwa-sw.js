/* Private PWA: ONLY public static code/assets. Do not cache HTML, APIs or Access. */
const CACHE_PREFIX = "segun-public-static-";
const CACHE_NAME = CACHE_PREFIX + "__BUILD_REVISION__";
const MAX_STATIC_ITEMS = 180;
const PREWARM = [
  "/app/app.js?v=__APP_REVISION__",
  "/app/styles.css?v=__STYLE_REVISION__",
  "/app/brain-logo.png",
  "/app/pwa-icon.svg"
];
const STATIC_FILE = /\.(?:js|mjs|css|png|jpe?g|svg|webp|ico|woff2?)$/i;

function allowedStaticRequest(request) {
  if (request.method !== "GET" || request.mode === "navigate") return false;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return false;
  // Do not cache /api, /private-config.js, Access, or HTML navigation documents.
  if (!url.pathname.startsWith("/app/") || !STATIC_FILE.test(url.pathname)) return false;
  if (url.pathname === "/app/pwa-sw.js" || url.pathname === "/app/startup-watchdog.js") return false;
  return [...url.searchParams.keys()].every((key) => key === "v");
}

function validStaticResponse(request, response) {
  if (!response || !response.ok || response.redirected || response.type !== "basic") return false;
  if (response.headers.has("Set-Cookie") ||
      /no-store|no-cache/i.test(response.headers.get("Cache-Control") || "")) return false;
  const mime = response.headers.get("Content-Type") || "";
  const path = new URL(request.url).pathname;
  if (/\.m?js$/i.test(path)) return /javascript|ecmascript/i.test(mime);
  if (/\.css$/i.test(path)) return /text\/css/i.test(mime);
  if (/\.svg$/i.test(path)) return /image\/svg\+xml/i.test(mime);
  if (/\.(?:png|jpe?g|webp|ico)$/i.test(path)) return /^image\//i.test(mime);
  if (/\.woff2?$/i.test(path)) return /font\/|application\/(?:font|octet-stream)/i.test(mime);
  return false;
}

async function rememberStatic(request, response) {
  if (!allowedStaticRequest(request) || !validStaticResponse(request, response)) return;
  const cache = await caches.open(CACHE_NAME);
  await cache.put(request, response.clone());
  const keys = await cache.keys();
  if (keys.length > MAX_STATIC_ITEMS) {
    await Promise.all(keys.slice(0, keys.length - MAX_STATIC_ITEMS).map((key) => cache.delete(key)));
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    // Optional: a prefetch failure cannot block the app or Worker installation.
    await Promise.allSettled(PREWARM.map(async (url) => {
      const request = new Request(url, { credentials: "same-origin", cache: "no-store" });
      const response = await fetch(request);
      await rememberStatic(request, response);
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
      .map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (!allowedStaticRequest(request)) return; // Auth/API/HTML go straight to the network.
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const url = new URL(request.url);
    // JavaScript is always network-first to prevent Safari mixing modules from
    // different deployments when an old SW still controls the current page.
    const networkFirst = /\.m?js$/i.test(url.pathname);
    const cached = await cache.match(request);
    if (cached && !networkFirst) return cached;
    try {
      const response = await fetch(request);
      if (validStaticResponse(request, response)) {
        event.waitUntil(rememberStatic(request, response));
      }
      // Login challenges must not masquerade as JavaScript modules. A previously
      // validated *public code* copy is safe as fallback; private APIs still bypass SW.
      if (networkFirst && cached && !validStaticResponse(request, response)) return cached;
      return response;
    } catch (error) {
      if (cached) return cached;
      throw error;
    }
  })());
});
