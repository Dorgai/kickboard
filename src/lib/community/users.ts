import { query } from "@/lib/db";

const COMMUNITY_EMAIL_DOMAIN = "community.kickboard.local";

export function isChildAccount(birthYear: number) {
  const age = new Date().getFullYear() - birthYear;
  return age < 13;
}

function slugUsername(displayName: string) {
  const base = displayName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 20);

  return base.length >= 3 ? base : "fan";
}

export async function findUserById(userId: string) {
  const result = await query<{
    id: string;
    username: string;
    display_name: string | null;
    is_child: boolean;
    is_suspended: boolean;
  }>(
    `SELECT id, username, display_name, is_child, is_suspended
     FROM users
     WHERE id = $1 AND deleted_at IS NULL`,
    [userId]
  );

  return result.rows[0] ?? null;
}

export async function registerCommunityUser(displayName: string, birthYear: number) {
  if (!Number.isInteger(birthYear)) {
    throw new Error("INVALID_BIRTH_YEAR");
  }

  if (isChildAccount(birthYear)) {
    throw new Error("CHILD_ACCOUNT_BLOCKED");
  }

  const trimmed = displayName.trim();
  if (trimmed.length < 2 || trimmed.length > 60) {
    throw new Error("INVALID_DISPLAY_NAME");
  }

  if (birthYear < 1900 || birthYear > new Date().getFullYear()) {
    throw new Error("INVALID_BIRTH_YEAR");
  }

  const baseUsername = slugUsername(trimmed);
  let lastError: unknown = null;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const suffix = Math.random().toString(36).slice(2, 8);
    const username = `${baseUsername}_${suffix}`.slice(0, 30);
    const email = `${username}@${COMMUNITY_EMAIL_DOMAIN}`;

    try {
      const result = await query<{ id: string; username: string; display_name: string | null }>(
        `INSERT INTO users (email, username, display_name, birth_year, is_child, tier, role)
         VALUES ($1, $2, $3, $4, false, 'fan', 'user')
         RETURNING id, username, display_name`,
        [email, username, trimmed, birthYear]
      );

      const user = result.rows[0];
      if (!user?.id) {
        throw new Error("USER_INSERT_FAILED");
      }

      await query(
        `INSERT INTO user_preferences (user_id)
         VALUES ($1)
         ON CONFLICT (user_id) DO NOTHING`,
        [user.id]
      );

      return user;
    } catch (error) {
      lastError = error;
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "23505"
      ) {
        continue;
      }
      throw error;
    }
  }

  throw lastError ?? new Error("USER_INSERT_FAILED");
}
