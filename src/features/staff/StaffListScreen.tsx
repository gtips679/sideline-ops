import { useState } from "react";
import type { FormEvent } from "react";
import { DataTable } from "../../components/DataTable";
import { EmptyState } from "../../components/EmptyState";
import { SectionHeader } from "../../components/SectionHeader";
import { StatusPill } from "../../components/StatusPill";
import { createUser } from "../../lib/api";
import type { User } from "../../lib/types";

type StaffListScreenProps = {
  users: User[];
  currentUser: User;
  onRefresh: () => Promise<void>;
};

export function StaffListScreen({ users, currentUser, onRefresh }: StaffListScreenProps) {
  const [form, setForm] = useState({ display_name: "", phone: "", email: "", role: "staff", is_active: true });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    if (!form.display_name.trim()) {
      setError("Display name is required.");
      return;
    }
    setSaving(true);
    try {
      await createUser({ ...form, actor_user_id: currentUser.id });
      setForm({ display_name: "", phone: "", email: "", role: "staff", is_active: true });
      setMessage("Staff member saved.");
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save staff member.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <SectionHeader title="Staff" eyebrow="Admin" />
      <section className="panel">
        <h2>Add staff member</h2>
        <form className="form-grid" onSubmit={submit}>
          <label>
            <span>Display name</span>
            <input value={form.display_name} onChange={(event) => setForm({ ...form, display_name: event.target.value })} />
          </label>
          <label>
            <span>Phone</span>
            <input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
          </label>
          <label>
            <span>Email</span>
            <input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
          </label>
          <label>
            <span>Role</span>
            <select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}>
              <option value="admin">Admin</option>
              <option value="manager">Manager</option>
              <option value="staff">Staff</option>
            </select>
          </label>
          <label className="checkbox-field">
            <input type="checkbox" checked={form.is_active} onChange={(event) => setForm({ ...form, is_active: event.target.checked })} />
            <span>Active</span>
          </label>
          <div className="form-actions">
            <button className="primary-button" disabled={saving} type="submit">{saving ? "Saving" : "Save staff"}</button>
          </div>
        </form>
        {message ? <div className="notice success">{message}</div> : null}
        {error ? <div className="notice error">{error}</div> : null}
      </section>
      <section className="panel">
        {users.length === 0 ? (
          <EmptyState title="No staff yet" message="Add the first staff member above to start building the team list." />
        ) : (
          <DataTable
            rows={users}
            getRowKey={(user) => user.id}
            columns={[
              { header: "Name", render: (user) => <strong>{user.display_name}</strong> },
              { header: "Role", render: (user) => <StatusPill status={user.role} /> },
              { header: "Phone", render: (user) => user.phone ?? "Not set" },
              { header: "Email", render: (user) => user.email ?? "Not set" },
              { header: "Status", render: (user) => (user.is_active ? "Active" : "Inactive") },
            ]}
          />
        )}
      </section>
    </>
  );
}
