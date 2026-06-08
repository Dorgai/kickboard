import { query } from "@/lib/db";

export async function getProfileDiscoverable(userId: string): Promise<boolean | null> {
  const result = await query<{ profile_discoverable: boolean }>(
    `SELECT COALESCE(profile_discoverable, true) AS profile_discoverable
     FROM users
     WHERE id = $1 AND deleted_at IS NULL`,
    [userId]
  );
  const row = result.rows[0];
  if (!row) return null;
  return row.profile_discoverable;
}

export async function updateProfileDiscoverable(
  userId: string,
  profileDiscoverable: boolean
): Promise<boolean | null> {
  const result = await query<{ profile_discoverable: boolean }>(
    `UPDATE users
     SET profile_discoverable = $2, updated_at = now()
     WHERE id = $1 AND deleted_at IS NULL
     RETURNING profile_discoverable`,
    [userId, profileDiscoverable]
  );
  const row = result.rows[0];
  if (!row) return null;
  return row.profile_discoverable;
}
