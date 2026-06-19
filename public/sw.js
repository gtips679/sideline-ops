self.addEventListener("push", (event) => {
  event.waitUntil(handlePush(event));
});

async function handlePush(event) {
  const payload = parsePushPayload(event);
  if (!payload) {
    await showPendingOrFallback();
    return;
  }

  await showNotification(payload);
}

async function showNotification(payload) {
  const title = payload.title || "Sideline Ops";
  const targetUrl = payload.url || "/";
  const options = {
    body: payload.body || "You have a new Sideline Ops update.",
    icon: "/icon.svg",
    badge: "/icon-maskable.svg",
    data: {
      url: targetUrl,
      id: payload.id || null,
    },
  };

  await self.registration.showNotification(title, options);
}

function parsePushPayload(event) {
  if (!event.data) return null;

  try {
    return event.data.json();
  } catch {
    return null;
  }
}

async function showPendingOrFallback() {
  try {
    const subscription = await self.registration.pushManager.getSubscription();
    const endpoint = subscription?.endpoint;
    if (!endpoint) {
      await showFallbackNotification();
      return;
    }

    const response = await fetch("/api/notifications/pending", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ endpoint }),
    });

    if (!response.ok) {
      await showFallbackNotification();
      return;
    }

    const payload = await response.json();
    const notifications = Array.isArray(payload.notifications) ? payload.notifications : [];
    if (notifications.length === 0) {
      await showFallbackNotification();
      return;
    }

    const shownIds = [];
    for (const notification of notifications) {
      await showNotification({
        title: notification.title,
        body: notification.body,
        url: notification.url || "/",
        id: notification.id,
      });
      if (notification.id) shownIds.push(notification.id);
    }

    if (shownIds.length > 0) {
      await fetch("/api/notifications/mark-shown", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ids: shownIds }),
      }).catch(() => undefined);
    }
  } catch {
    await showFallbackNotification();
  }
}

async function showFallbackNotification() {
  await showNotification({
    title: "Sideline Ops",
    body: "Empty push received by Sideline Ops.",
    url: "/",
  });
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
