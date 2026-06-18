self.addEventListener("push", (event) => {
  event.waitUntil(handlePush(event));
});

async function handlePush(event) {
  const payload = parsePushPayload(event);
  const title = payload.title || "Sideline Ops";
  const targetUrl = payload.url || "/";
  const options = {
    body: payload.body || "You have a new Sideline Ops update.",
    icon: "/icon.svg",
    badge: "/icon-maskable.svg",
    data: {
      url: targetUrl,
    },
  };

  await self.registration.showNotification(title, options);
}

function parsePushPayload(event) {
  if (!event.data) return {};

  try {
    return event.data.json();
  } catch {
    try {
      return { body: event.data.text() };
    } catch {
      return {};
    }
  }
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = new URL(event.notification.data?.url || "/", self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.startsWith(self.location.origin) && "focus" in client) {
          if ("navigate" in client && client.url !== targetUrl) {
            return client.navigate(targetUrl).then((focusedClient) => focusedClient?.focus());
          }

          return client.focus();
        }
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }

      return undefined;
    })
  );
});
