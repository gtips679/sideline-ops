import { useState } from "react";
import type { FormEvent } from "react";
import { login } from "../../lib/api";
import type { User } from "../../lib/types";

type LoginScreenProps = {
  onLoggedIn: (user: User) => void;
};

export function LoginScreen({ onLoggedIn }: LoginScreenProps) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      onLoggedIn(await login({ identifier, password }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not log in.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="access-page">
      <section className="access-panel">
        <div className="access-brand">
          <span>Sideline Supplies</span>
          <strong>Sideline Ops</strong>
        </div>
        <p>Sign in with your phone or email.</p>
        <form className="access-form" onSubmit={submit}>
          <label>
            <span>Phone or email</span>
            <input autoComplete="username" value={identifier} onChange={(event) => setIdentifier(event.target.value)} />
          </label>
          <label>
            <span>Password</span>
            <input autoComplete="current-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </label>
          <button className="primary-button" disabled={busy} type="submit">{busy ? "Signing in" : "Sign in"}</button>
        </form>
        {error ? <div className="notice error">{error}</div> : null}
        <p className="muted">Forgot password is not public yet. Ask an owner/admin to reset access.</p>
      </section>
    </main>
  );
}
