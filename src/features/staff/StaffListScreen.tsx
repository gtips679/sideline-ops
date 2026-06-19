import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { DataTable } from "../../components/DataTable";
import { EmptyState } from "../../components/EmptyState";
import { SectionHeader } from "../../components/SectionHeader";
import { StatusPill } from "../../components/StatusPill";
import { cleanupInvites, createInvite, listInvites, permanentlyDeleteUser, updateUserProfile, updateUserStatus } from "../../lib/api";
import { formatDateTime } from "../../lib/format";
import type { CreatedInvite, InviteSummary, Location, StaffStatus, User, UserRole } from "../../lib/types";

type StaffListScreenProps = {
  users: User[];
  locations: Location[];
  currentUser: User;
  onRefresh: () => Promise<void>;
};

const skillOptions = ["Register", "Grill", "Fryer", "Runner", "Snow cones", "Can open", "Can close", "Can handle rush", "Needs supervision", "Reliable driver"];
const locationOptions = [
  { value: "preferred", label: "Preferred" },
  { value: "willing", label: "Willing" },
  { value: "cannot", label: "Cannot" },
] as const;
const staffFilters = ["active", "deactivated", "archived", "all"] as const;

export function StaffListScreen({ users, locations, currentUser, onRefresh }: StaffListScreenProps) {
  const [staffFilter, setStaffFilter] = useState<(typeof staffFilters)[number]>("active");
  const manageableUsers = users.filter((user) => user.role !== "manager" && (staffFilter === "all" || staffStatus(user) === staffFilter));
  const [selectedUserId, setSelectedUserId] = useState(manageableUsers[0]?.id ?? "");
  const selectedUser = manageableUsers.find((user) => user.id === selectedUserId) ?? manageableUsers[0] ?? null;
  const [invites, setInvites] = useState<InviteSummary[]>([]);
  const [createdInvite, setCreatedInvite] = useState<CreatedInvite | null>(null);
  const [inviteMessage, setInviteMessage] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [cleanupBusy, setCleanupBusy] = useState<string | null>(null);
  const [form, setForm] = useState(() => profileForm(selectedUser));

  useEffect(() => {
    setForm(profileForm(selectedUser));
    setDeleteConfirmation("");
  }, [selectedUser?.id]);

  useEffect(() => {
    if (selectedUserId && manageableUsers.some((user) => user.id === selectedUserId)) return;
    setSelectedUserId(manageableUsers[0]?.id ?? "");
  }, [staffFilter, users.length]);

  useEffect(() => {
    refreshInvites();
  }, [currentUser.id]);

  async function refreshInvites() {
    try {
      setInvites(await listInvites(currentUser.id));
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : "Could not load invites.");
    }
  }

  async function createStaffInvite() {
    setInviteError(null);
    setInviteMessage(null);
    setCreatedInvite(null);
    try {
      const invite = await createInvite(currentUser.id);
      setCreatedInvite(invite);
      setInviteMessage("Invite link created.");
      await refreshInvites();
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : "Could not create invite.");
    }
  }

  async function copyInvite() {
    if (!createdInvite) return;
    await navigator.clipboard.writeText(createdInvite.invite_url);
    setInviteMessage("Invite link copied.");
  }

  async function runInviteCleanup(mode: "used" | "expired" | "inactive") {
    setInviteError(null);
    setInviteMessage(null);
    setCleanupBusy(mode);
    try {
      const result = await cleanupInvites(mode);
      setInviteMessage(`Invite cleanup removed ${result.deleted} record${result.deleted === 1 ? "" : "s"}.`);
      await refreshInvites();
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : "Could not clean up invites.");
    } finally {
      setCleanupBusy(null);
    }
  }

  async function changeStatus(status: StaffStatus) {
    if (!selectedUser) return;
    setActionBusy(true);
    setProfileError(null);
    setProfileMessage(null);
    try {
      await updateUserStatus(selectedUser.id, status);
      setProfileMessage(`Staff status changed to ${status}.`);
      await onRefresh();
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : "Could not update staff status.");
    } finally {
      setActionBusy(false);
    }
  }

  async function hardDelete() {
    if (!selectedUser) return;
    setActionBusy(true);
    setProfileError(null);
    setProfileMessage(null);
    try {
      await permanentlyDeleteUser(selectedUser.id, deleteConfirmation);
      setProfileMessage("Staff account permanently deleted.");
      setDeleteConfirmation("");
      await onRefresh();
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : "Could not permanently delete staff.");
    } finally {
      setActionBusy(false);
    }
  }

  async function submitProfile(event: FormEvent) {
    event.preventDefault();
    if (!selectedUser) return;
    setSaving(true);
    setProfileError(null);
    setProfileMessage(null);
    try {
      await updateUserProfile(selectedUser.id, {
        ...form,
        actor_user_id: currentUser.id,
        is_active: form.is_active,
        skills: form.skills,
        location_availability: Object.entries(form.locationAvailability).map(([location_id, preference]) => ({ location_id, preference })),
      });
      setProfileMessage("Staff profile saved.");
      await onRefresh();
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : "Could not save staff profile.");
    } finally {
      setSaving(false);
    }
  }

  const roleHelp = currentUser.role === "owner" ? "Owner can change roles." : "Only owner can change roles.";
  const activeStaffCount = useMemo(() => users.filter((user) => user.role === "staff" && staffStatus(user) === "active").length, [users]);
  const canOwnerManage = currentUser.role === "owner";
  const selectedStatus = selectedUser ? staffStatus(selectedUser) : "active";

  return (
    <>
      <SectionHeader title="Staff" eyebrow="Admin" />
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Staff invites</h2>
            <p className="muted">Create a single-use setup link for a new staff account. Invite tokens are only shown when created.</p>
          </div>
          <button className="primary-button" onClick={createStaffInvite} type="button">Create staff invite</button>
        </div>
        {createdInvite ? (
          <div className="copy-box">
            <input readOnly value={createdInvite.invite_url} />
            <button className="secondary-button" onClick={copyInvite} type="button">Copy</button>
          </div>
        ) : null}
        {inviteMessage ? <div className="notice success">{inviteMessage}</div> : null}
        {inviteError ? <div className="notice error">{inviteError}</div> : null}
        <div className="button-row">
          <button className="secondary-button" disabled={cleanupBusy !== null} onClick={() => runInviteCleanup("used")} type="button">
            {cleanupBusy === "used" ? "Cleaning" : "Delete used invites"}
          </button>
          <button className="secondary-button" disabled={cleanupBusy !== null} onClick={() => runInviteCleanup("expired")} type="button">
            {cleanupBusy === "expired" ? "Cleaning" : "Delete expired invites"}
          </button>
          <button className="secondary-button" disabled={cleanupBusy !== null} onClick={() => runInviteCleanup("inactive")} type="button">
            {cleanupBusy === "inactive" ? "Cleaning" : "Delete all inactive invites"}
          </button>
        </div>
        {invites.length === 0 ? (
          <EmptyState title="No invites yet" message="Create the first staff invite link above." />
        ) : (
          <DataTable
            rows={invites}
            getRowKey={(invite) => invite.id}
            columns={[
              { header: "Status", render: (invite) => <StatusPill status={invite.status} /> },
              { header: "Role", render: (invite) => invite.role },
              { header: "Expires", render: (invite) => formatDateTime(invite.expires_at) },
              { header: "Accepted by", render: (invite) => invite.accepted_by_display_name ?? "Not used" },
            ]}
          />
        )}
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Staff profiles</h2>
            <p className="muted">{activeStaffCount} active staff. Deactivated users stay in history and cannot log in.</p>
          </div>
          <div className="staff-filter-actions">
            <label className="compact-select">
              <span>Filter</span>
              <select value={staffFilter} onChange={(event) => setStaffFilter(event.target.value as (typeof staffFilters)[number])}>
                <option value="active">Active</option>
                <option value="deactivated">Deactivated</option>
                <option value="archived">Archived</option>
                <option value="all">All</option>
              </select>
            </label>
            <label className="compact-select">
              <span>Edit</span>
              <select value={selectedUser?.id ?? ""} onChange={(event) => setSelectedUserId(event.target.value)}>
                {manageableUsers.map((user) => (
                  <option key={user.id} value={user.id}>{user.display_name}</option>
                ))}
              </select>
            </label>
          </div>
        </div>
        {!selectedUser ? (
          <EmptyState title="No staff profiles" message="Create or invite staff to edit profile details." />
        ) : (
          <form className="form-grid" onSubmit={submitProfile}>
            <div className="wide-field status-action-panel">
              <div>
                <strong>Status: <StatusPill status={selectedStatus} /></strong>
                <p className="muted">Use deactivate for temporary inactive staff, archive for owner-only soft deletion, and permanent delete only for clean test accounts.</p>
              </div>
              <div className="button-row">
                {selectedStatus === "active" ? (
                  <button className="secondary-button" disabled={actionBusy} onClick={() => changeStatus("deactivated")} type="button">Deactivate</button>
                ) : null}
                {selectedStatus === "deactivated" ? (
                  <button className="primary-button" disabled={actionBusy} onClick={() => changeStatus("active")} type="button">Reactivate</button>
                ) : null}
                {canOwnerManage && selectedStatus !== "archived" ? (
                  <button className="secondary-button danger-action" disabled={actionBusy} onClick={() => changeStatus("archived")} type="button">Archive Staff</button>
                ) : null}
                {canOwnerManage && selectedStatus === "archived" ? (
                  <button className="primary-button" disabled={actionBusy} onClick={() => changeStatus("active")} type="button">Restore/Reinstate</button>
                ) : null}
              </div>
              {canOwnerManage ? (
                <div className="delete-confirm-box">
                  <strong>Delete Permanently</strong>
                  <p className="muted">This cannot be undone. Type DELETE to remove a clean test account. Accounts with meaningful history are blocked.</p>
                  <input value={deleteConfirmation} onChange={(event) => setDeleteConfirmation(event.target.value)} placeholder="Type DELETE" />
                  <button className="secondary-button danger-action" disabled={actionBusy || deleteConfirmation !== "DELETE"} onClick={hardDelete} type="button">Delete Permanently</button>
                </div>
              ) : null}
            </div>
            <label>
              <span>First name</span>
              <input value={form.first_name} onChange={(event) => setForm({ ...form, first_name: event.target.value })} />
            </label>
            <label>
              <span>Last name</span>
              <input value={form.last_name} onChange={(event) => setForm({ ...form, last_name: event.target.value })} />
            </label>
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
              <select disabled={currentUser.role !== "owner"} value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value as UserRole })}>
                <option value="owner">Owner</option>
                <option value="admin">Admin</option>
                <option value="staff">Staff</option>
              </select>
              <small className="muted">{roleHelp}</small>
            </label>
            <label>
              <span>Emergency contact</span>
              <input value={form.emergency_contact_name} onChange={(event) => setForm({ ...form, emergency_contact_name: event.target.value })} />
            </label>
            <label>
              <span>Emergency phone</span>
              <input value={form.emergency_contact_phone} onChange={(event) => setForm({ ...form, emergency_contact_phone: event.target.value })} />
            </label>
            <label className="wide-field">
              <span>Availability notes</span>
              <textarea value={form.availability_notes} onChange={(event) => setForm({ ...form, availability_notes: event.target.value })} />
            </label>
            <label className="wide-field">
              <span>Internal notes</span>
              <textarea value={form.internal_notes} onChange={(event) => setForm({ ...form, internal_notes: event.target.value })} />
            </label>
            <fieldset className="fieldset">
              <legend>Internal skills</legend>
              <div className="recipient-picker">
                {skillOptions.map((skill) => (
                  <label className="checkbox-field" key={skill}>
                    <input
                      checked={form.skills.includes(skill)}
                      onChange={(event) => setForm({
                        ...form,
                        skills: event.target.checked ? [...form.skills, skill] : form.skills.filter((item) => item !== skill),
                      })}
                      type="checkbox"
                    />
                    <span>{skill}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <fieldset className="fieldset">
              <legend>Location availability</legend>
              <div className="location-availability-grid">
                {locations.map((location) => (
                  <div className="location-choice-row" key={location.id}>
                    <strong>{location.name}</strong>
                    <div>
                      {locationOptions.map((option) => (
                        <label className="radio-field" key={option.value}>
                          <input
                            checked={form.locationAvailability[location.id] === option.value}
                            name={`location-${location.id}`}
                            onChange={() => setForm({ ...form, locationAvailability: { ...form.locationAvailability, [location.id]: option.value } })}
                            type="radio"
                          />
                          <span>{option.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </fieldset>
            <label className="checkbox-field wide-field">
              <input type="checkbox" checked={form.is_active} onChange={(event) => setForm({ ...form, is_active: event.target.checked })} />
              <span>Active account</span>
            </label>
            <div className="form-actions">
              <button className="primary-button" disabled={saving} type="submit">{saving ? "Saving" : "Save profile"}</button>
            </div>
            {profileMessage ? <div className="notice success wide-field">{profileMessage}</div> : null}
            {profileError ? <div className="notice error wide-field">{profileError}</div> : null}
          </form>
        )}
      </section>
    </>
  );
}

function profileForm(user: User | null) {
  const locationAvailability: Record<string, "preferred" | "willing" | "cannot"> = {};
  user?.location_availability?.forEach((item) => {
    locationAvailability[item.location_id] = item.preference;
  });

  return {
    first_name: user?.first_name ?? "",
    last_name: user?.last_name ?? "",
    display_name: user?.display_name ?? "",
    phone: user?.phone ?? "",
    email: user?.email ?? "",
    role: user?.role ?? "staff",
    emergency_contact_name: user?.emergency_contact_name ?? "",
    emergency_contact_phone: user?.emergency_contact_phone ?? "",
    availability_notes: user?.availability_notes ?? "",
    internal_notes: user?.internal_notes ?? "",
    skills: user?.skills ?? [],
    is_active: staffStatus(user) === "active",
    locationAvailability,
  };
}

function staffStatus(user: User | null): StaffStatus {
  if (user?.staff_status === "active" || user?.staff_status === "deactivated" || user?.staff_status === "archived") {
    return user.staff_status;
  }
  return user?.is_active ? "active" : "deactivated";
}
