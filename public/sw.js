/* MyPicks PWA service worker — push notifications and static asset cache. */
const CACHE_VERSION = "kickboard-v1";

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let payload = { title: "MyPicks", body: "", url: "/", tag: "mypicks" };
  try {
    payload = { ...payload, ...event.data?.json() };
  } catch {
    const text = event.data?.text();
    if (text) payload.body = text;
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/icon",
      badge: "/icon",
      tag: payload.tag,
      data: { url: payload.url },
      renotify: true
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";
  const absolute = targetUrl.startsWith("http")
    ? targetUrl
    : new URL(targetUrl, self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.startsWith(self.location.origin) && "focus" in client) {
          client.navigate(absolute);
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(absolute);
    })
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (!url.pathname.startsWith("/_next/static/")) return;

  event.respondWith(
    caches.open(CACHE_VERSION).then(async (cache) => {
      const cached = await cache.match(event.request);
      if (cached) return cached;
      const response = await fetch(event.request);
      if (response.ok) cache.put(event.request, response.clone());
      return response;
    })
  );
});
