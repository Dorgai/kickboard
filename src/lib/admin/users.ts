import { query } from "@/lib/db";

export type AdminUserRow = {
  id: string;
  email: string;
  username: string;
  displayName: string | null;
  isSuspended: boolean;
  suspendedUntil: string | null;
  isBanned: boolean;
  bannedAt: string | null;
  createdAt: string;
};

function mapAdminUser(row: {
  id: string;
  email: string;
  username: string;
  display_name: string | null;
  is_suspended: boolean;
  suspended_until: Date | null;
  is_banned: boolean;
  banned_at: Date | null;
  created_at: Date;
}): AdminUserRow {
  return {
    id: row.id,
    email: row.email,
    username: row.username,
    displayName: row.display_name,
    isSuspended: row.is_suspended,
    suspendedUntil: row.suspended_until?.toISOString() ?? null,
    isBanned: row.is_banned,
    bannedAt: row.banned_at?.toISOString() ?? null,
    createdAt: row.created_at.toISOString()
  };
}

export async function searchUsersForAdmin(queryText: string, limit = 25) {
  const q = queryText.trim().slice(0, 80);
  if (!q) return [];

  const pattern = `%${q.replace(/[%_]/g, "")}%`;
  const result = await query<{
    id: string;
    email: string;
    username: string;
    display_name: string | null;
    is_suspended: boolean;
    suspended_until: Date | null;
    is_banned: boolean;
    banned_at: Date | null;
    created_at: Date;
  }>(
    `SELECT id, email, username, display_name, is_suspended, suspended_until,
            COALESCE(is_banned, false) AS is_banned, banned_at, created_at
     FROM users
     WHERE deleted_at IS NULL
       AND (
         username ILIKE $1
         OR email ILIKE $1
         OR COALESCE(display_name, '') ILIKE $1
       )
     ORDER BY created_at DESC
     LIMIT $2`,
    [pattern, limit]
  );

  return result.rows.map(mapAdminUser);
}

export async function getUserForAdmin(userId: string) {
  const result = await query<{
    id: string;
    email: string;
    username: string;
    display_name: string | null;
    is_suspended: boolean;
    suspended_until: Date | null;
    is_banned: boolean;
    banned_at: Date | null;
    created_at: Date;
  }>(
    `SELECT id, email, username, display_name, is_suspended, suspended_until,
            COALESCE(is_banned, false) AS is_banned, banned_at, created_at
     FROM users
     WHERE id = $1 AND deleted_at IS NULL`,
    [userId]
  );

  const row = result.rows[0];
  return row ? mapAdminUser(row) : null;
}

export async function setUserSuspended(
  userId: string,
  suspended: boolean,
  suspendedUntil?: string | null
) {
  const until =
    suspended && suspendedUntil?.trim()
      ? new Date(suspendedUntil)
      : null;
  if (until && Number.isNaN(until.getTime())) throw new Error("INVALID_SUSPENDED_UNTIL");

  const result = await query<{ id: string }>(
    `UPDATE users
     SET is_suspended = $2,
         suspended_until = $3,
         updated_at = now()
     WHERE id = $1 AND deleted_at IS NULL
     RETURNING id`,
    [userId, suspended, suspended ? until : null]
  );

  if (!result.rowCount) throw new Error("USER_NOT_FOUND");
}

export async function setUserBanned(userId: string, banned: boolean) {
  const result = await query<{ id: string }>(
    `UPDATE users
     SET is_banned = $2,
         banned_at = CASE WHEN $2 THEN now() ELSE NULL END,
         updated_at = now()
     WHERE id = $1 AND deleted_at IS NULL
     RETURNING id`,
    [userId, banned]
  );

  if (!result.rowCount) throw new Error("USER_NOT_FOUND");
}
