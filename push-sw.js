/* BeetleLog Web Push Service Worker.
 * Kept separate from existing app logic until subscription/backend are configured.
 */
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (_) {
    data = { body: event.data ? event.data.text() : "" };
  }
  const title = typeof data.title === "string" ? data.title.slice(0, 120) : "BeetleLog";
  const options = {
    body: typeof data.body === "string" ? data.body.slice(0, 300) : "새 알림이 도착했습니다.",
    icon: "./icons/app-icon-180.png",
    badge: "./icons/app-icon-180.png",
    tag: typeof data.tag === "string" ? data.tag : undefined,
    data: { url: typeof data.url === "string" ? data.url : "./index.html" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const rawUrl = event.notification.data?.url || "./index.html";
  // Keep notification deep-links inside the application's own origin and scope.
  const target = new URL(rawUrl, self.registration.scope);
  if (target.origin !== self.location.origin || !target.href.startsWith(self.registration.scope)) {
    return;
  }
  event.waitUntil((async () => {
    const clientsList = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const match = clientsList.find((client) => client.url.startsWith(self.registration.scope));
    if (match) {
      await match.navigate(target.href);
      return match.focus();
    }
    return self.clients.openWindow(target.href);
  })());
});