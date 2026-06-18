import { demoData } from "./demoData";
import type { ApiHealth, AvailabilityRequest, AvailabilityResponseValue, BootstrapData, Event, Location, User } from "./types";

export async function getApiHealth(): Promise<ApiHealth> {
  const response = await fetch("/api/health");
  if (!response.ok) throw new Error("API health check failed");
  return (await response.json()) as ApiHealth;
}

export async function verifyAccessCode(code: string): Promise<void> {
  const response = await fetch("/api/access/verify", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ code }),
  });

  if (response.ok) return;

  const payload = await response.json().catch(() => null);
  throw new Error(payload && typeof payload.error === "string" ? payload.error : "Invalid access code");
}

export async function getBootstrap(): Promise<BootstrapData> {
  try {
    const response = await fetch("/api/bootstrap");
    if (!response.ok) throw new Error("Bootstrap request failed");
    return (await response.json()) as BootstrapData;
  } catch {
    return demoData;
  }
}

export async function saveAvailabilityResponse(input: {
  request_id: string;
  user_id: string;
  response: AvailabilityResponseValue;
}): Promise<AvailabilityRequest | null> {
  const response = await fetch("/api/availability-responses", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });

  const payload = (await response.json().catch(() => null)) as { availabilityRequest?: AvailabilityRequest | null; error?: string } | null;
  if (!response.ok) throw new Error(payload?.error ?? "Could not save response.");
  return payload?.availabilityRequest ?? null;
}

export async function createUser(input: {
  display_name: string;
  phone: string;
  email: string;
  role: string;
  is_active: boolean;
  actor_user_id: string;
}): Promise<User> {
  const payload = await postJson<{ user: User }>("/api/users", input);
  return payload.user;
}

export async function createLocation(input: {
  name: string;
  location_type: string;
  notes: string;
  is_active: boolean;
  actor_user_id: string;
}): Promise<Location> {
  const payload = await postJson<{ location: Location }>("/api/locations", input);
  return payload.location;
}

export async function createEvent(input: {
  location_id: string;
  title: string;
  event_type: string;
  starts_at: string;
  ends_at: string;
  expected_crowd: number | null;
  notes: string;
  status: string;
  actor_user_id: string;
}): Promise<Event> {
  const payload = await postJson<{ event: Event }>("/api/events", input);
  return payload.event;
}

export async function createAvailabilityRequest(input: {
  event_id: string;
  title: string;
  message: string;
  response_deadline: string;
  recipient_mode?: "all_active_staff";
  recipient_user_ids?: string[];
  created_by_user_id: string;
}): Promise<AvailabilityRequest> {
  const payload = await postJson<{ availabilityRequest: AvailabilityRequest }>("/api/availability-requests", input);
  return payload.availabilityRequest;
}

async function postJson<T>(url: string, input: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload && typeof payload.error === "string" ? payload.error : "Request failed");
  }
  return payload as T;
}
