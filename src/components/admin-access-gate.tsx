"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type AdminAccessGateProps = {
  adminConfigured: boolean;
  oauthConfigured: boolean;
};

export function AdminAccessGate({ adminConfigured, oauthConfigured }: AdminAccessGateProps) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleTokenSubmit(event: React.FormEvent<HTMLFormElement>) {
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

  const signedInEmail = session?.user?.email;
  const isAdminUser = Boolean(session?.user?.isAdmin);

  useEffect(() => {
    if (status === "authenticated" && isAdminUser) {
      router.refresh();
    }
  }, [isAdminUser, router, status]);

  return (
    <main className="admin-page admin-gate" id="main-content">
      <section className="admin-hero">
        <p className="eyebrow">Admin only</p>
        <h1>Admin dashboard</h1>
        <p>
          Sign in with Google using an email on the admin allowlist (default{" "}
          <code>laszlo.dorgai@gmail.com</code>; override with <code>ADMIN_EMAILS</code> on Railway). No
          operator token is required for allowlisted accounts. The token below is optional for scripts and
          legacy access.
        </p>
      </section>

      <section className="data-card admin-gate-card">
        {oauthConfigured ? (
          <div className="admin-gate-oauth">
            <h2>Sign in with Google</h2>
            {status === "loading" ? (
              <p className="inline-status">Checking session…</p>
            ) : isAdminUser ? (
              <>
                <p className="inline-status">
                  Signed in as <strong>{signedInEmail}</strong>. Refresh to open the dashboard.
                </p>
                <button className="button" type="button" onClick={() => router.refresh()}>
                  Open dashboard
                </button>
              </>
            ) : session?.user ? (
              <p className="inline-error">
                <strong>{signedInEmail}</strong> is not on the admin allowlist. Sign out and use an admin
                account, or use the operator token below.
              </p>
            ) : (
              <button
                className="button primary"
                type="button"
                onClick={() => {
                  void signIn("google", { callbackUrl: "/admin/data-sources" });
                }}
              >
                Continue with Google
              </button>
            )}
          </div>
        ) : (
          <p className="inline-error">
            Google OAuth is not configured. Set <code>GOOGLE_CLIENT_ID</code> and{" "}
            <code>GOOGLE_CLIENT_SECRET</code> on Railway first.
          </p>
        )}

        <hr className="admin-gate-divider" />

        <h2>Operator token (optional)</h2>
        {!adminConfigured ? (
          <p className="inline-error">
            Token access is not configured. Set <code>ADMIN_DATA_SOURCES_TOKEN</code> in your environment.
          </p>
        ) : (
          <form className="admin-gate-form" onSubmit={handleTokenSubmit}>
            <label>
              Admin token
              <input
                autoComplete="off"
                disabled={submitting}
                name="token"
                placeholder="Paste admin token"
                type="password"
                value={token}
                onChange={(event) => setToken(event.target.value)}
              />
            </label>
            {error ? <p className="inline-error">{error}</p> : null}
            <button className="button secondary" disabled={submitting || !token.trim()} type="submit">
              {submitting ? "Verifying…" : "Sign in with token"}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
