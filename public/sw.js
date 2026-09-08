/* DreamNote service worker — minimal PWA shell.
 *
 * Why hand-written instead of next-pwa/workbox:
 *   next-pwa 5.6.0 + Workbox 7 + Next.js 14 has a clash on the React 19
 *   strict-mode config object being spread into the GenerateSW plugin.
 *   A simple manual SW covers what we actually need and avoids the
 *   build-pipeline fragility.
 *
 * Strategy:
 *   - Pre-cache the offline shell so users see something on bad networks.
 *   - Network-first for everything by default; fall back to cache.
 *   - Bump CACHE_VERSION once whenever /sw.js logic changes meaningfully.
 */

const CACHE_VERSION = "dreamnote-v1";
const OFFLINE_URL = "/offline";
const PRE_CACHE = [
  "/",
  "/signin",
  "/manifest.json",
  "/icons/icon.svg",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((c) => c.addAll(PRE_CACHE)).catch(() => {}),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names.filter((n) => n !== CACHE_VERSION).map((n) => caches.delete(n)),
      ),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Never cache: OAuth callback, server actions, cron endpoints, sign-in
  // (must be live to keep auth state fresh)
  if (
    /\/api\/auth\//.test(url.pathname) ||
    /\/api\/cron\//.test(url.pathname) ||
    /\/api\/notes\//.test(url.pathname) ||
    /\/api\/folders/.test(url.pathname) ||
    /\/api\/join-dreamland/.test(url.pathname)
  ) {
    return;
  }

  // For same-origin GETs, network-first with cache fallback.
  // For cross-origin (Discord CDN avatars, fonts), just pass through.
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(req)
      .then((res) => {
        // Update cache for any successful same-origin response.
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE_VERSION).then((c) => c.put(req, clone)).catch(() => {});
        }
        return res;
      })
      .catch(() =>
        caches.match(req).then((m) => m || caches.match(OFFLINE_URL) || new Response("Offline", { status: 503 })),
      ),
  );
});
