// Ascend service worker: keeps the app opening with no signal.
const VERSION = "ascend-v6p";
const SHELL = ["/", "/index.html", "/manifest.webmanifest", "/apple-touch-icon.png", "/icon-192.png", "/logo.webp", "/logo-sm.webp",
  "/avatars/E.webp", "/avatars/D.webp", "/avatars/C.webp", "/avatars/B.webp", "/avatars/A.webp", "/avatars/S.webp", "/avatars/SS.webp",
  "/avatars/E-f.webp", "/avatars/D-f.webp", "/avatars/C-f.webp", "/avatars/B-f.webp", "/avatars/A-f.webp", "/avatars/S-f.webp", "/avatars/SS-f.webp"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // Never cache API calls or database traffic
  if (url.pathname.startsWith("/api/") || url.hostname.endsWith("supabase.co") || url.hostname.includes("anthropic.com")) return;

  // Pages: try the network first so updates show up, fall back to the cached app when offline
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).then((res) => { const copy = res.clone(); caches.open(VERSION).then((c) => c.put("/index.html", copy)); return res; })
      .catch(() => caches.match("/index.html").then((r) => r || caches.match("/"))));
    return;
  }
  // App files, fonts, images: serve from cache, refresh in the background
  const cacheable = url.origin === self.location.origin || url.hostname.includes("fonts.googleapis.com") || url.hostname.includes("fonts.gstatic.com");
  if (!cacheable) return;
  e.respondWith(caches.match(req).then((hit) => {
    const net = fetch(req).then((res) => { if (res && (res.ok || res.type === "opaque")) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); } return res; }).catch(() => hit);
    return hit || net;
  }));
});
