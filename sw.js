/* Marshmallow service worker: push notifications + lightweight caching */
const CACHE = "marshmallow-static-v1";
const STATIC_CACHE = CACHE + "-assets";
const PAGE_CACHE = CACHE + "-pages";
const CACHE_LIMIT = 100;

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== STATIC_CACHE && k !== PAGE_CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

async function trimCache(cacheName) {
  try {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    if (keys.length > CACHE_LIMIT) {
      await Promise.all(keys.slice(0, keys.length - CACHE_LIMIT).map((k) => cache.delete(k)));
    }
  } catch (e) { /* ignore */ }
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  // Pages: always try the network first so admins/customers never see stale content.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(PAGE_CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match("index.html")))
    );
    return;
  }

  // Static assets (css/js/webp/fonts): serve from cache instantly, refresh in background.
  const url = new URL(req.url);
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(req).then((cached) => {
        const refresh = fetch(req)
          .then((res) => {
            if (res && res.ok) {
              const copy = res.clone();
              caches.open(STATIC_CACHE).then((c) => c.put(req, copy)).then(() => trimCache(STATIC_CACHE));
            }
            return res;
          })
          .catch(() => cached);
        return cached || refresh;
      })
    );
  }
});

/* --- Push notifications --- */
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (error) {
    data = { title: "Marshmallow", body: "Your booking status was updated." };
  }

  event.waitUntil(self.registration.showNotification(data.title || "Marshmallow", {
    body: data.body || "Your booking status was updated.",
    icon: "images/logo.webp",
    badge: "images/logo.webp",
    tag: data.bookingId ? `booking-${data.bookingId}` : "booking-status",
    data: { url: data.url || "track.html", bookingId: data.bookingId || "" },
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "track.html";
  const absoluteTargetUrl = new URL(targetUrl, self.registration.scope).href;
  event.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then((openWindows) => {
    const existing = openWindows.find((client) => "focus" in client);
    if (existing) {
      existing.navigate(absoluteTargetUrl);
      return existing.focus();
    }
    return clients.openWindow(absoluteTargetUrl);
  }));
});
