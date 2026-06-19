import { CalendarDays, CheckSquare, Inbox, MessageSquare } from "lucide-react";
import type { ReactNode } from "react";
import { SectionHeader } from "../../components/SectionHeader";
import type { AvailabilityRequest, Event, User } from "../../lib/types";
import { getRequestsForUser } from "../availability/availabilityUtils";

type MyDashboardScreenProps = {
  currentUser: User;
  events: Event[];
  requests: AvailabilityRequest[];
  onNavigate?: (route: "my-shifts" | "requests" | "messages" | "tasks") => void;
};

export function MyDashboardScreen({ currentUser, events, requests, onNavigate }: MyDashboardScreenProps) {
  const targetedRequests = getRequestsForUser(requests, currentUser);
  const pendingRequests = targetedRequests.filter((request) => !request.responses.some((response) => response.user_id === currentUser.id));

  return (
    <>
      <SectionHeader title="My Dashboard" eyebrow={currentUser.display_name} />
      <div className="staff-tile-grid">
        <Tile label="My Schedule" detail={`${events.length} demo event${events.length === 1 ? "" : "s"}`} icon={<CalendarDays size={26} />} onClick={() => onNavigate?.("my-shifts")} />
        <Tile label="Availability Requests" detail={`${pendingRequests.length} pending`} icon={<Inbox size={26} />} onClick={() => onNavigate?.("requests")} />
        <Tile label="Messages" detail="Coming soon" icon={<MessageSquare size={26} />} onClick={() => onNavigate?.("messages")} />
        <Tile label="Tasks" detail="Coming soon" icon={<CheckSquare size={26} />} onClick={() => onNavigate?.("tasks")} />
      </div>
    </>
  );
}

function Tile({ label, detail, icon, onClick }: { label: string; detail: string; icon: ReactNode; onClick?: () => void }) {
  return (
    <button className="staff-dashboard-tile" onClick={onClick} type="button">
      {icon}
      <strong>{label}</strong>
      <span>{detail}</span>
    </button>
  );
}
