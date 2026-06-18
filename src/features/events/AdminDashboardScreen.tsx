import { MetricCard } from "../../components/MetricCard";
import { SectionHeader } from "../../components/SectionHeader";
import { formatDateTime } from "../../lib/format";
import type { ActivityItem, AvailabilityRequest, Event, User } from "../../lib/types";
import { RecentActivity } from "../activity/RecentActivity";
import { getNoResponseStaff, getResponseCounts } from "../availability/availabilityUtils";

type AdminDashboardScreenProps = {
  events: Event[];
  requests: AvailabilityRequest[];
  users: User[];
  activity: ActivityItem[];
};

export function AdminDashboardScreen({ events, requests, users, activity }: AdminDashboardScreenProps) {
  const todayKey = new Date().toISOString().slice(0, 10);
  const todaysEvents = events.filter((event) => event.starts_at.slice(0, 10) === todayKey);
  const activeRequest = requests[0];
  const counts = activeRequest ? getResponseCounts(activeRequest) : { yes: 0, no: 0, maybe: 0, noResponse: 0 };
  const noResponseStaff = activeRequest ? getNoResponseStaff(activeRequest) : [];

  return (
    <>
      <SectionHeader title="Dashboard" eyebrow="Admin" />
      <div className="metric-grid">
        <MetricCard label="Today's events" value={todaysEvents.length} detail="Scheduled for today" />
        <MetricCard label="Pending availability responses" value={counts.noResponse} detail={activeRequest?.title ?? "No open request"} />
        <MetricCard label="No-response staff" value={noResponseStaff.length} detail={noResponseStaff.map((user) => user.display_name).join(", ") || "Everyone replied"} />
        <MetricCard label="Recent activity" value={activity.length} detail="Latest operations events" />
      </div>
      <div className="dashboard-grid">
        <section className="panel">
          <h2>Upcoming events</h2>
          <div className="event-list">
            {events.slice(0, 4).map((event) => (
              <article className="event-row" key={event.id}>
                <div>
                  <strong>{event.title}</strong>
                  <span>{event.location_name}</span>
                </div>
                <small>{formatDateTime(event.starts_at)}</small>
              </article>
            ))}
          </div>
        </section>
        <section className="panel">
          <h2>Recent activity</h2>
          <RecentActivity activity={activity} />
        </section>
      </div>
    </>
  );
}
