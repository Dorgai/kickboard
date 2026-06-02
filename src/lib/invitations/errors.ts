export function mapInvitationError(error: unknown) {
  if (!(error instanceof Error)) return null;

  const map: Record<string, { status: number; error: string }> = {
    INVITEE_EMAIL_REQUIRED: { status: 400, error: "Enter an email for this invitation." },
    INVALID_EMAIL: { status: 400, error: "Enter a valid email address." },
    MESSAGE_TOO_LONG: { status: 400, error: "Message is too long (max 280 characters)." },
    CHILD_CANNOT_INVITE: { status: 403, error: "Fan Mode accounts cannot send registration invites." },
    INVITE_LIMIT_REACHED: {
      status: 429,
      error: "You have too many open invitations. Revoke one or wait for them to expire."
    },
    INVITATION_NOT_FOUND: { status: 404, error: "Invitation not found." },
    INVITATION_NOT_PENDING: { status: 409, error: "This invitation is no longer active." },
    INVITATION_EXPIRED: { status: 410, error: "This invitation has expired." },
    INVITATION_EMAIL_MISMATCH: {
      status: 403,
      error: "Sign in with the Google account that matches the invited email."
    },
    CANNOT_INVITE_SELF: { status: 400, error: "You cannot invite yourself." },
    FORBIDDEN: { status: 403, error: "Not allowed." },
    TOKEN_REQUIRED: { status: 400, error: "Invitation token is required." },
    ALREADY_REGISTERED: {
      status: 409,
      error: "This invitation was already used. Sign in with your existing account."
    },
    EMAIL_NOT_CONFIGURED: {
      status: 503,
      error:
        "Email delivery is not configured. Set RESEND_API_KEY and EMAIL_FROM on the server, or share the invite link manually."
    },
    EMAIL_SEND_FAILED: {
      status: 502,
      error: "The invitation was created but the email could not be sent. Copy the link and send it yourself."
    }
  };

  return map[error.message] ?? null;
}
