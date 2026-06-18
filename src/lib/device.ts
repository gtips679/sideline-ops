export type ClientDeviceInfo = {
  id: string;
  label: string;
  shortId: string;
};

const deviceIdKey = "sideline_device_id";
const deviceLabelKey = "sideline_device_label";

export function getClientDeviceInfo(): ClientDeviceInfo {
  const id = getStoredDeviceId();
  const label = getStoredDeviceLabel();

  return {
    id,
    label,
    shortId: shortenDeviceId(id),
  };
}

export function shortenDeviceId(id: string): string {
  return id.length <= 8 ? id : id.slice(0, 8);
}

function getStoredDeviceId(): string {
  const existing = window.localStorage.getItem(deviceIdKey);
  if (existing) return existing;

  const next = crypto.randomUUID();
  window.localStorage.setItem(deviceIdKey, next);
  return next;
}

function getStoredDeviceLabel(): string {
  const existing = window.localStorage.getItem(deviceLabelKey);
  if (existing) return existing;

  const next = inferDeviceLabel();
  window.localStorage.setItem(deviceLabelKey, next);
  return next;
}

function inferDeviceLabel(): string {
  const userAgent = navigator.userAgent;
  const platform = navigator.platform || "";
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
  const isIPhone = /iPhone/i.test(userAgent) || /iPhone/i.test(platform);
  const isIPad = /iPad/i.test(userAgent) || /MacIntel/.test(platform) && navigator.maxTouchPoints > 1;
  const isAndroid = /Android/i.test(userAgent);
  const isEdge = /Edg\//i.test(userAgent);
  const isChrome = /Chrome|CriOS/i.test(userAgent) && !isEdge;
  const isSafari = /Safari/i.test(userAgent) && !isChrome && !isEdge;

  if (isIPhone) return isStandalone ? "iPhone PWA" : isSafari ? "iPhone Safari" : "iPhone";
  if (isIPad) return isStandalone ? "iPad PWA" : isSafari ? "iPad Safari" : "iPad";
  if (isAndroid) return isChrome ? "Android Chrome" : "Android device";
  if (isEdge) return "Desktop Edge";
  if (isChrome) return "Desktop Chrome";
  if (isSafari) return "Desktop Safari";
  return "Unknown device";
}
