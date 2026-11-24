/* Offline support: precache the app shell, then serve cache-first and refresh in the background. */
const CACHE = "workout12-v2";
const SHELL = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "css/app.css",
  "js/app.js",
  "js/data.js",
  "js/logic.js",
  "js/store.js",
  "js/notify.js",
  "js/icons.js",
  "vendor/gsap.min.js",
  "fonts/inter-latin-opsz-normal.woff2",
  "fonts/inter-vietnamese-opsz-normal.woff2",
  "icons/favicon.svg",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/maskable-512.png",
  "icons/apple-touch-icon.png"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL.map(u => new Request(u, { cache: "reload" })))).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const key = req.mode === "navigate" ? "index.html" : req;
    const hit = await cache.match(key, { ignoreSearch: true });
    const fresh = fetch(req).then(res => {
      if (res.ok && res.type === "basic") cache.put(key, res.clone());
      return res;
    });
    if (hit) { e.waitUntil(fresh.catch(() => {})); return hit; }
    return fresh;
  })());
});

/* ---------- timer notifications ---------- */
/* The page asks us to show a "time is up" notification at a given moment. A pending message
   keeps the worker alive, so this only works for short timers (the page sends rests only).
   Skipped while any app window is on screen. Same tag as the page's own notification: never doubled. */
const pending = new Map();
const stop = id => { const p = pending.get(id); if (p) { clearTimeout(p.t); p.done(); pending.delete(id); } };

self.addEventListener("message", e => {
  const d = e.data || {};
  if (d.type === "cancel") return stop(d.id);
  if (d.type !== "schedule" || !d.note) return;
  stop(d.id);
  const wait = new Promise(done => {
    const t = setTimeout(async () => {
      pending.delete(d.id);
      try {
        const wins = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
        if (!wins.some(c => c.visibilityState === "visible"))
          await self.registration.showNotification(d.note.title, { body: d.note.body, tag: "timer", renotify: true, vibrate: [200, 100, 200], icon: "icons/icon-192.png", badge: "icons/icon-192.png", data: { url: "./" } });
      } catch (err) {}
      done();
    }, Math.max(0, d.at - Date.now()));
    pending.set(d.id, { t, done });
  });
  e.waitUntil(wait);
});

self.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const w = wins.find(c => "focus" in c);
    if (w) return w.focus();
    return self.clients.openWindow((e.notification.data && e.notification.data.url) || "./");
  })());
});
