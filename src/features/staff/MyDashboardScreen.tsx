import { MetricCard } from "../../components/MetricCard";
import { SectionHeader } from "../../components/SectionHeader";
import { formatDateTime } from "../../lib/format";
import type { AvailabilityRequest, Event, User } from "../../lib/types";
import { getRequestsForUser } from "../availability/availabilityUtils";

type MyDashboardScreenProps = {
  currentUser: User;
  events: Event[];
  requests: AvailabilityRequest[];
};

export function MyDashboardScreen({ currentUser, events, requests }: MyDashboardScreenProps) {
  const targetedRequests = getRequestsForUser(requests, currentUser);
  const pendingRequests = targetedRequests.filter((request) => !request.responses.some((response) => response.user_id === currentUser.id));
  const nextEvent = events[0];

  return (
    <>
      <SectionHeader title="My Dashboard" eyebrow={currentUser.display_name} />
      <div className="metric-grid">
        <MetricCard label="Pending requests" value={pendingRequests.length} detail="Availability replies needed" />
        <MetricCard label="Upcoming events" value={events.length} detail="Demo schedule view" />
      </div>
      <section className="panel">
        <h2>Next event</h2>
        {nextEvent ? (
          <div className="summary-block">
            <strong>{nextEvent.title}</strong>
            <span>{nextEvent.location_name}</span>
            <small>{formatDateTime(nextEvent.starts_at)}</small>
          </div>
        ) : (
          <p className="muted">No upcoming events.</p>
        )}
      </section>
    </>
  );
}
