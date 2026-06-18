import { MetricCard } from "../../components/MetricCard";
import { SectionHeader } from "../../components/SectionHeader";
import { StatusPill } from "../../components/StatusPill";
import { formatDateTime } from "../../lib/format";
import type { AvailabilityRequest, User } from "../../lib/types";
import { getNoResponseStaff, getResponseCounts } from "./availabilityUtils";

type AvailabilityScreenProps = {
  requests: AvailabilityRequest[];
  users: User[];
};

export function AvailabilityScreen({ requests, users }: AvailabilityScreenProps) {
  return (
    <>
      <SectionHeader title="Availability" eyebrow="Admin" />
      <div className="stack">
        {requests.map((request) => {
          const counts = getResponseCounts(request, users);
          const noResponses = getNoResponseStaff(request, users);
          return (
            <section className="panel" key={request.id}>
              <div className="panel-header">
                <div>
                  <h2>{request.title}</h2>
                  <p>{request.event_title} · {request.location_name} · {formatDateTime(request.starts_at)}</p>
                </div>
                <StatusPill status={request.status} />
              </div>
              <div className="metric-grid four">
                <MetricCard label="Yes" value={counts.yes} />
                <MetricCard label="No" value={counts.no} />
                <MetricCard label="Maybe" value={counts.maybe} />
                <MetricCard label="No response" value={counts.noResponse} />
              </div>
              <div className="response-grid">
                {users
                  .filter((user) => user.role === "staff" && user.is_active)
                  .map((user) => {
                    const response = request.responses.find((item) => item.user_id === user.id);
                    return (
                      <article className="response-row" key={user.id}>
                        <span>{user.display_name}</span>
                        <StatusPill status={response?.response ?? "No response"} />
                      </article>
                    );
                  })}
              </div>
              {noResponses.length > 0 ? (
                <p className="muted">Waiting on {noResponses.map((user) => user.display_name).join(", ")}.</p>
              ) : null}
            </section>
          );
        })}
      </div>
    </>
  );
}
