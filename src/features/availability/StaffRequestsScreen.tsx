import { useState } from "react";
import { SectionHeader } from "../../components/SectionHeader";
import { StatusPill } from "../../components/StatusPill";
import { saveAvailabilityResponse } from "../../lib/api";
import { formatDateTime } from "../../lib/format";
import type { AvailabilityRequest, AvailabilityResponseValue, User } from "../../lib/types";

type StaffRequestsScreenProps = {
  currentUser: User;
  requests: AvailabilityRequest[];
  onRequestUpdated: (request: AvailabilityRequest) => void;
};

export function StaffRequestsScreen({ currentUser, requests, onRequestUpdated }: StaffRequestsScreenProps) {
  const [pending, setPending] = useState<string | null>(null);

  async function respond(requestId: string, response: AvailabilityResponseValue) {
    setPending(`${requestId}:${response}`);
    const updated = await saveAvailabilityResponse({
      request_id: requestId,
      user_id: currentUser.id,
      response,
    });
    if (updated) onRequestUpdated(updated);
    setPending(null);
  }

  return (
    <>
      <SectionHeader title="Requests" eyebrow="Staff" />
      <div className="stack">
        {requests.map((request) => {
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
