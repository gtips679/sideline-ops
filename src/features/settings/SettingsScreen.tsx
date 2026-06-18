import { EmptyState } from "../../components/EmptyState";
import { SectionHeader } from "../../components/SectionHeader";
import { StatusPill } from "../../components/StatusPill";
import { formatDateTime } from "../../lib/format";
import type { ApiHealth, BootstrapData, User } from "../../lib/types";

type SettingsScreenProps = {
  appVersion: string;
  bootstrapLoaded: boolean;
  currentUser: User;
  data: BootstrapData;
  health: ApiHealth | null;
  healthError: string | null;
  isLocalLike: boolean;
};

const futureItems = ["Push notifications", "Auth", "Integrations", "SMS fallback"];

export function SettingsScreen({
  appVersion,
  bootstrapLoaded,
  currentUser,
  data,
  health,
  healthError,
  isLocalLike,
}: SettingsScreenProps) {
  return (
    <>
      <SectionHeader title="Settings" eyebrow="Admin" />
      <div className="settings-grid">
        <section className="panel">
          <h2>Deployment status</h2>
          <div className="status-list">
            <StatusRow label="API health" value={health?.ok ? "Online" : healthError ? "Error" : "Checking"} tone={health?.ok ? "yes" : healthError ? "no" : "maybe"} />
            <StatusRow label="Database/bootstrap" value={bootstrapLoaded ? "Loaded" : "Not loaded"} tone={bootstrapLoaded ? "yes" : "no"} />
            <StatusRow label="App build" value={appVersion} tone="open" />
            <StatusRow label="Environment" value={isLocalLike ? "Local dev" : "Hosted"} tone={isLocalLike ? "maybe" : "yes"} />
          </div>
          {health ? <p className="muted">Last health check: {formatDateTime(health.checked_at)}</p> : null}
          {healthError ? <div className="notice error">{healthError}</div> : null}
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
      <StatusPill status={tone === "yes" ? value : tone === "no" ? value : tone === "maybe" ? value : value} />
    </div>
  );
}
