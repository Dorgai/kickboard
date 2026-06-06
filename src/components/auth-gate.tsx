"use client";

import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { HelpTooltip } from "@/components/help-tooltip";
import { useSession } from "next-auth/react";
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

  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.onboardingComplete) return;

    void fetch("/api/invitations/redeem", { method: "POST" }).catch(() => {
      /* invite cookie absent or already redeemed */
    });
  }, [session?.user?.onboardingComplete, status]);

  if (status === "loading") {
    return <p className="inline-status">Checking sign-in…</p>;
  }

  if (!session?.user) {
    return (
      <div className="auth-gate">
        <h3 className="panel-help-row">
          Sign in to use {featureLabel}
          <HelpTooltip label="Why sign in" size="sm">
            Register with Google (OAuth). We use your account for squads, Fan Chat, and predictions — not a
            separate community password.
          </HelpTooltip>
        </h3>
        {oauthConfigured === false ? (
          <div className="auth-oauth-setup-help">
            <p className="inline-status">
              Google OAuth is not configured on this server. Add variables on the Railway <strong>MyPicks</strong>{" "}
              web service, then redeploy.
            </p>
            <ul className="auth-oauth-setup-list">
              <li>
                <code>GOOGLE_CLIENT_ID</code> and <code>GOOGLE_CLIENT_SECRET</code> from Google Cloud Console
              </li>
              <li>
                Redirect URI:{" "}
                <code>
                  {typeof window !== "undefined"
                    ? `${window.location.origin}/api/auth/callback/google`
                    : "/api/auth/callback/google"}
                </code>
              </li>
            </ul>
            <p className="community-setup-note">
              <strong>Only testers can sign in?</strong> In Google Cloud → OAuth consent screen, click{" "}
              <strong>Publish app</strong> (leave Testing mode). Add{" "}
              <a href="/privacy">Privacy Policy</a> and your site URL there — see{" "}
              <code>docs/publish-production.md</code>.
            </p>
            <p className="community-setup-note">
              If Google shows &quot;Access blocked&quot; while still in Testing, add Gmail under{" "}
              <strong>Test users</strong>. Set Railway <code>AUTH_URL</code> to this site and check{" "}
              <a href="/api/auth/providers">/api/auth/providers</a> (callback must not be <code>0.0.0.0</code>).
            </p>
          </div>
        ) : (
          <GoogleSignInButton />
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
        <h3 className="panel-help-row">
          Confirm your age
          <HelpTooltip label="Why we ask" size="sm">
            Required for child-safety rules. Accounts under 13 stay in Fan Mode and cannot post on the
            Coach Board.
          </HelpTooltip>
        </h3>
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

  return <div className="auth-gate-shell">{children}</div>;
}
