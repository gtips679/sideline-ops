import { disablePushSubscription, getNotificationConfig, savePushSubscription } from "./api";
import type { ClientDeviceInfo } from "./device";
import type { NotificationConfig } from "./types";

export type PushUiState = {
  serviceWorkerSupported: boolean;
  serviceWorkerStatus: "unsupported" | "checking" | "registered" | "error";
  notificationPermission: NotificationPermission | "unsupported";
  pushSupported: boolean;
  pushConfig: NotificationConfig | null;
  pushConfigStatus: "checking" | "available" | "missing" | "error";
  subscriptionStatus: "checking" | "subscribed" | "not-subscribed" | "unavailable";
  message: string | null;
  error: string | null;
};

export const initialPushUiState: PushUiState = {
  serviceWorkerSupported: "serviceWorker" in navigator,
  serviceWorkerStatus: "checking",
  notificationPermission: "Notification" in window ? Notification.permission : "unsupported",
  pushSupported: "PushManager" in window,
  pushConfig: null,
  pushConfigStatus: "checking",
  subscriptionStatus: "checking",
  message: null,
  error: null,
};

export async function inspectPushState(): Promise<PushUiState> {
  const serviceWorkerSupported = "serviceWorker" in navigator;
  const pushSupported = "PushManager" in window;
  const notificationPermission = "Notification" in window ? Notification.permission : "unsupported";

  let pushConfig: NotificationConfig | null = null;
  let pushConfigStatus: PushUiState["pushConfigStatus"] = "checking";
  try {
    pushConfig = await getNotificationConfig();
    pushConfigStatus = pushConfig.pushEnabled ? "available" : "missing";
  } catch {
    pushConfigStatus = "error";
  }

  if (!serviceWorkerSupported) {
    return {
      serviceWorkerSupported,
      serviceWorkerStatus: "unsupported",
      notificationPermission,
      pushSupported,
      pushConfig,
      pushConfigStatus,
      subscriptionStatus: "unavailable",
      message: null,
      error: null,
    };
  }

  try {
    const registration = await navigator.serviceWorker.register("/sw.js");
    const subscription = pushSupported ? await registration.pushManager.getSubscription() : null;
    return {
      serviceWorkerSupported,
      serviceWorkerStatus: "registered",
      notificationPermission,
      pushSupported,
      pushConfig,
      pushConfigStatus,
      subscriptionStatus: pushSupported ? subscription ? "subscribed" : "not-subscribed" : "unavailable",
      message: null,
      error: null,
    };
  } catch (err) {
    return {
      serviceWorkerSupported,
      serviceWorkerStatus: "error",
      notificationPermission,
      pushSupported,
      pushConfig,
      pushConfigStatus,
      subscriptionStatus: "unavailable",
      message: null,
      error: err instanceof Error ? err.message : "Service worker registration failed.",
    };
  }
}

export async function enablePushForUser(userId: string, device: ClientDeviceInfo, currentConfig: NotificationConfig | null) {
  if (!("Notification" in window)) throw new Error("Browser notifications are not supported.");
  if (!("serviceWorker" in navigator)) throw new Error("Service workers are not supported.");
  if (!("PushManager" in window)) throw new Error("Push subscriptions are not supported.");
  if (!currentConfig?.pushEnabled || !currentConfig.vapidPublicKey) throw new Error("Push config missing.");

  const permission = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
  if (permission !== "granted") throw new Error("Notification permission was not granted.");

  const registration = await navigator.serviceWorker.register("/sw.js");
  const existing = await registration.pushManager.getSubscription();
  const subscription = existing ?? await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(currentConfig.vapidPublicKey),
  });

  const json = subscription.toJSON();
  if (!subscription.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    throw new Error("Browser returned an incomplete push subscription.");
  }

  await savePushSubscription({
    userId,
    deviceId: device.id,
    deviceLabel: device.label,
    endpoint: subscription.endpoint,
    keys: {
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
    },
    userAgent: navigator.userAgent,
  });
}

export async function disableCurrentPush(device: ClientDeviceInfo) {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    await disablePushSubscription({ deviceId: device.id });
    return;
  }

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    await disablePushSubscription({ deviceId: device.id });
    return;
  }

  const endpoint = subscription.endpoint;
  await subscription.unsubscribe();
  await disablePushSubscription({ endpoint, deviceId: device.id });
}

export async function showLocalTestNotification() {
  if (!("Notification" in window)) throw new Error("Browser notifications are not supported.");
  if (Notification.permission !== "granted") throw new Error("Notification permission is not granted for this device.");
  if (!("serviceWorker" in navigator)) throw new Error("Service workers are not supported.");

  const registration = await navigator.serviceWorker.ready;
  await registration.showNotification("Sideline Ops", {
    body: "Local notification test from this device.",
    icon: "/icon.svg",
    badge: "/icon-maskable.svg",
    data: { url: "/" },
  });
}

function urlBase64ToUint8Array(value: string) {
  const padding = "=".repeat((4 - value.length % 4) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const output = new Uint8Array(rawData.length);

  for (let index = 0; index < rawData.length; index += 1) {
    output[index] = rawData.charCodeAt(index);
  }

  return output;
}
