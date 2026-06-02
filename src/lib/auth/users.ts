import { query } from "@/lib/db";
import { isChildAccount } from "@/lib/community/users";

export type AuthUser = {
  id: string;
  email: string;
  username: string;
  displayName: string | null;
  birthYear: number | null;
  isChild: boolean;
  pointsBalance: number;
  onboardingComplete: boolean;
};

function slugUsername(base: string) {
  const slug = base
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 20);
  return slug.length >= 3 ? slug : "fan";
}

export async function findAuthUserById(userId: string): Promise<AuthUser | null> {
  const result = await query<{
    id: string;
    email: string;
    username: string;
    display_name: string | null;
    birth_year: number | null;
    is_child: boolean;
    points_balance: number;
    onboarding_completed_at: Date | null;
    is_suspended: boolean;
    suspended_until: Date | null;
    is_banned: boolean;
  }>(
    `SELECT id, email, username, display_name, birth_year, is_child, points_balance,
            onboarding_completed_at, is_suspended, suspended_until,
            COALESCE(is_banned, false) AS is_banned
     FROM users
     WHERE id = $1 AND deleted_at IS NULL`,
    [userId]
  );

  const row = result.rows[0];
  if (!row || row.is_banned) return null;

  if (row.is_suspended) {
    if (row.suspended_until && row.suspended_until <= new Date()) {
      await query(
        `UPDATE users SET is_suspended = false, suspended_until = NULL, updated_at = now() WHERE id = $1`,
        [userId]
      );
    } else {
      return null;
    }
  }

  return {
    id: row.id,
    email: row.email,
    username: row.username,
    displayName: row.display_name,
    birthYear: row.birth_year,
    isChild: row.is_child,
    pointsBalance: row.points_balance,
    onboardingComplete: Boolean(row.onboarding_completed_at && row.birth_year !== null)
  };
}

export async function upsertOAuthUser(input: {
  email: string;
  displayName: string;
  provider: string;
  providerAccountId: string;
  emailVerified: boolean;
}) {
  const email = input.email.trim().toLowerCase();
  if (!email) throw new Error("INVALID_EMAIL");

  const existing = await query<{ id: string }>(
    `SELECT id FROM users
     WHERE oauth_provider = $1 AND oauth_subject = $2 AND deleted_at IS NULL`,
    [input.provider, input.providerAccountId]
  );

  if (existing.rows[0]?.id) {
    await query(
      `UPDATE users
       SET display_name = COALESCE(NULLIF($2, ''), display_name),
           email_verified_at = CASE WHEN $3 THEN COALESCE(email_verified_at, now()) ELSE email_verified_at END,
           updated_at = now()
       WHERE id = $1`,
      [existing.rows[0].id, input.displayName.trim(), input.emailVerified]
    );
    return findAuthUserById(existing.rows[0].id);
  }

  const byEmail = await query<{ id: string }>(
    `SELECT id FROM users WHERE email = $1 AND deleted_at IS NULL`,
    [email]
  );

  if (byEmail.rows[0]?.id) {
    await query(
      `UPDATE users
       SET oauth_provider = $2,
           oauth_subject = $3,
           display_name = COALESCE(NULLIF($4, ''), display_name),
           email_verified_at = CASE WHEN $5 THEN COALESCE(email_verified_at, now()) ELSE email_verified_at END,
           updated_at = now()
       WHERE id = $1`,
      [
        byEmail.rows[0].id,
        input.provider,
        input.providerAccountId,
        input.displayName.trim(),
        input.emailVerified
      ]
    );
    return findAuthUserById(byEmail.rows[0].id);
  }

  const baseUsername = slugUsername(input.displayName || email.split("@")[0] || "fan");
  let lastError: unknown = null;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const username = `${baseUsername}_${Math.random().toString(36).slice(2, 8)}`.slice(0, 30);
    try {
      const result = await query<{ id: string }>(
        `INSERT INTO users (
           email, username, display_name, birth_year, is_child,
           oauth_provider, oauth_subject, email_verified_at, tier, role
         )
         VALUES ($1, $2, $3, NULL, false, $4, $5,
                 CASE WHEN $6 THEN now() ELSE NULL END, 'fan', 'user')
         RETURNING id`,
        [
          email,
          username,
          input.displayName.trim() || username,
          input.provider,
          input.providerAccountId,
          input.emailVerified
        ]
      );

      const userId = result.rows[0]?.id;
      if (!userId) throw new Error("USER_INSERT_FAILED");

      await query(
        `INSERT INTO user_preferences (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`,
        [userId]
      );

      return findAuthUserById(userId);
    } catch (error) {
      lastError = error;
      if (error && typeof error === "object" && "code" in error && error.code === "23505") {
        continue;
      }
      throw error;
    }
  }

  throw lastError ?? new Error("USER_INSERT_FAILED");
}

export async function completeUserOnboarding(
  userId: string,
  birthYear: number,
  options?: { registrationInviteToken?: string | null }
) {
  if (!Number.isInteger(birthYear) || birthYear < 1900 || birthYear > new Date().getFullYear()) {
    throw new Error("INVALID_BIRTH_YEAR");
  }

  const child = isChildAccount(birthYear);
  await query(
    `UPDATE users
     SET birth_year = $2,
         is_child = $3,
         onboarding_completed_at = now(),
         updated_at = now()
     WHERE id = $1 AND deleted_at IS NULL`,
    [userId, birthYear, child]
  );

  if (child) {
    throw new Error("CHILD_ACCOUNT_BLOCKED");
  }

  if (options?.registrationInviteToken) {
    const { redeemRegistrationInvitation } = await import("@/lib/invitations/store");
    const user = await query<{ email: string }>(
      `SELECT email FROM users WHERE id = $1 AND deleted_at IS NULL`,
      [userId]
    );
    const email = user.rows[0]?.email;
    if (email) {
      try {
        await redeemRegistrationInvitation({
          inviteToken: options.registrationInviteToken,
          newUserId: userId,
          newUserEmail: email
        });
      } catch (error) {
        if (error instanceof Error && error.message === "ALREADY_REGISTERED") {
          /* signed in again with same account */
        } else {
          throw error;
        }
      }
    }
  }

  return findAuthUserById(userId);
}

export async function getDefaultTournamentId() {
  const result = await query<{ id: string }>(
    `SELECT id FROM tournaments WHERE short_name = 'WC26' ORDER BY created_at ASC LIMIT 1`
  );
  return result.rows[0]?.id ?? null;
}
