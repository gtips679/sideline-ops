import { useState } from "react";
import type { FormEvent } from "react";
import { verifyAccessCode } from "../lib/api";
import { isLocalHost, localDevAccessCode } from "./access";

type AccessGateProps = {
  onAccessGranted: (grantedAt: string) => void;
};

export function AccessGate({ onAccessGranted }: AccessGateProps) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!code.trim()) {
      setError("Enter the preview access code.");
      return;
    }

    setSubmitting(true);
    try {
      await verifyAccessCode(code.trim());
      onAccessGranted(new Date().toISOString());
    } catch (err) {
      if (isLocalHost(window.location.hostname) && code.trim() === localDevAccessCode) {
        onAccessGranted(new Date().toISOString());
        return;
      }
      setError(err instanceof Error ? err.message : "Invalid access code");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="access-page">
      <section className="access-panel">
        <div className="brand access-brand">
          <span>Sideline Supplies</span>
          <strong>Sideline Ops</strong>
        </div>
        <p>Private preview for Sideline Supplies.</p>
        <form className="access-form" onSubmit={submit}>
          <label>
            <span>Access code</span>
            <input
              autoComplete="off"
              autoFocus
              inputMode="text"
              onChange={(event) => setCode(event.target.value)}
              type="password"
              value={code}
            />
          </label>
          <button className="primary-button" disabled={submitting} type="submit">
            {submitting ? "Checking" : "Enter preview"}
          </button>
        </form>
        {error ? <div className="notice error">{error}</div> : null}
      </section>
    </main>
  );
}
