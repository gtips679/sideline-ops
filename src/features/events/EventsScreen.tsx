import { useState } from "react";
import type { FormEvent } from "react";
import { DataTable } from "../../components/DataTable";
import { SectionHeader } from "../../components/SectionHeader";
import { StatusPill } from "../../components/StatusPill";
import { createEvent } from "../../lib/api";
import { formatDateTime, titleCase } from "../../lib/format";
import type { Event, Location, User } from "../../lib/types";

type EventsScreenProps = {
  events: Event[];
  locations: Location[];
  currentUser: User;
  onRefresh: () => Promise<void>;
};

export function EventsScreen({ events, locations, currentUser, onRefresh }: EventsScreenProps) {
  const [form, setForm] = useState({
    location_id: locations[0]?.id ?? "",
    title: "",
    event_type: "",
    starts_at: "",
    ends_at: "",
    expected_crowd: "",
    notes: "",
    status: "scheduled",
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    if (!form.location_id || !form.title.trim() || !form.event_type.trim() || !form.starts_at || !form.ends_at) {
      setError("Location, title, type, start, and end are required.");
      return;
    }
    if (new Date(form.ends_at) <= new Date(form.starts_at)) {
      setError("End time must be after start time.");
      return;
    }
    setSaving(true);
    try {
      await createEvent({
        ...form,
        starts_at: new Date(form.starts_at).toISOString(),
        ends_at: new Date(form.ends_at).toISOString(),
        expected_crowd: form.expected_crowd ? Number(form.expected_crowd) : null,
        actor_user_id: currentUser.id,
      });
      setForm({ ...form, title: "", event_type: "", starts_at: "", ends_at: "", expected_crowd: "", notes: "" });
      setMessage("Event saved.");
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save event.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <SectionHeader title="Events" eyebrow="Admin" />
      <section className="panel">
        <h2>Add event</h2>
        <form className="form-grid" onSubmit={submit}>
          <label>
            <span>Location</span>
            <select value={form.location_id} onChange={(event) => setForm({ ...form, location_id: event.target.value })}>
              {locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
            </select>
          </label>
          <label>
            <span>Title</span>
            <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
          </label>
          <label>
            <span>Event type</span>
            <input value={form.event_type} onChange={(event) => setForm({ ...form, event_type: event.target.value })} />
          </label>
          <label>
            <span>Status</span>
            <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
              <option value="scheduled">Scheduled</option>
              <option value="planning">Planning</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </label>
          <label>
            <span>Starts at</span>
            <input type="datetime-local" value={form.starts_at} onChange={(event) => setForm({ ...form, starts_at: event.target.value })} />
          </label>
          <label>
            <span>Ends at</span>
            <input type="datetime-local" value={form.ends_at} onChange={(event) => setForm({ ...form, ends_at: event.target.value })} />
          </label>
          <label>
            <span>Expected crowd</span>
            <input min="0" type="number" value={form.expected_crowd} onChange={(event) => setForm({ ...form, expected_crowd: event.target.value })} />
          </label>
          <label className="wide-field">
            <span>Notes</span>
            <textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
          </label>
          <div className="form-actions">
            <button className="primary-button" disabled={saving || locations.length === 0} type="submit">{saving ? "Saving" : "Save event"}</button>
          </div>
        </form>
        {message ? <div className="notice success">{message}</div> : null}
        {error ? <div className="notice error">{error}</div> : null}
      </section>
      <section className="panel">
        <DataTable
          rows={events}
          getRowKey={(event) => event.id}
          columns={[
            { header: "Event", render: (event) => <strong>{event.title}</strong> },
            { header: "Location", render: (event) => event.location_name ?? event.location_id },
            { header: "Type", render: (event) => titleCase(event.event_type) },
            { header: "Starts", render: (event) => formatDateTime(event.starts_at) },
            { header: "Crowd", render: (event) => event.expected_crowd ?? "Not set" },
            { header: "Status", render: (event) => <StatusPill status={event.status} /> },
          ]}
        />
      </section>
    </>
  );
}
