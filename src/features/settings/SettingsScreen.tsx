import { EmptyState } from "../../components/EmptyState";
import { SectionHeader } from "../../components/SectionHeader";
import { StatusPill } from "../../components/StatusPill";
import { formatDateTime } from "../../lib/format";
import type { PushUiState } from "../../lib/push";
import type { ApiHealth, BootstrapData, TestPushSummary, User } from "../../lib/types";

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
  testPushBusy: boolean;
  testPushResult: TestPushSummary | null;
  testPushError: string | null;
  onSendTestNotification: () => Promise<void>;
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
  testPushBusy,
  testPushResult,
  testPushError,
  onSendTestNotification,
}: SettingsScreenProps) {
  const pushUnavailableReason = getPushUnavailableReason(pushState);
  const canEnablePush = !pushBusy && !pushUnavailableReason && pushState.subscriptionStatus !== "subscribed";
  const canDisablePush = !pushBusy && pushState.subscriptionStatus === "subscribed";
  const canSendTestPush = !testPushBusy && pushState.subscriptionStatus === "subscribed";

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

        <section className="panel">
          <h2>Push notifications</h2>
          <div className="status-list">
            <StatusRow label="Browser permission" value={pushState.notificationPermission} tone={permissionTone(pushState.notificationPermission)} />
            <StatusRow label="Service worker support" value={pushState.serviceWorkerSupported ? "Yes" : "No" } tone={pushState.serviceWorkerSupported ? "loaded" : "not-loaded"} />
            <StatusRow label="Service worker" value={pushState.serviceWorkerStatus} tone={statusTone(pushState.serviceWorkerStatus)} />
            <StatusRow label="Push subscription" value={pushState.subscriptionStatus} tone={statusTone(pushState.subscriptionStatus)} />
            <StatusRow label="Push config" value={pushState.pushConfigStatus === "available" ? "Available" : pushState.pushConfigStatus === "missing" ? "Push config missing" : pushState.pushConfigStatus} tone={statusTone(pushState.pushConfigStatus)} />
          </div>
          <p className="muted">Milestone 1.1 can send a manual test notification to the current persona. Operational push alerts are still out of scope.</p>
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
          <div className="test-push-box">
            <strong>Manual test push</strong>
            {pushState.subscriptionStatus === "subscribed" ? (
              <span>Send a test notification to active subscriptions for {currentUser.display_name}.</span>
            ) : (
              <span>Subscribe first.</span>
            )}
            {pushState.pushConfig?.testPushEnabled === false ? (
              <span className="muted">Server sending also requires VAPID_PRIVATE_KEY and VAPID_SUBJECT.</span>
            ) : null}
            <button className="secondary-button" disabled={!canSendTestPush} onClick={onSendTestNotification} type="button">
              {testPushBusy ? "Sending" : "Send test notification to this device/user"}
            </button>
          </div>
          {testPushResult ? (
            <div className={testPushResult.failed > 0 ? "notice info" : "notice success"}>
              Test push attempted {testPushResult.attempted}, sent {testPushResult.sent}, failed {testPushResult.failed}.
            </div>
          ) : null}
          {testPushError ? <div className="notice error">{testPushError}</div> : null}
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
