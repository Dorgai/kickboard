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
  const suffix = Math.random().toString(36).slice(2, 8);
  const username = `${baseUsername}_${suffix}`.slice(0, 30);
  const email = `${username}@${COMMUNITY_EMAIL_DOMAIN}`;

  const result = await query<{ id: string; username: string; display_name: string | null }>(
    `INSERT INTO users (email, username, display_name, birth_year, is_child, tier, role)
     VALUES ($1, $2, $3, $4, false, 'fan', 'user')
     RETURNING id, username, display_name`,
    [email, username, trimmed, birthYear]
  );

  return result.rows[0];
}
