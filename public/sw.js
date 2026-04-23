// Kinshasa Life Guide — 轻量 Service Worker
// 目的：在非洲高延迟/低带宽网络下，让回访与导航做到近乎瞬时
// 策略：
//   - HTML / 文档：stale-while-revalidate（先回缓存，后台更新）
//   - _next/static 与 /images：cache-first（指纹化/immutable 资源）
//   - /api/*：始终走网络，由 CDN 的 s-maxage 控制

const CACHE = "klg-v3";
const STATIC_PREFIXES = ["/_next/static/", "/images/"];

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names.filter((n) => n !== CACHE).map((n) => caches.delete(n))
      );
      await self.clients.claim();
    })()
  );
});

function isStatic(pathname) {
  return STATIC_PREFIXES.some((p) => pathname.startsWith(p));
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  if (isStatic(url.pathname)) {
    // cache-first
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE);
        const hit = await cache.match(req);
        if (hit) return hit;
        try {
          const res = await fetch(req);
          if (res && res.status === 200 && res.type === "basic") {
            cache.put(req, res.clone());
          }
          return res;
        } catch (e) {
          if (hit) return hit;
          throw e;
        }
      })()
    );
    return;
  }

  const accept = req.headers.get("accept") || "";
  if (req.mode === "navigate" || accept.includes("text/html")) {
    // stale-while-revalidate for HTML
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE);
        const cached = await cache.match(req);
        const networkPromise = fetch(req)
          .then((res) => {
            if (res && res.status === 200 && res.type === "basic") {
              cache.put(req, res.clone());
            }
            return res;
          })
          .catch(() => cached);
        return cached || networkPromise;
      })()
    );
  }
});
