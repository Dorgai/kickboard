"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { HelpTooltip } from "@/components/help-tooltip";

type InvitePreview = {
  inviterDisplayName: string;
  inviterUsername: string;
  personalMessage: string | null;
  inviteeEmail: string | null;
  status: string;
  expiresAt: string;
};

export default function InviteRegistrationPage() {
  const params = useParams();
  const token = typeof params.token === "string" ? params.token : "";
  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError("Invalid invitation link.");
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const lookupParams = new URLSearchParams({ token });
        const lookupRes = await fetch(`/api/invitations/lookup?${lookupParams}`);
        const lookupPayload = (await lookupRes.json()) as {
          invitation?: InvitePreview & { status: string };
          error?: string;
        };
        if (!lookupRes.ok) throw new Error(lookupPayload.error ?? "Invitation not found.");

        const invitation = lookupPayload.invitation;
        if (!invitation) throw new Error("Invitation not found.");
        if (invitation.status !== "pending") {
          if (invitation.status === "accepted") {
            throw new Error("This invitation was already used. Sign in with your account.");
          }
          throw new Error("This invitation is no longer active.");
        }

        if (!cancelled) setPreview(invitation);

        const startRes = await fetch("/api/invitations/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token })
        });
        const startPayload = (await startRes.json()) as { error?: string };
        if (!startRes.ok) throw new Error(startPayload.error ?? "Unable to start registration.");

        if (!cancelled) setReady(true);
      } catch (loadError) {
        if (!cancelled) {
          setPreview(null);
          setReady(false);
          setError(loadError instanceof Error ? loadError.message : "Unable to load invitation.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <main className="invite-registration-page">
      <div className="invite-registration-card data-card">
        <p className="invite-registration-eyebrow">Kickboard invitation</p>

        {loading ? <p className="inline-status">Loading invitation…</p> : null}

        {!loading && error ? (
          <>
            <h1>Invitation unavailable</h1>
            <p className="inline-status">{error}</p>
            <Link className="button secondary" href="/">
              Go to Kickboard
            </Link>
          </>
        ) : null}

        {!loading && !error && preview ? (
          <>
            <h1 className="panel-help-row invite-page-title">
              Join {preview.inviterDisplayName} on Kickboard
              <HelpTooltip label="About this invite" size="sm">
                <strong>{preview.inviterDisplayName}</strong> invited you to register on Kickboard — free
                skill games, Coach Board squads, and predictions for the World Cup.
              </HelpTooltip>
            </h1>
            <p className="invite-registration-inviter-handle">
              Invited by @{preview.inviterUsername}
            </p>
            {preview.personalMessage ? (
              <blockquote className="invite-registration-message">{preview.personalMessage}</blockquote>
            ) : null}
            {preview.inviteeEmail ? (
              <p className="invite-registration-email-note">
                Use Google sign-in with <strong>{preview.inviteeEmail}</strong> for this invite.
              </p>
            ) : null}
            <p className="invite-registration-expiry">
              Link valid until {new Date(preview.expiresAt).toLocaleString()}.
            </p>
            <button
              className="button primary"
              disabled={!ready}
              type="button"
              onClick={() => {
                void signIn("google", {
                  callbackUrl: typeof window !== "undefined" ? window.location.origin : "/"
                });
              }}
            >
              Continue with Google
            </button>
            <div className="invite-registration-footnote-row">
              <HelpTooltip label="After you sign in" size="sm">
                After sign-in you&apos;ll confirm your birth year. You&apos;ll then be connected with{" "}
                {preview.inviterDisplayName}.
              </HelpTooltip>
            </div>
          </>
        ) : null}
      </div>
    </main>
  );
}
