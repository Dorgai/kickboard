import { query } from "@/lib/db";
import type { UserAlert, UserAlertCategory } from "@/lib/alerts/types";

type AlertRow = {
  id: string;
  alert_key: string;
  category: UserAlertCategory;
  title: string;
  body: string;
  href: string;
  actor_user_id: string | null;
  actor_display_name: string | null;
  fixture_key: string | null;
  occurred_at: Date;
  read_at: Date | null;
};

function mapRow(row: AlertRow): UserAlert {
  return {
    id: row.id,
    alertKey: row.alert_key,
    category: row.category,
    title: row.title,
    body: row.body,
    href: row.href,
    actorUserId: row.actor_user_id,
    actorDisplayName: row.actor_display_name,
    fixtureKey: row.fixture_key,
    occurredAt: row.occurred_at.toISOString(),
    readAt: row.read_at?.toISOString() ?? null
  };
}

export async function upsertUserAlert(input: {
  userId: string;
  alertKey: string;
  category: UserAlertCategory;
  title: string;
  body: string;
  href: string;
  occurredAt: Date;
  actorUserId?: string | null;
  fixtureKey?: string | null;
}) {
  const key = input.alertKey.slice(0, 180);
  const title = input.title.trim().slice(0, 120);
  const body = input.body.trim().slice(0, 400);
  const href = input.href.trim().slice(0, 200) || "/";

  await query(
    `INSERT INTO user_alerts (
       user_id, alert_key, category, title, body, href,
       actor_user_id, fixture_key, occurred_at
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT (user_id, alert_key)
     DO UPDATE SET
       category = EXCLUDED.category,
       title = EXCLUDED.title,
       body = EXCLUDED.body,
       href = EXCLUDED.href,
       actor_user_id = EXCLUDED.actor_user_id,
       fixture_key = EXCLUDED.fixture_key,
       occurred_at = EXCLUDED.occurred_at,
       read_at = CASE
         WHEN user_alerts.occurred_at IS DISTINCT FROM EXCLUDED.occurred_at THEN NULL
         ELSE user_alerts.read_at
       END`,
    [
      input.userId,
      key,
      input.category,
      title,
      body,
      href,
      input.actorUserId ?? null,
      input.fixtureKey?.slice(0, 120) ?? null,
      input.occurredAt
    ]
  );
}

export async function pruneOldAlerts(userId: string, keepDays = 30) {
  await query(
    `DELETE FROM user_alerts
     WHERE user_id = $1 AND occurred_at < now() - ($2::text || ' days')::interval`,
    [userId, String(keepDays)]
  );
}

export async function listUserAlerts(userId: string, limit = 40) {
  const result = await query<AlertRow>(
    `SELECT a.id, a.alert_key, a.category, a.title, a.body, a.href,
            a.actor_user_id, u.display_name AS actor_display_name, a.fixture_key,
            a.occurred_at, a.read_at
     FROM user_alerts a
     LEFT JOIN users u ON u.id = a.actor_user_id
     WHERE a.user_id = $1
     ORDER BY a.occurred_at DESC
     LIMIT $2`,
    [userId, limit]
  );
  return result.rows.map(mapRow);
}

export async function countUnreadAlerts(userId: string) {
  const result = await query<{ count: string }>(
    `SELECT count(*)::text AS count
     FROM user_alerts
     WHERE user_id = $1 AND read_at IS NULL`,
    [userId]
  );
  return Number(result.rows[0]?.count ?? 0);
}

export async function markAlertRead(userId: string, alertId: string) {
  const result = await query<{ id: string }>(
    `UPDATE user_alerts
     SET read_at = now()
     WHERE id = $1 AND user_id = $2 AND read_at IS NULL
     RETURNING id`,
    [alertId, userId]
  );
  return Boolean(result.rows[0]);
}

export async function markAllAlertsRead(userId: string) {
  await query(
    `UPDATE user_alerts SET read_at = now() WHERE user_id = $1 AND read_at IS NULL`,
    [userId]
  );
}
