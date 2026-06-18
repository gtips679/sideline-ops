export const accessGrantedKey = "sideline_access_granted";
export const accessGrantedAtKey = "sideline_access_granted_at";
export const localDevAccessCode = "sideline-dev";

export function getStoredAccess() {
  return {
    granted: localStorage.getItem(accessGrantedKey) === "true",
    grantedAt: localStorage.getItem(accessGrantedAtKey),
  };
}

export function storeAccessGrant() {
  const grantedAt = new Date().toISOString();
  localStorage.setItem(accessGrantedKey, "true");
  localStorage.setItem(accessGrantedAtKey, grantedAt);
  return grantedAt;
}

export function clearAccessGrant() {
  localStorage.removeItem(accessGrantedKey);
  localStorage.removeItem(accessGrantedAtKey);
}

export function isLocalHost(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "";
}
