import { demoData } from "./demoData";
import type { AvailabilityRequest, AvailabilityResponseValue, BootstrapData } from "./types";

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

  if (!response.ok) return null;
  const payload = (await response.json()) as { availabilityRequest: AvailabilityRequest | null };
  return payload.availabilityRequest;
}
