import { randomBytes } from "crypto";
import { query } from "@/lib/db";
import { createAcceptedConnection } from "@/lib/connections/store";
import { formatInviterPublicName } from "@/lib/invitations/inviter-label";

export type RegistrationInvitationStatus = "pending" | "accepted" | "revoked" | "expired";

export type RegistrationInvitationSummary = {
  id: string;
  inviteeEmail: string | null;
  status: RegistrationInvitationStatus;
  personalMessage: string | null;
  inviteUrl: string;
  expiresAt: string;
  createdAt: string;
  respondedAt: string | null;
  acceptedUserId: string | null;
};

export type PublicInvitationPreview = {
  token: string;
  status: RegistrationInvitationStatus;
  expiresAt: string;
  inviterDisplayName: string;
  inviterUsername: string;
  personalMessage: string | null;
  inviteeEmail: string | null;
};

const OPEN_INVITE_LIMIT = 25;
const INVITE_TTL_DAYS = 14;

function generateInviteToken() {
  return randomBytes(24).toString("base64url");
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function buildInviteUrl(token: string, baseUrl: string) {
  const base = baseUrl.replace(/\/$/, "");
  return `${base}/invite/${encodeURIComponent(token)}`;
}

function mapInvitationRow(row: {
  id: string;
  invitee_email: string | null;
  token: string;
  personal_message: string | null;
  status: RegistrationInvitationStatus;
  expires_at: Date;
  created_at: Date;
  responded_at: Date | null;
  accepted_user_id: string | null;
}, baseUrl: string): RegistrationInvitationSummary {
  return {
    id: row.id,
    inviteeEmail: row.invitee_email,
    status: row.status,
    personalMessage: row.personal_message,
    inviteUrl: buildInviteUrl(row.token, baseUrl),
    expiresAt: row.expires_at.toISOString(),
    createdAt: row.created_at.toISOString(),
    respondedAt: row.responded_at?.toISOString() ?? null,
    acceptedUserId: row.accepted_user_id
  };
}

async function expireStaleInvitations() {
  await query(
    `UPDATE registration_invitations
     SET status = 'expired', responded_at = COALESCE(responded_at, now())
     WHERE status = 'pending' AND expires_at < now()`
  );
}

export async function createRegistrationInvitation(input: {
  inviterId: string;
  inviteeEmail?: string;
  personalMessage?: string;
  baseUrl: string;
}) {
  await expireStaleInvitations();

  const inviter = await query<{ is_child: boolean; email: string }>(
    `SELECT is_child, email FROM users WHERE id = $1 AND deleted_at IS NULL`,
    [input.inviterId]
  );
  if (!inviter.rows[0]) throw new Error("FORBIDDEN");
  if (inviter.rows[0].is_child) throw new Error("CHILD_CANNOT_INVITE");

  const emailRaw = input.inviteeEmail?.trim() ?? "";
  const inviteeEmail = emailRaw ? normalizeEmail(emailRaw) : null;
  if (emailRaw && !isValidEmail(inviteeEmail!)) throw new Error("INVALID_EMAIL");
  if (inviteeEmail && inviteeEmail === normalizeEmail(inviter.rows[0].email)) {
    throw new Error("INVITEE_IS_INVITER");
  }

  const message = input.personalMessage?.trim().slice(0, 280) ?? null;
  if (message && message.length > 280) throw new Error("MESSAGE_TOO_LONG");

  const openCount = await query<{ count: string }>(
    `SELECT count(*)::text AS count
     FROM registration_invitations
     WHERE inviter_id = $1 AND status = 'pending' AND expires_at >= now()`,
    [input.inviterId]
  );
  if (Number(openCount.rows[0]?.count ?? 0) >= OPEN_INVITE_LIMIT) {
    throw new Error("INVITE_LIMIT_REACHED");
  }

  const token = generateInviteToken();
  const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);

  const inserted = await query<{
    id: string;
    invitee_email: string | null;
    token: string;
    personal_message: string | null;
    status: RegistrationInvitationStatus;
    expires_at: Date;
    created_at: Date;
    responded_at: Date | null;
    accepted_user_id: string | null;
  }>(
    `INSERT INTO registration_invitations (
       inviter_id, invitee_email, token, personal_message, expires_at
     )
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, invitee_email, token, personal_message, status, expires_at,
               created_at, responded_at, accepted_user_id`,
    [input.inviterId, inviteeEmail, token, message, expiresAt]
  );

  const row = inserted.rows[0];
  if (!row) throw new Error("INVITATION_CREATE_FAILED");

  return mapInvitationRow(row, input.baseUrl);
}

export async function listRegistrationInvitationsForInviter(inviterId: string, baseUrl: string) {
  await expireStaleInvitations();

  const result = await query<{
    id: string;
    invitee_email: string | null;
    token: string;
    personal_message: string | null;
    status: RegistrationInvitationStatus;
    expires_at: Date;
    created_at: Date;
    responded_at: Date | null;
    accepted_user_id: string | null;
  }>(
    `SELECT id, invitee_email, token, personal_message, status, expires_at,
            created_at, responded_at, accepted_user_id
     FROM registration_invitations
     WHERE inviter_id = $1
     ORDER BY created_at DESC
     LIMIT 40`,
    [inviterId]
  );

  return result.rows.map((row) => mapInvitationRow(row, baseUrl));
}

export async function revokeRegistrationInvitation(invitationId: string, inviterId: string) {
  const result = await query<{ id: string }>(
    `UPDATE registration_invitations
     SET status = 'revoked', responded_at = now()
     WHERE id = $1 AND inviter_id = $2 AND status = 'pending'
     RETURNING id`,
    [invitationId, inviterId]
  );
  if (!result.rows[0]) throw new Error("INVITATION_NOT_FOUND");
  return true;
}

export async function getPublicInvitationByToken(token: string): Promise<PublicInvitationPreview | null> {
  await expireStaleInvitations();

  const trimmed = token.trim();
  if (!trimmed) return null;

  const result = await query<{
    token: string;
    status: RegistrationInvitationStatus;
    expires_at: Date;
    personal_message: string | null;
    invitee_email: string | null;
    inviter_username: string;
    inviter_display_name: string | null;
    inviter_email: string;
  }>(
    `SELECT ri.token, ri.status, ri.expires_at, ri.personal_message, ri.invitee_email,
            u.username AS inviter_username, u.display_name AS inviter_display_name, u.email AS inviter_email
     FROM registration_invitations ri
     INNER JOIN users u ON u.id = ri.inviter_id
     WHERE ri.token = $1`,
    [trimmed]
  );

  const row = result.rows[0];
  if (!row) return null;

  let status = row.status;
  if (status === "pending" && row.expires_at.getTime() < Date.now()) {
    status = "expired";
  }

  return {
    token: row.token,
    status,
    expiresAt: row.expires_at.toISOString(),
    inviterDisplayName: formatInviterPublicName({
      displayName: row.inviter_display_name,
      username: row.inviter_username,
      email: row.inviter_email
    }),
    inviterUsername: row.inviter_username,
    personalMessage: row.personal_message,
    inviteeEmail: row.invitee_email
  };
}

export async function redeemRegistrationInvitation(input: {
  inviteToken: string;
  newUserId: string;
  newUserEmail: string;
}) {
  await expireStaleInvitations();

  const token = input.inviteToken.trim();
  if (!token) return null;

  const invite = await query<{
    id: string;
    inviter_id: string;
    invitee_email: string | null;
    status: RegistrationInvitationStatus;
    expires_at: Date;
    accepted_user_id: string | null;
  }>(
    `SELECT id, inviter_id, invitee_email, status, expires_at, accepted_user_id
     FROM registration_invitations
     WHERE token = $1`,
    [token]
  );

  const row = invite.rows[0];
  if (!row) throw new Error("INVITATION_NOT_FOUND");

  if (row.status === "accepted") {
    if (row.accepted_user_id === input.newUserId) return { inviterId: row.inviter_id };
    throw new Error("ALREADY_REGISTERED");
  }

  if (row.status !== "pending") {
    throw new Error("INVITATION_NOT_PENDING");
  }

  if (row.expires_at.getTime() < Date.now()) {
    await query(
      `UPDATE registration_invitations
       SET status = 'expired', responded_at = now()
       WHERE id = $1`,
      [row.id]
    );
    throw new Error("INVITATION_EXPIRED");
  }

  if (row.inviter_id === input.newUserId) throw new Error("INVITATION_OWN_LINK");

  if (row.invitee_email) {
    const invited = normalizeEmail(row.invitee_email);
    const actual = normalizeEmail(input.newUserEmail);
    if (invited !== actual) throw new Error("INVITATION_EMAIL_MISMATCH");
  }

  await query(
    `UPDATE registration_invitations
     SET status = 'accepted',
         accepted_user_id = $2,
         responded_at = now()
     WHERE id = $1`,
    [row.id, input.newUserId]
  );

  await query(
    `UPDATE users
     SET invited_by_user_id = $2, updated_at = now()
     WHERE id = $1 AND invited_by_user_id IS NULL`,
    [input.newUserId, row.inviter_id]
  );

  await createAcceptedConnection(row.inviter_id, input.newUserId);

  return { inviterId: row.inviter_id };
}
