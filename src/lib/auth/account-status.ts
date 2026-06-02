import { query } from "@/lib/db";

export type AccountAccessBlock = "suspended" | "banned" | null;

export async function getAccountAccessBlock(userId: string): Promise<AccountAccessBlock> {
  const result = await query<{
    is_suspended: boolean;
    suspended_until: Date | null;
    is_banned: boolean;
  }>(
    `SELECT is_suspended, suspended_until, COALESCE(is_banned, false) AS is_banned
     FROM users
     WHERE id = $1 AND deleted_at IS NULL`,
    [userId]
  );

  const row = result.rows[0];
  if (!row) return "banned";
  if (row.is_banned) return "banned";

  if (row.is_suspended) {
    if (row.suspended_until && row.suspended_until <= new Date()) {
      await query(
        `UPDATE users SET is_suspended = false, suspended_until = NULL, updated_at = now() WHERE id = $1`,
        [userId]
      );
      return null;
    }
    return "suspended";
  }

  return null;
}
