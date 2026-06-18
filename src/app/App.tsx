import { useEffect, useMemo, useState } from "react";
import { PlaceholderPanel } from "../components/PlaceholderPanel";
import { SectionHeader } from "../components/SectionHeader";
import { getBootstrap } from "../lib/api";
import type { AvailabilityRequest, BootstrapData, PersonaKey, User } from "../lib/types";
import { AvailabilityScreen } from "../features/availability/AvailabilityScreen";
import { StaffRequestsScreen } from "../features/availability/StaffRequestsScreen";
import { ChecklistsPlaceholder } from "../features/checklists/ChecklistsPlaceholder";
import { AdminDashboardScreen } from "../features/events/AdminDashboardScreen";
import { EventsScreen } from "../features/events/EventsScreen";
import { InventoryPlaceholder } from "../features/inventory/InventoryPlaceholder";
import { LocationsScreen } from "../features/locations/LocationsScreen";
import { MessagesPlaceholder } from "../features/messages/MessagesPlaceholder";
import { MyDashboardScreen } from "../features/staff/MyDashboardScreen";
import { StaffListScreen } from "../features/staff/StaffListScreen";
import { adminNav, staffNav, type AppRoute } from "./navigation";

const personaUserIds: Record<PersonaKey, string> = {
  admin: "user_glenn",
  manager: "user_manager",
  staff: "user_ava",
};

export function App() {
  const [data, setData] = useState<BootstrapData | null>(null);
  const [persona, setPersona] = useState<PersonaKey>("admin");
  const [route, setRoute] = useState<AppRoute>("dashboard");

  useEffect(() => {
    getBootstrap().then(setData);
  }, []);

  const currentUser = useMemo(() => {
    if (!data) return null;
    return data.users.find((user) => user.id === personaUserIds[persona]) ?? data.users[0] ?? null;
  }, [data, persona]);

  const isStaffView = persona === "staff";
  const nav = isStaffView ? staffNav : adminNav;

  useEffect(() => {
    setRoute(isStaffView ? "my-dashboard" : "dashboard");
  }, [isStaffView]);

  function updateAvailabilityRequest(updated: AvailabilityRequest) {
    if (!data) return;
    setData({
      ...data,
      availabilityRequests: data.availabilityRequests.map((request) => (request.id === updated.id ? updated : request)),
    });
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span>Sideline Supplies</span>
          <strong>Sideline Ops</strong>
        </div>
        <nav className="nav-list" aria-label="Primary">
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <button className={route === item.id ? "active" : ""} key={item.id} onClick={() => setRoute(item.id)} type="button">
                <Icon aria-hidden="true" size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div>
            <span className="eyebrow">Phase 0 shell</span>
            <strong>{currentUser ? `${currentUser.display_name} / ${currentUser.role}` : "Loading"}</strong>
          </div>
          <label className="persona-switcher">
            <span>Persona</span>
            <select value={persona} onChange={(event) => setPersona(event.target.value as PersonaKey)}>
              <option value="admin">Glenn / Admin</option>
              <option value="manager">Manager</option>
              <option value="staff">Staff</option>
            </select>
          </label>
        </header>
        <main className="content">{data && currentUser ? renderRoute(route, data, currentUser, updateAvailabilityRequest) : <LoadingState />}</main>
        <nav className="mobile-nav" aria-label="Mobile primary">
          {nav.slice(0, 5).map((item) => {
            const Icon = item.icon;
            return (
              <button className={route === item.id ? "active" : ""} key={item.id} onClick={() => setRoute(item.id)} type="button">
                <Icon aria-hidden="true" size={19} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

function renderRoute(
  route: AppRoute,
  data: BootstrapData,
  currentUser: User,
  updateAvailabilityRequest: (request: AvailabilityRequest) => void
) {
  switch (route) {
    case "dashboard":
      return <AdminDashboardScreen events={data.events} requests={data.availabilityRequests} users={data.users} activity={data.activity} />;
    case "staff":
      return <StaffListScreen users={data.users} />;
    case "locations":
      return <LocationsScreen locations={data.locations} />;
    case "events":
      return <EventsScreen events={data.events} />;
    case "availability":
      return <AvailabilityScreen requests={data.availabilityRequests} users={data.users} />;
    case "messages":
      return <MessagesPlaceholder />;
    case "inventory":
      return <InventoryPlaceholder />;
    case "upload-photos":
      return (
        <>
          <SectionHeader title="Upload Photos" eyebrow="Staff" />
          <PlaceholderPanel title="Upload Photos placeholder" description="Staff photo uploads for inventory, setup, and closeout records will be added here." />
        </>
      );
    case "checklists":
      return <ChecklistsPlaceholder />;
    case "reports":
      return (
        <>
          <SectionHeader title="Reports" />
          <PlaceholderPanel title="Reports placeholder" description="Operational summaries, AI summaries, and exportable reports will be added here." />
        </>
      );
    case "settings":
      return (
        <>
          <SectionHeader title="Settings" />
          <PlaceholderPanel title="Settings placeholder" description="Business settings, notification preferences, and integrations will be configured here." />
        </>
      );
    case "my-dashboard":
      return <MyDashboardScreen currentUser={currentUser} events={data.events} requests={data.availabilityRequests} />;
    case "my-shifts":
      return (
        <>
          <SectionHeader title="My Shifts" eyebrow="Staff" />
          <PlaceholderPanel title="My Shifts placeholder" description="Assigned shifts and scheduling details will appear here." />
        </>
      );
    case "requests":
      return <StaffRequestsScreen currentUser={currentUser} requests={data.availabilityRequests} onRequestUpdated={updateAvailabilityRequest} />;
    case "tasks":
      return (
        <>
          <SectionHeader title="Tasks" eyebrow="Staff" />
          <PlaceholderPanel title="Tasks placeholder" description="Assigned event tasks and checklist follow-ups will appear here." />
        </>
      );
    default:
      return null;
  }
}

function LoadingState() {
  return (
    <section className="panel">
      <h1>Loading Sideline Ops</h1>
      <p className="muted">Preparing the operations shell.</p>
    </section>
  );
}
