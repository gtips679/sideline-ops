import { useState } from "react";
import type { FormEvent } from "react";
import { DataTable } from "../../components/DataTable";
import { EmptyState } from "../../components/EmptyState";
import { SectionHeader } from "../../components/SectionHeader";
import { createLocation } from "../../lib/api";
import { titleCase } from "../../lib/format";
import type { Location, User } from "../../lib/types";

type LocationsScreenProps = {
  locations: Location[];
  currentUser: User;
  onRefresh: () => Promise<void>;
};

export function LocationsScreen({ locations, currentUser, onRefresh }: LocationsScreenProps) {
  const [form, setForm] = useState({ name: "", location_type: "", notes: "", is_active: true });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    if (!form.name.trim() || !form.location_type.trim()) {
      setError("Name and location type are required.");
      return;
    }
    setSaving(true);
    try {
      await createLocation({ ...form, actor_user_id: currentUser.id });
      setForm({ name: "", location_type: "", notes: "", is_active: true });
      setMessage("Location saved.");
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save location.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <SectionHeader title="Locations" eyebrow="Admin" />
      <section className="panel">
        <h2>Add location</h2>
        <form className="form-grid" onSubmit={submit}>
          <label>
            <span>Name</span>
            <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          </label>
          <label>
            <span>Location type</span>
            <input value={form.location_type} onChange={(event) => setForm({ ...form, location_type: event.target.value })} placeholder="gym, baseball, soccer" />
          </label>
          <label className="wide-field">
            <span>Notes</span>
            <textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
          </label>
          <label className="checkbox-field">
            <input type="checkbox" checked={form.is_active} onChange={(event) => setForm({ ...form, is_active: event.target.checked })} />
            <span>Active</span>
          </label>
          <div className="form-actions">
            <button className="primary-button" disabled={saving} type="submit">{saving ? "Saving" : "Save location"}</button>
          </div>
        </form>
        {message ? <div className="notice success">{message}</div> : null}
        {error ? <div className="notice error">{error}</div> : null}
      </section>
      <section className="panel">
        {locations.length === 0 ? (
          <EmptyState title="No locations yet" message="Add a concession stand, gym, or field location above." />
        ) : (
          <DataTable
            rows={locations}
            getRowKey={(location) => location.id}
            columns={[
              { header: "Location", render: (location) => <strong>{location.name}</strong> },
              { header: "Type", render: (location) => titleCase(location.location_type) },
              { header: "Notes", render: (location) => location.notes ?? "None" },
              { header: "Status", render: (location) => (location.is_active ? "Active" : "Inactive") },
            ]}
          />
        )}
      </section>
    </>
  );
}
