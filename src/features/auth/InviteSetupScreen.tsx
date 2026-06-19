import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { completeInvite, getInvite } from "../../lib/api";
import type { InviteSummary, Location } from "../../lib/types";

type InviteSetupScreenProps = {
  token: string;
  onComplete: () => void;
};

const preferenceOptions = [
  { value: "preferred", label: "Preferred / usually work here" },
  { value: "willing", label: "Willing if needed" },
  { value: "cannot", label: "Cannot work here" },
] as const;

export function InviteSetupScreen({ token, onComplete }: InviteSetupScreenProps) {
  const [invite, setInvite] = useState<InviteSummary | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    email: "",
    password: "",
    confirm_password: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
    availability_notes: "",
    locationAvailability: {} as Record<string, "preferred" | "willing" | "cannot">,
  });

  useEffect(() => {
    getInvite(token)
      .then((payload) => {
        setInvite(payload.invite);
        setLocations(payload.locations);
        setForm((current) => ({
          ...current,
          locationAvailability: Object.fromEntries(payload.locations.map((location) => [location.id, "willing"])),
        }));
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Invite is invalid or expired."))
      .finally(() => setLoading(false));
  }, [token]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    if (!form.email.trim() || !form.phone.trim()) {
      setError("Email and phone are required.");
      return;
    }
    if (form.password !== form.confirm_password) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      await completeInvite(token, {
        ...form,
        location_availability: Object.entries(form.locationAvailability).map(([location_id, preference]) => ({ location_id, preference })),
      });
      setMessage("Account created. You can sign in now.");
      window.history.replaceState(null, "", "/login");
      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not complete setup.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="access-page invite-page">
      <section className="access-panel invite-panel">
        <div className="access-brand">
          <span>Sideline Supplies</span>
          <strong>Staff setup</strong>
        </div>
        {loading ? <p>Checking invite...</p> : null}
        {!loading && !invite ? <div className="notice error">{error ?? "Invite is invalid or expired."}</div> : null}
        {invite ? (
          <form className="form-grid" onSubmit={submit}>
            <label>
              <span>First name</span>
              <input value={form.first_name} onChange={(event) => setForm({ ...form, first_name: event.target.value })} />
            </label>
            <label>
              <span>Last name</span>
              <input value={form.last_name} onChange={(event) => setForm({ ...form, last_name: event.target.value })} />
            </label>
            <label>
              <span>Phone</span>
              <input required value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
            </label>
            <label>
              <span>Email</span>
              <input required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
            </label>
            <label>
              <span>Password</span>
              <input required minLength={8} type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
            </label>
            <label>
              <span>Confirm password</span>
              <input required minLength={8} type="password" value={form.confirm_password} onChange={(event) => setForm({ ...form, confirm_password: event.target.value })} />
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
              <span>Basic availability notes</span>
              <textarea value={form.availability_notes} onChange={(event) => setForm({ ...form, availability_notes: event.target.value })} />
            </label>
            <fieldset className="fieldset">
              <legend>Location availability</legend>
              <div className="location-availability-grid">
                {locations.map((location) => (
                  <div className="location-choice-row" key={location.id}>
                    <strong>{location.name}</strong>
                    <div>
                      {preferenceOptions.map((option) => (
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
            <div className="form-actions">
              <button className="primary-button" disabled={busy} type="submit">{busy ? "Creating account" : "Create account"}</button>
            </div>
            {error ? <div className="notice error wide-field">{error}</div> : null}
            {message ? <div className="notice success wide-field">{message}</div> : null}
          </form>
        ) : null}
      </section>
    </main>
  );
}
