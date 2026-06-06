import { randomUUID } from "node:crypto";
import { query } from "@/lib/db";

const SYSTEM_EMAIL = "moderator@kickboard.local";
const SYSTEM_DISPLAY = "MyPicks";

export async function getAdminMessagingSenderId() {
  const configured = process.env.ADMIN_FAN_CHAT_SENDER_ID?.trim();
  if (configured) return configured;

  const existing = await query<{ id: string }>(
    `SELECT id FROM users
     WHERE email = $1 AND deleted_at IS NULL
     LIMIT 1`,
    [SYSTEM_EMAIL]
  );
  if (existing.rows[0]?.id) return existing.rows[0].id;

  const username = `kickboard_mod_${randomUUID().slice(0, 8)}`;
  const inserted = await query<{ id: string }>(
    `INSERT INTO users (
       email, username, display_name, birth_year, is_child, tier, role, onboarding_completed_at
     )
     VALUES ($1, $2, $3, 1990, false, 'fan', 'moderator', now())
     ON CONFLICT (email) DO UPDATE SET display_name = EXCLUDED.display_name
     RETURNING id`,
    [SYSTEM_EMAIL, username, SYSTEM_DISPLAY]
  );

  const userId = inserted.rows[0]?.id;
  if (!userId) throw new Error("ADMIN_SENDER_UNAVAILABLE");

  await query(
    `INSERT INTO user_preferences (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`,
    [userId]
  );

  return userId;
}
