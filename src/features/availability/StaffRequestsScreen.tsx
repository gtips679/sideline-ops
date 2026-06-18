import { useState } from "react";
import { SectionHeader } from "../../components/SectionHeader";
import { StatusPill } from "../../components/StatusPill";
import { saveAvailabilityResponse } from "../../lib/api";
import { formatDateTime } from "../../lib/format";
import type { AvailabilityRequest, AvailabilityResponseValue, User } from "../../lib/types";
import { getRequestsForUser } from "./availabilityUtils";

type StaffRequestsScreenProps = {
  currentUser: User;
  requests: AvailabilityRequest[];
  onRequestUpdated: (request: AvailabilityRequest) => void;
};

export function StaffRequestsScreen({ currentUser, requests, onRequestUpdated }: StaffRequestsScreenProps) {
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const targetedRequests = getRequestsForUser(requests, currentUser);

  async function respond(requestId: string, response: AvailabilityResponseValue) {
    setError(null);
    setPending(`${requestId}:${response}`);
    try {
      const updated = await saveAvailabilityResponse({
        request_id: requestId,
        user_id: currentUser.id,
        response,
      });
      if (updated) onRequestUpdated(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save response.");
    }
    setPending(null);
  }

  return (
    <>
      <SectionHeader title="Requests" eyebrow="Staff" />
      {error ? <div className="notice error">{error}</div> : null}
      <div className="stack">
        {targetedRequests.length === 0 ? <section className="panel empty-state">No requests are assigned to you right now.</section> : null}
        {targetedRequests.map((request) => {
          const currentResponse = request.responses.find((item) => item.user_id === currentUser.id);
          return (
            <section className="panel" key={request.id}>
              <div className="panel-header">
                <div>
                  <h2>{request.title}</h2>
                  <p>{request.message}</p>
                  <small>{request.location_name} · {formatDateTime(request.starts_at)}</small>
                </div>
                <StatusPill status={currentResponse?.response ?? "No response"} />
              </div>
              <div className="button-row">
                {(["yes", "no", "maybe"] as const).map((value) => (
                  <button
                    className={`choice-button choice-${value}`}
                    key={value}
                    disabled={pending !== null}
                    onClick={() => respond(request.id, value)}
                    type="button"
                  >
                    {pending === `${request.id}:${value}` ? "Saving" : value.charAt(0).toUpperCase() + value.slice(1)}
                  </button>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
