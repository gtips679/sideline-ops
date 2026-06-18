import { useEffect, useMemo, useState } from "react";
import { PlaceholderPanel } from "../components/PlaceholderPanel";
import { SectionHeader } from "../components/SectionHeader";
import { getApiHealth, getBootstrap, getPushSubscriptions, sendTestPushNotification } from "../lib/api";
import { getClientDeviceInfo, type ClientDeviceInfo } from "../lib/device";
import { disableCurrentPush, enablePushForUser, initialPushUiState, inspectPushState, showLocalTestNotification, type PushUiState } from "../lib/push";
import type { ApiHealth, AvailabilityRequest, BootstrapData, PersonaKey, PushSubscriptionInfo, TestPushSummary, User } from "../lib/types";
import { AvailabilityScreen } from "../features/availability/AvailabilityScreen";
import { StaffRequestsScreen } from "../features/availability/StaffRequestsScreen";
import { ChecklistsPlaceholder } from "../features/checklists/ChecklistsPlaceholder";
import { AdminDashboardScreen } from "../features/events/AdminDashboardScreen";
import { EventsScreen } from "../features/events/EventsScreen";
import { InventoryPlaceholder } from "../features/inventory/InventoryPlaceholder";
import { LocationsScreen } from "../features/locations/LocationsScreen";
import { MessagesPlaceholder } from "../features/messages/MessagesPlaceholder";
import { SettingsScreen } from "../features/settings/SettingsScreen";
import { MyDashboardScreen } from "../features/staff/MyDashboardScreen";
import { StaffListScreen } from "../features/staff/StaffListScreen";
import { AccessGate } from "./AccessGate";
import { clearAccessGrant, getStoredAccess, isLocalHost, storeAccessGrant } from "./access";
import { adminNav, staffNav, type AppRoute } from "./navigation";

const personaUserIds: Record<PersonaKey, string> = {
  admin: "user_glenn",
  manager: "user_manager",
  staff: "user_ava",
};

const appVersion = "1.1.1-dev";

export function App() {
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
  const [accessGranted, setAccessGranted] = useState(() => getStoredAccess().granted);
  const [accessGrantedAt, setAccessGrantedAt] = useState<string | null>(() => getStoredAccess().grantedAt);
  const [persona, setPersona] = useState<PersonaKey>("admin");
  const [route, setRoute] = useState<AppRoute>("dashboard");

  useEffect(() => {
    if (accessGranted) {
      refreshData();
      refreshHealth();
      refreshPushState();
    }
  }, [accessGranted]);

  function grantAccess() {
    const grantedAt = storeAccessGrant();
    setAccessGrantedAt(grantedAt);
    setAccessGranted(true);
  }

  function lockApp() {
    clearAccessGrant();
    setAccessGranted(false);
    setAccessGrantedAt(null);
    setData(null);
    setHealth(null);
    setHealthError(null);
    setRoute("dashboard");
    setPersona("admin");
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
    if (!data) return null;
    return data.users.find((user) => user.id === personaUserIds[persona]) ?? data.users[0] ?? null;
  }, [data, persona]);

  const isStaffView = persona === "staff";
  const nav = isStaffView ? staffNav : adminNav;

  useEffect(() => {
    if (accessGranted && currentUser) {
      refreshSubscriptions(currentUser.id);
    }
  }, [accessGranted, currentUser?.id]);

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

  async function sendTestNotification(target: "current-device" | "all-user-devices") {
    if (!currentUser) return;
    setTestPushBusy(true);
    setTestPushResult(null);
    setTestPushError(null);

    try {
      setTestPushResult(await sendTestPushNotification({ userId: currentUser.id, target, deviceId: deviceInfo.id }));
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

  if (!accessGranted) {
    return <AccessGate onAccessGranted={grantAccess} />;
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
            <span>Persona</span>
            <select value={persona} onChange={(event) => setPersona(event.target.value as PersonaKey)}>
              <option value="admin">Glenn / Admin</option>
              <option value="manager">Manager</option>
              <option value="staff">Staff</option>
            </select>
          </label>
        </header>
        <main className="content">
          {loadError ? <div className="notice error">{loadError}</div> : null}
          {refreshing && data ? <div className="notice info">Refreshing data...</div> : null}
          {data && currentUser ? renderRoute(route, data, currentUser, updateAvailabilityRequest, refreshData, health, healthError, accessGrantedAt, lockApp, pushState, pushBusy, enableNotifications, disableNotifications, deviceInfo, subscriptions, subscriptionsError, testPushBusy, testPushResult, testPushError, sendTestNotification, localNotificationMessage, localNotificationError, showLocalNotification) : <LoadingState />}
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
  updateAvailabilityRequest: (request: AvailabilityRequest) => void,
  refreshData: () => Promise<void>,
  health: ApiHealth | null,
  healthError: string | null,
  accessGrantedAt: string | null,
  lockApp: () => void,
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
  sendTestNotification: (target: "current-device" | "all-user-devices") => Promise<void>,
  localNotificationMessage: string | null,
  localNotificationError: string | null,
  showLocalNotification: () => Promise<void>
) {
  switch (route) {
    case "dashboard":
      return <AdminDashboardScreen events={data.events} requests={data.availabilityRequests} users={data.users} activity={data.activity} />;
    case "staff":
      return <StaffListScreen users={data.users} currentUser={currentUser} onRefresh={refreshData} />;
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
          accessGrantedAt={accessGrantedAt}
          appEnvironment={getAppEnvironment(window.location.hostname)}
          onLockApp={lockApp}
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
