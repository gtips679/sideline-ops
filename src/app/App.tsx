import { useEffect, useMemo, useState } from "react";
import { PlaceholderPanel } from "../components/PlaceholderPanel";
import { SectionHeader } from "../components/SectionHeader";
import { getApiHealth, getAuthMe, getBootstrap, getPushSubscriptions, logout, sendTestPushNotification } from "../lib/api";
import { getClientDeviceInfo, type ClientDeviceInfo } from "../lib/device";
import { disableCurrentPush, enablePushForUser, initialPushUiState, inspectPushState, showLocalTestNotification, type PushUiState } from "../lib/push";
import type { ApiHealth, AvailabilityRequest, BootstrapData, PersonaKey, PushSubscriptionInfo, TestPushSummary, User } from "../lib/types";
import { AvailabilityScreen } from "../features/availability/AvailabilityScreen";
import { StaffRequestsScreen } from "../features/availability/StaffRequestsScreen";
import { InviteSetupScreen } from "../features/auth/InviteSetupScreen";
import { LoginScreen } from "../features/auth/LoginScreen";
import { ChecklistsPlaceholder } from "../features/checklists/ChecklistsPlaceholder";
import { AdminDashboardScreen } from "../features/events/AdminDashboardScreen";
import { EventsScreen } from "../features/events/EventsScreen";
import { InventoryPlaceholder } from "../features/inventory/InventoryPlaceholder";
import { LocationsScreen } from "../features/locations/LocationsScreen";
import { MessagesPlaceholder } from "../features/messages/MessagesPlaceholder";
import { SettingsScreen } from "../features/settings/SettingsScreen";
import { MyDashboardScreen } from "../features/staff/MyDashboardScreen";
import { StaffListScreen } from "../features/staff/StaffListScreen";
import { isLocalHost } from "./access";
import { adminNav, staffNav, type AppRoute } from "./navigation";

const personaUserIds: Record<PersonaKey, string> = {
  admin: "user_glenn",
  manager: "user_manager",
  staff: "user_ava",
};

const appVersion = "2.0.1-dev";

export function App() {
  const [path, setPath] = useState(() => window.location.pathname);
  const [data, setData] = useState<BootstrapData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [health, setHealth] = useState<ApiHealth | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [pushState, setPushState] = useState<PushUiState>(initialPushUiState);
  const [pushBusy, setPushBusy] = useState(false);
  const [deviceInfo] = useState<ClientDeviceInfo>(() => getClientDeviceInfo());
  const [subscriptions, setSubscriptions] = useState<PushSubscriptionInfo[]>([]);
  const [subscriptionsError, setSubscriptionsError] = useState<string | null>(null);
  const [testPushBusy, setTestPushBusy] = useState(false);
  const [testPushResult, setTestPushResult] = useState<TestPushSummary | null>(null);
  const [testPushError, setTestPushError] = useState<string | null>(null);
  const [localNotificationMessage, setLocalNotificationMessage] = useState<string | null>(null);
  const [localNotificationError, setLocalNotificationError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [persona, setPersona] = useState<PersonaKey>("admin");
  const [route, setRoute] = useState<AppRoute>("dashboard");

  useEffect(() => {
    getAuthMe()
      .then((user) => {
        setAuthUser(user);
        if (user?.role === "staff") setRoute("my-dashboard");
      })
      .catch(() => setAuthUser(null))
      .finally(() => setAuthChecked(true));
  }, []);

  useEffect(() => {
    if (authUser) {
      refreshData();
      refreshHealth();
      refreshPushState();
    }
  }, [authUser?.id]);

  async function signOut() {
    await logout();
    setAuthUser(null);
    setData(null);
    setRoute("dashboard");
    window.history.pushState(null, "", "/login");
    setPath("/login");
  }

  async function refreshHealth() {
    setHealthError(null);
    try {
      setHealth(await getApiHealth());
    } catch (err) {
      setHealth(null);
      setHealthError(err instanceof Error ? err.message : "Could not reach API health.");
    }
  }

  async function refreshData() {
    setRefreshing(true);
    setLoadError(null);
    try {
      setData(await getBootstrap());
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Could not load app data.");
    } finally {
      setRefreshing(false);
    }
  }

  async function refreshPushState() {
    setPushState((current) => ({ ...current, serviceWorkerStatus: "checking", pushConfigStatus: "checking", subscriptionStatus: "checking", error: null }));
    setPushState(await inspectPushState());
  }

  async function refreshSubscriptions(userId = currentUser?.id) {
    if (!userId) return;
    setSubscriptionsError(null);
    try {
      setSubscriptions(await getPushSubscriptions(userId, deviceInfo.id));
    } catch (err) {
      setSubscriptions([]);
      setSubscriptionsError(err instanceof Error ? err.message : "Could not load push subscriptions.");
    }
  }

  const currentUser = useMemo(() => {
    if (authUser?.role === "owner" && data) {
      return data.users.find((user) => user.id === personaUserIds[persona]) ?? authUser;
    }
    if (authUser && data) return data.users.find((user) => user.id === authUser.id) ?? authUser;
    if (authUser) return authUser;
    return null;
  }, [authUser, data, persona]);

  const isStaffView = currentUser?.role === "staff";
  const nav = isStaffView ? staffNav : adminNav;
  const canUseOwnerTesting = authUser?.role === "owner";

  useEffect(() => {
    if (authUser && currentUser) {
      refreshSubscriptions(currentUser.id);
    }
  }, [authUser?.id, currentUser?.id]);

  useEffect(() => {
    if (!currentUser) return;
    if (currentUser.role === "staff" && !staffNav.some((item) => item.id === route)) {
      setRoute("my-dashboard");
    }
    if (currentUser.role !== "staff" && !adminNav.some((item) => item.id === route)) {
      setRoute("dashboard");
    }
  }, [currentUser?.role, route]);

  function updateAvailabilityRequest(updated: AvailabilityRequest) {
    if (!data) return;
    setData({
      ...data,
      availabilityRequests: data.availabilityRequests.map((request) => (request.id === updated.id ? updated : request)),
    });
  }

  async function enableNotifications() {
    if (!currentUser) return;
    setPushBusy(true);
    setTestPushResult(null);
    setTestPushError(null);
    setPushState((current) => ({ ...current, message: null, error: null }));
    try {
      await enablePushForUser(currentUser.id, deviceInfo, pushState.pushConfig);
      const next = await inspectPushState();
      setPushState({ ...next, message: `Notifications enabled for ${currentUser.display_name}.`, error: null });
      await refreshSubscriptions(currentUser.id);
    } catch (err) {
      setPushState((current) => ({ ...current, error: err instanceof Error ? err.message : "Could not enable notifications.", message: null }));
    } finally {
      setPushBusy(false);
    }
  }

  async function disableNotifications() {
    setPushBusy(true);
    setTestPushResult(null);
    setTestPushError(null);
    setPushState((current) => ({ ...current, message: null, error: null }));
    try {
      await disableCurrentPush(deviceInfo);
      const next = await inspectPushState();
      setPushState({ ...next, message: "Notifications disabled for this browser.", error: null });
      if (currentUser) await refreshSubscriptions(currentUser.id);
    } catch (err) {
      setPushState((current) => ({ ...current, error: err instanceof Error ? err.message : "Could not disable notifications.", message: null }));
    } finally {
      setPushBusy(false);
    }
  }

  async function sendTestNotification(target: "current-device" | "all-user-devices", mode: "empty" | "payload" | "fetch") {
    if (!currentUser) return;
    setTestPushBusy(true);
    setTestPushResult(null);
    setTestPushError(null);

    try {
      setTestPushResult(await sendTestPushNotification({ userId: currentUser.id, target, deviceId: deviceInfo.id, mode }));
      await refreshSubscriptions(currentUser.id);
    } catch (err) {
      setTestPushError(err instanceof Error ? err.message : "Could not send test notification.");
    } finally {
      setTestPushBusy(false);
    }
  }

  async function showLocalNotification() {
    setLocalNotificationMessage(null);
    setLocalNotificationError(null);

    try {
      await showLocalTestNotification();
      setLocalNotificationMessage("Local notification requested for this device.");
    } catch (err) {
      setLocalNotificationError(err instanceof Error ? err.message : "Could not show local notification.");
    }
  }

  if (path.startsWith("/invite/")) {
    return <InviteSetupScreen token={decodeURIComponent(path.replace("/invite/", ""))} onComplete={() => setPath("/login")} />;
  }

  if (path === "/login" && (!authChecked || !authUser)) {
    return <LoginScreen onLoggedIn={(user) => {
      setAuthUser(user);
      window.history.pushState(null, "", "/");
      setPath("/");
      setRoute(user.role === "staff" ? "my-dashboard" : "dashboard");
    }} />;
  }

  if (!authChecked) {
    return <LoadingState />;
  }

  if (authUser && path === "/login") {
    window.history.replaceState(null, "", "/");
    setPath("/");
  }

  if (!authUser) {
    if (path !== "/login") {
      window.history.replaceState(null, "", "/login");
      setPath("/login");
    }
    return <LoginScreen onLoggedIn={(user) => {
      setAuthUser(user);
      window.history.pushState(null, "", "/");
      setPath("/");
      setRoute(user.role === "staff" ? "my-dashboard" : "dashboard");
    }} />;
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
            <span className="eyebrow">{appVersion}</span>
            <strong>{currentUser ? `${currentUser.display_name} / ${currentUser.role}` : "Loading"}</strong>
          </div>
          <label className="persona-switcher">
            {canUseOwnerTesting ? (
              <>
                <span>Owner Testing</span>
                <select value={persona} onChange={(event) => setPersona(event.target.value as PersonaKey)}>
                  <option value="admin">View as Glenn / Owner</option>
                  <option value="manager">View as Admin</option>
                  <option value="staff">View as Staff</option>
                </select>
                <button className="secondary-button compact-button" onClick={signOut} type="button">Sign out</button>
              </>
            ) : (
              <>
                <span>Signed in</span>
                <button className="secondary-button compact-button" onClick={signOut} type="button">Sign out</button>
              </>
            )}
          </label>
        </header>
        <main className="content">
          {loadError ? <div className="notice error">{loadError}</div> : null}
          {refreshing && data ? <div className="notice info">Refreshing data...</div> : null}
          {data && currentUser ? renderRoute(route, data, currentUser, authUser, updateAvailabilityRequest, refreshData, health, healthError, pushState, pushBusy, enableNotifications, disableNotifications, deviceInfo, subscriptions, subscriptionsError, testPushBusy, testPushResult, testPushError, sendTestNotification, localNotificationMessage, localNotificationError, showLocalNotification, setRoute) : <LoadingState />}
        </main>
        <nav className="mobile-nav" aria-label="Mobile primary">
          {nav.map((item) => {
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
  authUser: User,
  updateAvailabilityRequest: (request: AvailabilityRequest) => void,
  refreshData: () => Promise<void>,
  health: ApiHealth | null,
  healthError: string | null,
  pushState: PushUiState,
  pushBusy: boolean,
  enableNotifications: () => Promise<void>,
  disableNotifications: () => Promise<void>,
  deviceInfo: ClientDeviceInfo,
  subscriptions: PushSubscriptionInfo[],
  subscriptionsError: string | null,
  testPushBusy: boolean,
  testPushResult: TestPushSummary | null,
  testPushError: string | null,
  sendTestNotification: (target: "current-device" | "all-user-devices", mode: "empty" | "payload" | "fetch") => Promise<void>,
  localNotificationMessage: string | null,
  localNotificationError: string | null,
  showLocalNotification: () => Promise<void>,
  setRoute: (route: AppRoute) => void
) {
  const currentRole = currentUser.role;
  if (currentRole === "staff" && !staffNav.some((item) => item.id === route)) {
    return <AccessDenied onHome={() => setRoute("my-dashboard")} />;
  }
  if (currentRole !== "staff" && !adminNav.some((item) => item.id === route)) {
    return <AccessDenied onHome={() => setRoute("dashboard")} />;
  }

  switch (route) {
    case "dashboard":
      return <AdminDashboardScreen events={data.events} requests={data.availabilityRequests} users={data.users} activity={data.activity} />;
    case "staff":
      return <StaffListScreen users={data.users} locations={data.locations} currentUser={currentUser} onRefresh={refreshData} />;
    case "locations":
      return <LocationsScreen locations={data.locations} currentUser={currentUser} onRefresh={refreshData} />;
    case "events":
      return <EventsScreen events={data.events} locations={data.locations} currentUser={currentUser} onRefresh={refreshData} />;
    case "availability":
      return <AvailabilityScreen requests={data.availabilityRequests} users={data.users} events={data.events} currentUser={currentUser} onRefresh={refreshData} />;
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
        <SettingsScreen
          appVersion={appVersion}
          bootstrapLoaded={true}
          currentUser={currentUser}
          data={data}
          health={health}
          healthError={healthError}
          appEnvironment={getAppEnvironment(window.location.hostname)}
          authUser={authUser}
          pushState={pushState}
          pushBusy={pushBusy}
          onEnableNotifications={enableNotifications}
          onDisableNotifications={disableNotifications}
          deviceInfo={deviceInfo}
          subscriptions={subscriptions}
          subscriptionsError={subscriptionsError}
          testPushBusy={testPushBusy}
          testPushResult={testPushResult}
          testPushError={testPushError}
          onSendTestNotification={sendTestNotification}
          localNotificationMessage={localNotificationMessage}
          localNotificationError={localNotificationError}
          onShowLocalNotification={showLocalNotification}
        />
      );
    case "my-dashboard":
      return <MyDashboardScreen currentUser={currentUser} events={data.events} requests={data.availabilityRequests} onNavigate={setRoute} />;
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

function getAppEnvironment(hostname: string): "local/dev" | "preview" | "production" {
  if (isLocalHost(hostname)) return "local/dev";
  if (hostname.endsWith(".pages.dev") && hostname !== "sideline-ops.pages.dev") return "preview";
  return "production";
}

function LoadingState() {
  return (
    <section className="panel">
      <h1>Loading Sideline Ops</h1>
      <p className="muted">Preparing the operations shell.</p>
    </section>
  );
}

function AccessDenied({ onHome }: { onHome: () => void }) {
  return (
    <section className="panel">
      <h1>Access denied</h1>
      <p className="muted">Your account does not have access to that area.</p>
      <button className="primary-button" onClick={onHome} type="button">Go to dashboard</button>
    </section>
  );
}
