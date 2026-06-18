import { EmptyState } from "../../components/EmptyState";
import { SectionHeader } from "../../components/SectionHeader";
import { StatusPill } from "../../components/StatusPill";
import type { ClientDeviceInfo } from "../../lib/device";
import { formatDateTime } from "../../lib/format";
import type { PushUiState } from "../../lib/push";
import type { ApiHealth, BootstrapData, PushSubscriptionInfo, TestPushSummary, User } from "../../lib/types";

type SettingsScreenProps = {
  appVersion: string;
  bootstrapLoaded: boolean;
  currentUser: User;
  data: BootstrapData;
  health: ApiHealth | null;
  healthError: string | null;
  accessGrantedAt: string | null;
  appEnvironment: "local/dev" | "preview" | "production";
  onLockApp: () => void;
  pushState: PushUiState;
  pushBusy: boolean;
  onEnableNotifications: () => Promise<void>;
  onDisableNotifications: () => Promise<void>;
  deviceInfo: ClientDeviceInfo;
  subscriptions: PushSubscriptionInfo[];
  subscriptionsError: string | null;
  testPushBusy: boolean;
  testPushResult: TestPushSummary | null;
  testPushError: string | null;
  onSendTestNotification: (target: "current-device" | "all-user-devices") => Promise<void>;
  localNotificationMessage: string | null;
  localNotificationError: string | null;
  onShowLocalNotification: () => Promise<void>;
};

const futureItems = ["Push notifications", "Auth", "Integrations", "SMS fallback"];

export function SettingsScreen({
  appVersion,
  bootstrapLoaded,
  currentUser,
  data,
  health,
  healthError,
  accessGrantedAt,
  appEnvironment,
  onLockApp,
  pushState,
  pushBusy,
  onEnableNotifications,
  onDisableNotifications,
  deviceInfo,
  subscriptions,
  subscriptionsError,
  testPushBusy,
  testPushResult,
  testPushError,
  onSendTestNotification,
  localNotificationMessage,
  localNotificationError,
  onShowLocalNotification,
}: SettingsScreenProps) {
  const pushUnavailableReason = getPushUnavailableReason(pushState);
  const canEnablePush = !pushBusy && !pushUnavailableReason && pushState.subscriptionStatus !== "subscribed";
  const canDisablePush = !pushBusy && pushState.subscriptionStatus === "subscribed";
  const activeSubscriptions = subscriptions.filter((subscription) => subscription.is_active === 1);
  const currentDeviceSubscriptions = activeSubscriptions.filter((subscription) => subscription.is_current_device);
  const canSendCurrentDevicePush = !testPushBusy && currentDeviceSubscriptions.length > 0;
  const canSendAllDevicePush = !testPushBusy && activeSubscriptions.length > 0;

  return (
    <>
      <SectionHeader title="Settings" eyebrow="Admin" />
      <div className="settings-grid">
        <section className="panel">
          <h2>Deployment status</h2>
          <div className="status-list">
            <StatusRow label="API health" value={health?.ok ? "Online" : healthError ? "Error" : "Checking"} tone={health?.ok ? "online" : healthError ? "error" : "checking"} />
            <StatusRow label="Database/bootstrap" value={bootstrapLoaded ? "Loaded" : "Not loaded"} tone={bootstrapLoaded ? "loaded" : "not-loaded"} />
            <StatusRow label="App build" value={appVersion} tone="open" />
            <StatusRow label="Environment" value={appEnvironment} tone={appEnvironment === "production" ? "production" : appEnvironment === "preview" ? "preview" : "local-dev"} />
          </div>
          {health ? <p className="muted">Last health check: {formatDateTime(health.checked_at)}</p> : null}
          {healthError ? <div className="notice error">{healthError}</div> : null}
        </section>

        <section className="panel">
          <h2>Preview access</h2>
          <div className="status-list">
            <StatusRow label="Access gate" value="Granted" tone="loaded" />
            <StatusRow label="Granted at" value={accessGrantedAt ? formatDateTime(accessGrantedAt) : "Unknown"} tone="open" />
          </div>
          <p className="muted">This is a temporary preview gate, not real staff authentication. The demo persona switcher is still available after access is granted.</p>
          <button className="secondary-button" onClick={onLockApp} type="button">Lock app</button>
        </section>

        <section className="panel push-diagnostics-panel">
          <h2>This device</h2>
          <div className="status-list">
            <StatusRow label="Device label" value={deviceInfo.label} tone="open" />
            <StatusRow label="Device id" value={deviceInfo.shortId} tone="open" />
            <StatusRow label="Browser permission" value={pushState.notificationPermission} tone={permissionTone(pushState.notificationPermission)} />
            <StatusRow label="Service worker support" value={pushState.serviceWorkerSupported ? "Yes" : "No" } tone={pushState.serviceWorkerSupported ? "loaded" : "not-loaded"} />
            <StatusRow label="Service worker" value={pushState.serviceWorkerStatus} tone={statusTone(pushState.serviceWorkerStatus)} />
            <StatusRow label="This device push" value={pushState.subscriptionStatus} tone={statusTone(pushState.subscriptionStatus)} />
            <StatusRow label="Push config" value={pushState.pushConfigStatus === "available" ? "Available" : pushState.pushConfigStatus === "missing" ? "Push config missing" : pushState.pushConfigStatus} tone={statusTone(pushState.pushConfigStatus)} />
          </div>
          <p className="muted">Push subscriptions are per browser/device. This status only describes the browser or installed PWA you are using right now.</p>
          {pushUnavailableReason ? <div className="notice info">{pushUnavailableReason}</div> : null}
          {pushState.message ? <div className="notice success">{pushState.message}</div> : null}
          {pushState.error ? <div className="notice error">{pushState.error}</div> : null}
          <div className="button-row">
            <button className="primary-button" disabled={!canEnablePush} onClick={onEnableNotifications} type="button">
              {pushBusy ? "Working" : "Enable notifications"}
            </button>
            <button className="secondary-button" disabled={!canDisablePush} onClick={onDisableNotifications} type="button">
              Disable notifications
            </button>
          </div>
          <button className="secondary-button local-test-button" onClick={onShowLocalNotification} type="button">Show local test notification</button>
          {localNotificationMessage ? <div className="notice success">{localNotificationMessage}</div> : null}
          {localNotificationError ? <div className="notice error">{localNotificationError}</div> : null}
        </section>

        <section className="panel push-diagnostics-panel">
          <h2>Selected persona devices</h2>
          <div className="summary-block">
            <strong>{currentUser.display_name}</strong>
            <span>{currentUser.email ?? "No email set"}</span>
            <StatusPill status={currentUser.role} />
          </div>
          <div className="status-list">
            <StatusRow label="Active devices" value={String(activeSubscriptions.length)} tone={activeSubscriptions.length > 0 ? "loaded" : "not-loaded"} />
            <StatusRow label="Current device active" value={currentDeviceSubscriptions.length > 0 ? "Yes" : "No"} tone={currentDeviceSubscriptions.length > 0 ? "loaded" : "not-loaded"} />
          </div>
          {subscriptionsError ? <div className="notice error">{subscriptionsError}</div> : null}
          {subscriptions.length === 0 ? (
            <EmptyState title="No subscribed devices yet" message="Enable notifications on a browser or installed PWA while this persona is selected." />
          ) : (
            <div className="device-list">
              {subscriptions.map((subscription) => (
                <article key={subscription.id} className={subscription.is_current_device ? "current-device" : ""}>
                  <div>
                    <strong>{subscription.device_label ?? "Unknown device"}</strong>
                    <span>{subscription.endpoint_host}</span>
                  </div>
                  <div className="device-meta">
                    {subscription.is_current_device ? <span className="status-pill status-loaded">Current device</span> : null}
                    <span className={`status-pill ${subscription.is_active ? "status-loaded" : "status-not-loaded"}`}>{subscription.is_active ? "active" : "inactive"}</span>
                    <span>{subscription.last_seen_at ? `Seen ${formatDateTime(subscription.last_seen_at)}` : `Updated ${formatDateTime(subscription.updated_at)}`}</span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="panel push-diagnostics-panel">
          <h2>Test push</h2>
          <p className="muted">Send a manual server push to the current device only or every active device for the selected persona. Operational alerts are still out of scope.</p>
          {pushState.pushConfig?.testPushEnabled === false ? (
            <div className="notice info">Server sending also requires VAPID_PRIVATE_KEY and VAPID_SUBJECT.</div>
          ) : null}
          {currentDeviceSubscriptions.length === 0 ? <div className="notice info">Subscribe this device before sending a current-device test.</div> : null}
          <div className="button-row">
            <button className="secondary-button" disabled={!canSendCurrentDevicePush} onClick={() => onSendTestNotification("current-device")} type="button">
              {testPushBusy ? "Sending" : "Send test push to current device only"}
            </button>
            <button className="secondary-button" disabled={!canSendAllDevicePush} onClick={() => onSendTestNotification("all-user-devices")} type="button">
              {testPushBusy ? "Sending" : "Send test push to all devices for this user"}
            </button>
          </div>
          {testPushResult ? <TestPushResultSummary result={testPushResult} /> : null}
          {testPushError ? <div className="notice error">{testPushError}</div> : null}
          <div className="troubleshooting-list">
            <p>On iPhone, subscribe from the Home Screen installed app.</p>
            <p>If local test works but server push does not, check VAPID, delivery, and subscription targeting.</p>
            <p>If local test fails, check permission, PWA install mode, and service worker registration.</p>
            <p>If the wrong device receives the push, check the selected persona and device list.</p>
          </div>
        </section>

        <section className="panel">
          <h2>Current persona</h2>
          <div className="summary-block">
            <strong>{currentUser.display_name}</strong>
            <span>{currentUser.email ?? "No email set"}</span>
            <StatusPill status={currentUser.role} />
          </div>
          <p className="muted">Temporary persona switching is for demo and workflow testing only. Real authentication is intentionally out of scope for this milestone.</p>
        </section>

        <section className="panel">
          <h2>Data snapshot</h2>
          <div className="compact-stats">
            <span>{data.users.length} users</span>
            <span>{data.locations.length} locations</span>
            <span>{data.events.length} events</span>
            <span>{data.availabilityRequests.length} availability requests</span>
          </div>
        </section>

        <section className="panel">
          <h2>Future setup</h2>
          <div className="future-list">
            {futureItems.map((item) => (
              <article key={item}>
                <strong>{item}</strong>
                <span>Planned for a later milestone.</span>
              </article>
            ))}
          </div>
        </section>

        <section className="panel">
          <h2>Local development</h2>
          <EmptyState
            title="Reset stays in the README"
            message="Local database reset is documented as a command-line workflow so the app never exposes a destructive data button."
          />
        </section>
      </div>
    </>
  );
}

function TestPushResultSummary({ result }: { result: TestPushSummary }) {
  return (
    <div className={result.failed > 0 ? "notice info" : "notice success"}>
      <strong>Test push {result.target ?? "manual"}:</strong> attempted {result.attempted}, sent {result.sent}, failed {result.failed}, devices attempted {result.devicesAttempted ?? 0}.
      {result.results.length > 0 ? (
        <div className="test-result-list">
          {result.results.map((item) => (
            <span key={item.id}>
              {item.device_label ?? "Unknown device"} ({item.device_id_short ?? "no id"}, {item.endpoint_host}) - {item.ok ? "sent" : "failed"}
              {item.status ? ` ${item.status}` : ""}
              {item.marked_inactive ? " marked inactive" : ""}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function StatusRow({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="status-row">
      <span>{label}</span>
      <span className={`status-pill status-${tone}`}>{value}</span>
    </div>
  );
}

function getPushUnavailableReason(state: PushUiState) {
  if (!state.serviceWorkerSupported) return "Service workers are not supported in this browser.";
  if (!state.pushSupported) return "Push subscriptions are not supported in this browser.";
  if (state.notificationPermission === "denied") return "Notifications are blocked for this site in the browser settings.";
  if (state.pushConfigStatus === "missing") return "Push config missing. Set VAPID_PUBLIC_KEY to enable subscription capture.";
  if (state.pushConfigStatus === "error") return "Could not load push configuration.";
  if (state.serviceWorkerStatus === "error") return "Service worker registration failed.";
  return null;
}

function permissionTone(permission: PushUiState["notificationPermission"]) {
  if (permission === "granted") return "loaded";
  if (permission === "denied") return "error";
  if (permission === "unsupported") return "not-loaded";
  return "checking";
}

function statusTone(status: string) {
  if (["registered", "subscribed", "available"].includes(status)) return "loaded";
  if (["error", "unavailable", "unsupported", "denied"].includes(status)) return "error";
  if (["missing", "not-subscribed", "not-loaded"].includes(status)) return "not-loaded";
  return "checking";
}
