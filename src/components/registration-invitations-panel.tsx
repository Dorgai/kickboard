"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";

type InvitationRow = {
  id: string;
  inviteeEmail: string | null;
  status: string;
  personalMessage: string | null;
  inviteUrl: string;
  expiresAt: string;
  createdAt: string;
};

function normalizeInviteEmail(value: string) {
  return value.trim().toLowerCase();
}

export function RegistrationInvitationsPanel() {
  const { data: session } = useSession();
  const signedInEmail = session?.user?.email?.trim().toLowerCase() ?? null;

  const [invitations, setInvitations] = useState<InvitationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteeEmail, setInviteeEmail] = useState("");
  const [personalMessage, setPersonalMessage] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [lastInviteUrl, setLastInviteUrl] = useState<string | null>(null);
  const [sendEmail, setSendEmail] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/invitations", { cache: "no-store" });
      const payload = (await response.json()) as { invitations?: InvitationRow[]; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Unable to load invitations.");
      setInvitations(payload.invitations ?? []);
    } catch (loadError) {
      setInvitations([]);
      setError(loadError instanceof Error ? loadError.message : "Unable to load invitations.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const inviteeIsSelf = useMemo(() => {
    const trimmed = normalizeInviteEmail(inviteeEmail);
    if (!trimmed || !signedInEmail) return false;
    return trimmed === signedInEmail;
  }, [inviteeEmail, signedInEmail]);

  async function createInvitation(event: FormEvent) {
    event.preventDefault();
    if (inviteeIsSelf) {
      setError(
        "That email is your sign-in address. Enter a friend's email, or leave the field blank to create a shareable link."
      );
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    setLastInviteUrl(null);
    try {
      const response = await fetch("/api/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inviteeEmail: inviteeEmail.trim() || undefined,
          personalMessage: personalMessage.trim() || undefined,
          sendEmail: inviteeEmail.trim() ? sendEmail : false
        })
      });
      const payload = (await response.json()) as {
        error?: string;
        message?: string;
        invitation?: InvitationRow;
        emailDelivery?: { sent: boolean; reason?: string; detail?: string };
      };
      if (!response.ok) throw new Error(payload.error ?? "Unable to create invitation.");
      setNotice(payload.message ?? "Invitation created.");
      if (payload.emailDelivery?.reason === "send_failed" && payload.emailDelivery.detail) {
        setError(payload.emailDelivery.detail);
      }
      setLastInviteUrl(payload.invitation?.inviteUrl ?? null);
      setInviteeEmail("");
      setPersonalMessage("");
      await refresh();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Unable to create invitation.");
    } finally {
      setBusy(false);
    }
  }

  async function revokeInvitation(invitationId: string) {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/invitations/${invitationId}`, { method: "DELETE" });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Unable to revoke.");
      setNotice("Invitation revoked.");
      await refresh();
    } catch (revokeError) {
      setError(revokeError instanceof Error ? revokeError.message : "Unable to revoke.");
    } finally {
      setBusy(false);
    }
  }

  async function copyLink(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setNotice("Invite link copied.");
    } catch {
      setError("Could not copy link — select and copy manually.");
    }
  }

  return (
    <section className="registration-invitations-section">
      <h3>Invite someone to register</h3>
      <p className="community-panel-lead">
        Enter their email to send an invitation (and lock the invite to that Google account), or leave
        email blank to generate a link you can share anywhere. After they register, you&apos;ll be
        connected automatically.
      </p>

      <form className="registration-invite-form" onSubmit={createInvitation}>
        <label className="feed-control-field">
          Their email (optional)
          <input
            aria-invalid={inviteeIsSelf}
            className="feed-control-input"
            placeholder="friend@example.com"
            type="email"
            value={inviteeEmail}
            onChange={(event) => setInviteeEmail(event.target.value)}
          />
        </label>
        {inviteeIsSelf ? (
          <p className="inline-status registration-invite-hint">
            Invitations are for someone else. Leave email blank for a link you can copy, or use a
            different address.
          </p>
        ) : null}
        <label className="feed-control-field">
          Short message (optional)
          <textarea
            className="feed-control-input registration-invite-message"
            maxLength={280}
            placeholder="Join me on Kickboard for WC26 picks and Coach Board…"
            rows={2}
            value={personalMessage}
            onChange={(event) => setPersonalMessage(event.target.value)}
          />
        </label>
        {inviteeEmail.trim() ? (
          <label className="registration-invite-send-email">
            <input
              checked={sendEmail}
              type="checkbox"
              onChange={(event) => setSendEmail(event.target.checked)}
            />
            Send invitation email to {inviteeEmail.trim()}
          </label>
        ) : null}
        <button className="button primary" disabled={busy || inviteeIsSelf} type="submit">
          {busy
            ? "Sending…"
            : inviteeEmail.trim() && sendEmail
              ? "Send invitation"
              : "Create invite link"}
        </button>
      </form>

      {lastInviteUrl ? (
        <div className="registration-invite-latest">
          <p className="registration-invite-latest-label">Latest invite link</p>
          <code className="registration-invite-url">{lastInviteUrl}</code>
          <button
            className="button secondary"
            disabled={busy}
            type="button"
            onClick={() => void copyLink(lastInviteUrl)}
          >
            Copy link
          </button>
        </div>
      ) : null}

      {loading ? <p className="inline-status">Loading your invitations…</p> : null}

      {!loading && invitations.length > 0 ? (
        <ul className="registration-invite-list">
          {invitations.map((row) => (
            <li key={row.id}>
              <div className="registration-invite-card">
                <div className="registration-invite-card-main">
                  <strong className="registration-invite-status">{row.status}</strong>
                  {row.inviteeEmail ? (
                    <span className="registration-invite-email">{row.inviteeEmail}</span>
                  ) : (
                    <span className="registration-invite-email">Any Google account</span>
                  )}
                  <span className="registration-invite-meta">
                    Expires {new Date(row.expiresAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="registration-invite-card-actions">
                  {row.status === "pending" ? (
                    <>
                      <button
                        className="button secondary"
                        disabled={busy}
                        type="button"
                        onClick={() => void copyLink(row.inviteUrl)}
                      >
                        Copy link
                      </button>
                      <button
                        className="button secondary"
                        disabled={busy}
                        type="button"
                        onClick={() => void revokeInvitation(row.id)}
                      >
                        Revoke
                      </button>
                    </>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      {!loading && !invitations.length ? (
        <p className="inline-status">No invitations yet.</p>
      ) : null}

      {notice ? <p className="inline-status community-notice">{notice}</p> : null}
      {error ? <p className="inline-status">{error}</p> : null}
    </section>
  );
}
