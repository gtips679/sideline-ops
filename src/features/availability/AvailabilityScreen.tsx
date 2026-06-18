import { useState } from "react";
import type { FormEvent } from "react";
import { EmptyState } from "../../components/EmptyState";
import { MetricCard } from "../../components/MetricCard";
import { SectionHeader } from "../../components/SectionHeader";
import { StatusPill } from "../../components/StatusPill";
import { createAvailabilityRequest } from "../../lib/api";
import { formatDateTime } from "../../lib/format";
import type { AvailabilityRequest, Event, User } from "../../lib/types";
import { getResponseCounts, getResponseGroups } from "./availabilityUtils";

type AvailabilityScreenProps = {
  requests: AvailabilityRequest[];
  users: User[];
  events: Event[];
  currentUser: User;
  onRefresh: () => Promise<void>;
};

export function AvailabilityScreen({ requests, users, events, currentUser, onRefresh }: AvailabilityScreenProps) {
  const staff = users.filter((user) => user.role === "staff" && user.is_active);
  const [recipientMode, setRecipientMode] = useState<"all_active_staff" | "selected">("all_active_staff");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [form, setForm] = useState({
    event_id: events[0]?.id ?? "",
    title: "",
    message: "",
    response_deadline: "",
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    if (!form.event_id || !form.title.trim()) {
      setError("Event and title are required.");
      return;
    }
    if (recipientMode === "selected" && selectedUserIds.length === 0) {
      setError("Select at least one staff recipient.");
      return;
    }
    setSaving(true);
    try {
      await createAvailabilityRequest({
        ...form,
        response_deadline: form.response_deadline ? new Date(form.response_deadline).toISOString() : "",
        recipient_mode: recipientMode === "all_active_staff" ? "all_active_staff" : undefined,
        recipient_user_ids: recipientMode === "selected" ? selectedUserIds : undefined,
        created_by_user_id: currentUser.id,
      });
      setForm({ ...form, title: "", message: "", response_deadline: "" });
      setSelectedUserIds([]);
      setMessage("Availability request saved.");
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save availability request.");
    } finally {
      setSaving(false);
    }
  }

  function toggleUser(userId: string) {
    setSelectedUserIds((current) => (current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId]));
  }

  return (
    <>
      <SectionHeader title="Availability" eyebrow="Admin" />
      <section className="panel">
        <h2>Create availability request</h2>
        <form className="form-grid" onSubmit={submit}>
          <label>
            <span>Event</span>
            <select value={form.event_id} onChange={(event) => setForm({ ...form, event_id: event.target.value })}>
              {events.map((event) => <option key={event.id} value={event.id}>{event.title}</option>)}
            </select>
          </label>
          <label>
            <span>Title</span>
            <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
          </label>
          <label>
            <span>Response deadline</span>
            <input type="datetime-local" value={form.response_deadline} onChange={(event) => setForm({ ...form, response_deadline: event.target.value })} />
          </label>
          <label className="wide-field">
            <span>Message</span>
            <textarea value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} />
          </label>
          <fieldset className="wide-field fieldset">
            <legend>Recipients</legend>
            <label className="radio-field">
              <input type="radio" checked={recipientMode === "all_active_staff"} onChange={() => setRecipientMode("all_active_staff")} />
              <span>All active staff</span>
            </label>
            <label className="radio-field">
              <input type="radio" checked={recipientMode === "selected"} onChange={() => setRecipientMode("selected")} />
              <span>Selected individual users</span>
            </label>
            {recipientMode === "selected" ? (
              <div className="recipient-picker">
                {staff.length === 0 ? (
                  <EmptyState title="No active staff" message="Add active staff before creating selected-recipient requests." />
                ) : (
                  staff.map((user) => (
                    <label className="checkbox-field" key={user.id}>
                      <input type="checkbox" checked={selectedUserIds.includes(user.id)} onChange={() => toggleUser(user.id)} />
                      <span>{user.display_name}</span>
                    </label>
                  ))
                )}
              </div>
            ) : null}
          </fieldset>
          <div className="form-actions">
            <button className="primary-button" disabled={saving || events.length === 0} type="submit">{saving ? "Saving" : "Save request"}</button>
          </div>
        </form>
        {message ? <div className="notice success">{message}</div> : null}
        {error ? <div className="notice error">{error}</div> : null}
      </section>
      <div className="stack">
        {requests.length === 0 ? (
          <section className="panel">
            <EmptyState title="No availability requests yet" message="Create a request above to ask targeted staff who can work." />
          </section>
        ) : null}
        {requests.map((request) => {
          const counts = getResponseCounts(request);
          const groups = getResponseGroups(request);
          return (
            <section className="panel" key={request.id}>
              <div className="panel-header">
                <div>
                  <h2>{request.title}</h2>
                  <p>{request.event_title} · {request.location_name} · {formatDateTime(request.starts_at)}</p>
                  <small>Deadline: {formatDateTime(request.response_deadline)}</small>
                </div>
                <StatusPill status={request.status} />
              </div>
              <div className="metric-grid four">
                <MetricCard label="Yes" value={counts.yes} />
                <MetricCard label="No" value={counts.no} />
                <MetricCard label="Maybe" value={counts.maybe} />
                <MetricCard label="No response" value={counts.noResponse} />
              </div>
              <div className="response-group-grid">
                {[
                  ["Yes", groups.yes],
                  ["No", groups.no],
                  ["Maybe", groups.maybe],
                  ["No response", groups.noResponse],
                ].map(([label, recipients]) => (
                  <article className="response-group" key={label as string}>
                    <h3>{label as string}</h3>
                    {(recipients as typeof groups.yes).length > 0 ? (
                      <ul>
                        {(recipients as typeof groups.yes).map((recipient) => (
                          <li key={recipient.user_id}>{recipient.display_name ?? recipient.user_id}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="muted">None</p>
                    )}
                  </article>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
