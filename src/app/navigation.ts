import {
  Activity,
  CalendarDays,
  CheckSquare,
  ClipboardList,
  Gauge,
  Image,
  Inbox,
  MapPin,
  MessageSquare,
  Settings,
  Users,
} from "lucide-react";

export type AdminRoute =
  | "dashboard"
  | "staff"
  | "locations"
  | "events"
  | "availability"
  | "messages"
  | "inventory"
  | "checklists"
  | "reports"
  | "settings";

export type StaffRoute = "my-dashboard" | "my-shifts" | "requests" | "messages" | "tasks" | "upload-photos";
export type AppRoute = AdminRoute | StaffRoute;

export const adminNav = [
  { id: "dashboard", label: "Dashboard", icon: Gauge },
  { id: "staff", label: "Staff", icon: Users },
  { id: "locations", label: "Locations", icon: MapPin },
  { id: "events", label: "Events", icon: CalendarDays },
  { id: "availability", label: "Availability", icon: Inbox },
  { id: "messages", label: "Messages", icon: MessageSquare },
  { id: "inventory", label: "Inventory", icon: Image },
  { id: "checklists", label: "Checklists", icon: ClipboardList },
  { id: "reports", label: "Reports", icon: Activity },
  { id: "settings", label: "Settings", icon: Settings },
] as const;

export const staffNav = [
  { id: "my-dashboard", label: "My Dashboard", icon: Gauge },
  { id: "my-shifts", label: "My Shifts", icon: CalendarDays },
  { id: "requests", label: "Requests", icon: Inbox },
  { id: "messages", label: "Messages", icon: MessageSquare },
  { id: "tasks", label: "Tasks", icon: CheckSquare },
  { id: "upload-photos", label: "Upload Photos", icon: Image },
] as const;
