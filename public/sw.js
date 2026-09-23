// Ascend service worker: keeps the app opening with no signal.
const VERSION = "ascend-v7g";
const SHELL = ["/", "/index.html", "/manifest.webmanifest", "/apple-touch-icon.png", "/icon-192.png", "/logo.webp", "/logo-sm.webp",
  "/avatars/E.webp", "/avatars/D.webp", "/avatars/C.webp", "/avatars/B.webp", "/avatars/A.webp", "/avatars/S.webp", "/avatars/SS.webp",
  "/avatars/E-f.webp", "/avatars/D-f.webp", "/avatars/C-f.webp", "/avatars/B-f.webp", "/avatars/A-f.webp", "/avatars/S-f.webp", "/avatars/SS-f.webp"];
// Placeholder only. The Vite build writes hashed /assets/*.js and *.css into dist/sw.js.
const PRECACHE = [];

self.addEventListener("install", (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    await cache.addAll(SHELL);
    if (PRECACHE.length) {
      try {
        await cache.addAll(PRECACHE);
      } catch (err) {
        console.warn("[ascend] precache failed, installing with shell only", err);
      }
    }
    await self.skipWaiting();
  })());
});
function cacheRank(name) {
  return name.replace(/^ascend-v/, "").replace(/\d+/g, (n) => n.padStart(6, "0"));
}
self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    const older = keys.filter((k) => k.startsWith("ascend-v") && k !== VERSION).sort((a, b) => cacheRank(a) < cacheRank(b) ? -1 : cacheRank(a) > cacheRank(b) ? 1 : 0);
    const previous = older.length ? older[older.length - 1] : null;
    await Promise.all(keys.filter((k) => k !== VERSION && k !== previous).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});
self.addEventListener("message", (e) => {
  if (e.data === "skipWaiting") self.skipWaiting();
});
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // Never cache API calls, the worker itself, or database traffic
  if (url.pathname.startsWith("/api/") || url.pathname === "/sw.js" || url.hostname.endsWith("supabase.co") || url.hostname.includes("anthropic.com")) return;

  // Pages: try the network first so updates show up, fall back to the cached app when offline
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).then((res) => { const copy = res.clone(); caches.open(VERSION).then((c) => c.put("/index.html", copy)); return res; })
      .catch(() => caches.match("/index.html").then((r) => r || caches.match("/"))));
    return;
  }

  // Same-origin JS/CSS: current cache first. The previous cache is only opened on a miss,
  // so a warm launch does not pay for a cache list on every file.
  if (url.origin === self.location.origin && /\.(js|css)$/.test(url.pathname)) {
    e.respondWith((async () => {
      const from = async (name) => caches.match(req, { cacheName: name, ignoreVary: true })
        || caches.match(url.pathname, { cacheName: name, ignoreVary: true });
      const current = await from(VERSION);
      if (current) return current;
      const names = await caches.keys();
      for (const name of names) {
        if (!name.startsWith("ascend-v") || name === VERSION) continue;
        const hit = await from(name);
        if (hit) return hit;
      }
      const res = await fetch(req).catch(() => null);
      if (res && res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
      return res || new Response("", { status: 504 });
    })());
    return;
  }

  // Other app files, fonts, images: serve from cache, refresh in the background
  const cacheable = url.origin === self.location.origin || url.hostname.includes("fonts.googleapis.com") || url.hostname.includes("fonts.gstatic.com");
  if (!cacheable) return;
  e.respondWith(caches.match(req).then((hit) => {
    const net = fetch(req).then((res) => { if (res && (res.ok || res.type === "opaque")) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); } return res; }).catch(() => hit);
    return hit || net;
  }));
});
