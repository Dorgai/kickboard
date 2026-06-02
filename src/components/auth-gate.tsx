"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import { FormEvent, useEffect, useState } from "react";

type AuthConfig = {
  oauthConfigured: boolean;
  providers: string[];
};

export function AuthGate({
  children,
  featureLabel
}: {
  children: React.ReactNode;
  featureLabel: string;
}) {
  const { data: session, status, update } = useSession();
  const [birthYear, setBirthYear] = useState(String(new Date().getFullYear() - 18));
  const [oauthConfigured, setOauthConfigured] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void fetch("/api/auth/config")
      .then((response) => response.json())
      .then((payload: AuthConfig) => setOauthConfigured(payload.oauthConfigured))
      .catch(() => setOauthConfigured(null));
  }, []);

  if (status === "loading") {
    return <p className="inline-status">Checking sign-in…</p>;
  }

  if (!session?.user) {
    return (
      <div className="auth-gate">
        <h3>Sign in to use {featureLabel}</h3>
        <p className="community-panel-lead">
          Register with Google (OAuth). We use your account for squads, Fan Chat, and predictions — not
          a separate community password.
        </p>
        {oauthConfigured === false ? (
          <p className="inline-status">
            Google OAuth is not configured on this environment. Set <code>GOOGLE_CLIENT_ID</code> and{" "}
            <code>GOOGLE_CLIENT_SECRET</code> on Railway.
          </p>
        ) : (
          <button
            className="button primary"
            type="button"
            onClick={() => {
              void signIn("google", { callbackUrl: typeof window !== "undefined" ? window.location.href : "/" });
            }}
          >
            Continue with Google
          </button>
        )}
      </div>
    );
  }

  if (!session.user.onboardingComplete) {
    async function handleOnboarding(event: FormEvent) {
      event.preventDefault();
      setSubmitting(true);
      setError(null);
      try {
        const response = await fetch("/api/auth/onboarding", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ birthYear: Number(birthYear) })
        });
        const payload = (await response.json()) as { error?: string };
        if (!response.ok) throw new Error(payload.error ?? "Onboarding failed.");
        await update();
      } catch (onboardingError) {
        setError(onboardingError instanceof Error ? onboardingError.message : "Onboarding failed.");
      } finally {
        setSubmitting(false);
      }
    }

    return (
      <form className="auth-gate" onSubmit={handleOnboarding}>
        <h3>Confirm your age</h3>
        <p className="community-panel-lead">
          Required for child-safety rules. Accounts under 13 stay in Fan Mode and cannot post on the Coach
          Board.
        </p>
        <label className="feed-control-field">
          Birth year
          <input
            className="feed-control-input"
            max={new Date().getFullYear()}
            min={1900}
            required
            type="number"
            value={birthYear}
            onChange={(event) => setBirthYear(event.target.value)}
          />
        </label>
        {error ? <p className="inline-status">{error}</p> : null}
        <button className="button primary" disabled={submitting} type="submit">
          {submitting ? "Saving…" : "Continue"}
        </button>
      </form>
    );
  }

  return (
    <div className="auth-gate-shell">
      <div className="auth-session-bar">
        <span>
          Signed in as <strong>{session.user.name ?? session.user.email}</strong> ·{" "}
          {session.user.pointsBalance} pts
        </span>
        <button className="text-button" type="button" onClick={() => void signOut()}>
          Sign out
        </button>
      </div>
      {children}
    </div>
  );
}
