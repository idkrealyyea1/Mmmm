/* Marshmallo booking notifications */
self.addEventListener("push", event => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (error) {
    data = { title: "Marshmallo", body: "Your booking status was updated." };
  }

  event.waitUntil(self.registration.showNotification(data.title || "Marshmallo", {
    body: data.body || "Your booking status was updated.",
    icon: "images/logo.webp",
    badge: "images/logo.webp",
    tag: data.bookingId ? `booking-${data.bookingId}` : "booking-status",
    data: { url: data.url || "track.html", bookingId: data.bookingId || "" },
  }));
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "track.html";
  const absoluteTargetUrl = new URL(targetUrl, self.registration.scope).href;
  event.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then(openWindows => {
    const existing = openWindows.find(client => "focus" in client);
    if (existing) {
      existing.navigate(absoluteTargetUrl);
      return existing.focus();
    }
    return clients.openWindow(absoluteTargetUrl);
  }));
});
