// Kinshasa Life Guide — 轻量 Service Worker
// 目的：在非洲高延迟/低带宽网络下，让回访与导航做到近乎瞬时
// 策略：
//   - HTML / 文档：network-first（3s 超时内拿新版；失败才回缓存）—— 避免部署新版后用户一直卡在旧 HTML
//   - _next/static 与 /images：cache-first（指纹化/immutable 资源）
//   - /api/*：始终走网络，由 CDN 的 s-maxage 控制

const CACHE = "klg-v13";
const STATIC_PREFIXES = ["/_next/static/", "/images/"];
const HTML_NETWORK_TIMEOUT_MS = 3000;

self.addEventListener("install", () => {
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

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("timeout")), ms);
    promise.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      }
    );
  });
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  if (isStatic(url.pathname)) {
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
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE);
        try {
          const res = await withTimeout(fetch(req), HTML_NETWORK_TIMEOUT_MS);
          if (res && res.status === 200 && res.type === "basic") {
            cache.put(req, res.clone());
          }
          return res;
        } catch {
          const cached = await cache.match(req);
          if (cached) return cached;
          // 最后兜底再试一次，不加超时
          return fetch(req);
        }
      })()
    );
  }
});
