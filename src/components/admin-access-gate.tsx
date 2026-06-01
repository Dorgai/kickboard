"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type AdminAccessGateProps = {
  adminConfigured: boolean;
};

export function AdminAccessGate({ adminConfigured }: AdminAccessGateProps) {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const response = await fetch("/api/admin/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token })
      });

      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        setError(body.error ?? "Invalid admin token");
        return;
      }

      router.push("/admin/data-sources");
      router.refresh();
    } catch {
      setError("Unable to verify admin token");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="admin-page admin-gate" id="main-content">
      <section className="admin-hero">
        <p className="eyebrow">Admin only</p>
        <h1>Data source operations</h1>
        {!adminConfigured ? (
          <p className="inline-error">
            Admin access is not configured. Set <code>ADMIN_DATA_SOURCES_TOKEN</code> in your environment
            (see <code>.env.example</code>), restart the dev server, then sign in below.
          </p>
        ) : (
          <p>Enter your admin token to view feed connections, refresh cadence, and infrastructure status.</p>
        )}
      </section>

      <section className="data-card admin-gate-card">
        <form className="admin-gate-form" onSubmit={handleSubmit}>
          <label>
            Admin token
            <input
              autoComplete="off"
              disabled={!adminConfigured || submitting}
              name="token"
              placeholder="Paste admin token"
              type="password"
              value={token}
              onChange={(event) => setToken(event.target.value)}
            />
          </label>
          {error ? <p className="inline-error">{error}</p> : null}
          <button className="button" disabled={!adminConfigured || submitting || !token.trim()} type="submit">
            {submitting ? "Verifying…" : "Open dashboard"}
          </button>
        </form>
      </section>
    </main>
  );
}
