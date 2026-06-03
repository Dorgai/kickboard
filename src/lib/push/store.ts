import { query } from "@/lib/db";

export type PushSubscriptionRecord = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

export async function userPushNotificationsEnabled(userId: string): Promise<boolean> {
  const result = await query<{ notification_channels: { push?: boolean } }>(
    `SELECT notification_channels FROM user_preferences WHERE user_id = $1`,
    [userId]
  );
  const channels = result.rows[0]?.notification_channels;
  if (!channels || typeof channels !== "object") return true;
  return channels.push !== false;
}

export async function upsertPushSubscription(input: {
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string | null;
}) {
  await query(
    `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, user_agent, updated_at)
     VALUES ($1, $2, $3, $4, $5, now())
     ON CONFLICT (user_id, endpoint)
     DO UPDATE SET
       p256dh = EXCLUDED.p256dh,
       auth = EXCLUDED.auth,
       user_agent = EXCLUDED.user_agent,
       updated_at = now()`,
    [
      input.userId,
      input.endpoint.slice(0, 2048),
      input.p256dh.slice(0, 256),
      input.auth.slice(0, 256),
      input.userAgent?.slice(0, 512) ?? null
    ]
  );
}

export async function deletePushSubscription(userId: string, endpoint: string) {
  await query(`DELETE FROM push_subscriptions WHERE user_id = $1 AND endpoint = $2`, [
    userId,
    endpoint.slice(0, 2048)
  ]);
}

export async function deletePushSubscriptionsForUser(userId: string) {
  await query(`DELETE FROM push_subscriptions WHERE user_id = $1`, [userId]);
}

export async function listPushSubscriptionsForUser(userId: string): Promise<PushSubscriptionRecord[]> {
  const result = await query<{
    id: string;
    endpoint: string;
    p256dh: string;
    auth: string;
  }>(
    `SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = $1`,
    [userId]
  );
  return result.rows;
}

export async function listUsersWithPushSubscriptions(): Promise<string[]> {
  const result = await query<{ user_id: string }>(
    `SELECT DISTINCT user_id FROM push_subscriptions`
  );
  return result.rows.map((row) => row.user_id);
}

export async function hasDigestBeenSent(userId: string, digestDate: string, digestKey: string) {
  const result = await query<{ exists: boolean }>(
    `SELECT EXISTS(
       SELECT 1 FROM push_daily_digest_log
       WHERE user_id = $1 AND digest_date = $2::date AND digest_key = $3
     ) AS exists`,
    [userId, digestDate, digestKey.slice(0, 64)]
  );
  return Boolean(result.rows[0]?.exists);
}

export async function markDigestSent(userId: string, digestDate: string, digestKey: string) {
  await query(
    `INSERT INTO push_daily_digest_log (user_id, digest_date, digest_key)
     VALUES ($1, $2::date, $3)
     ON CONFLICT (user_id, digest_date, digest_key) DO NOTHING`,
    [userId, digestDate, digestKey.slice(0, 64)]
  );
}
