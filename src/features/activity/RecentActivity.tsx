import { formatDateTime } from "../../lib/format";
import type { ActivityItem } from "../../lib/types";

type RecentActivityProps = {
  activity: ActivityItem[];
};

export function RecentActivity({ activity }: RecentActivityProps) {
  return (
    <div className="activity-list">
      {activity.length === 0 ? (
        <p className="muted">No activity yet.</p>
      ) : (
        activity.slice(0, 6).map((item) => (
          <article key={item.id} className="activity-item">
            <p>{item.summary}</p>
            <small>{formatDateTime(item.created_at)}</small>
          </article>
        ))
      )}
    </div>
  );
}
