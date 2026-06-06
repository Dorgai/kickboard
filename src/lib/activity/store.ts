import { query } from "@/lib/db";

const ONLINE_THRESHOLD_MS = 3 * 60 * 1000;
const SESSION_GAP_MINUTES = 30;

export type ActivityEventType =
  | "sign_in"
  | "page_view"
  | "post_created"
  | "fan_chat_sent"
  | "fan_chat_broadcast"
  | "squad_saved"
  | "squad_published"
  | "connection_request"
  | "connection_accepted"
  | "prediction_saved"
  | "prediction_updated"
  | "prediction_deleted"
  | "onboarding_complete";

export async function touchPresence(
  userId: string,
  input: { userAgent?: string | null; pagePath?: string | null }
) {
  const existing = await query<{ id: string }>(
    `SELECT id
     FROM user_presence_sessions
     WHERE user_id = $1
       AND ended_at IS NULL
       AND last_seen_at > now() - ($2::text || ' minutes')::interval
     ORDER BY last_seen_at DESC
     LIMIT 1`,
    [userId, String(SESSION_GAP_MINUTES)]
  );

  const pagePath = input.pagePath?.trim().slice(0, 500) ?? null;
  const userAgent = input.userAgent?.trim().slice(0, 500) ?? null;

  if (existing.rows[0]?.id) {
    await query(
      `UPDATE user_presence_sessions
       SET last_seen_at = now(),
           last_page_path = COALESCE($2, last_page_path),
           user_agent = COALESCE($3, user_agent)
       WHERE id = $1`,
      [existing.rows[0].id, pagePath, userAgent]
    );
    return existing.rows[0].id;
  }

  const inserted = await query<{ id: string }>(
    `INSERT INTO user_presence_sessions (user_id, user_agent, last_page_path)
     VALUES ($1, $2, $3)
     RETURNING id`,
    [userId, userAgent, pagePath]
  );

  return inserted.rows[0]?.id ?? null;
}

export async function recordActivityEvent(input: {
  userId: string;
  eventType: ActivityEventType | string;
  summary: string;
  metadata?: Record<string, unknown>;
  sessionId?: string | null;
}) {
  const summary = input.summary.trim().slice(0, 500);
  if (!summary) return;

  await query(
    `INSERT INTO user_activity_events (user_id, session_id, event_type, summary, metadata)
     VALUES ($1, $2, $3, $4, $5::jsonb)`,
    [
      input.userId,
      input.sessionId ?? null,
      input.eventType.slice(0, 64),
      summary,
      JSON.stringify(input.metadata ?? {})
    ]
  );
}

export async function recordActivityWithPresence(input: {
  userId: string;
  eventType: ActivityEventType | string;
  summary: string;
  metadata?: Record<string, unknown>;
  userAgent?: string | null;
  pagePath?: string | null;
}) {
  const sessionId = await touchPresence(input.userId, {
    userAgent: input.userAgent,
    pagePath: input.pagePath
  });
  await recordActivityEvent({
    userId: input.userId,
    eventType: input.eventType,
    summary: input.summary,
    metadata: input.metadata,
    sessionId
  });
  return sessionId;
}

export function isUserOnline(lastSeenAt: Date | string | null | undefined) {
  if (!lastSeenAt) return false;
  const seen = lastSeenAt instanceof Date ? lastSeenAt : new Date(lastSeenAt);
  if (Number.isNaN(seen.getTime())) return false;
  return Date.now() - seen.getTime() <= ONLINE_THRESHOLD_MS;
}

function isOnline(lastSeenAt: Date) {
  return isUserOnline(lastSeenAt);
}

export type UserPresenceSnapshot = {
  userId: string;
  online: boolean;
  lastSeenAt: string | null;
};

export async function getPresenceForUserIds(userIds: string[]): Promise<UserPresenceSnapshot[]> {
  const uniqueIds = [...new Set(userIds.filter(Boolean))];
  if (!uniqueIds.length) return [];

  const result = await query<{
    user_id: string;
    last_seen_at: Date;
  }>(
    `SELECT user_id, max(last_seen_at) AS last_seen_at
     FROM user_presence_sessions
     WHERE user_id = ANY($1::uuid[])
       AND ended_at IS NULL
     GROUP BY user_id`,
    [uniqueIds]
  );

  const byUserId = new Map(
    result.rows.map((row) => [
      row.user_id,
      {
        userId: row.user_id,
        online: isUserOnline(row.last_seen_at),
        lastSeenAt: row.last_seen_at.toISOString()
      }
    ])
  );

  return uniqueIds.map(
    (userId) =>
      byUserId.get(userId) ?? {
        userId,
        online: false,
        lastSeenAt: null
      }
  );
}

export async function listUsersActivityForAdmin(options: {
  queryText?: string;
  userId?: string;
  onlineOnly?: boolean;
  from?: string;
  to?: string;
  limit?: number;
}) {
  const limit = Math.min(Math.max(options.limit ?? 40, 1), 100);
  const q = options.queryText?.trim().slice(0, 80);
  const pattern = q ? `%${q.replace(/[%_]/g, "")}%` : null;

  const result = await query<{
    id: string;
    email: string;
    username: string;
    display_name: string | null;
    last_seen_at: Date | null;
    active_session_id: string | null;
    session_started_at: Date | null;
    last_page_path: string | null;
    event_count: string;
    last_event_at: Date | null;
  }>(
    `SELECT u.id, u.email, u.username, u.display_name,
            ps.last_seen_at,
            ps.id AS active_session_id,
            ps.started_at AS session_started_at,
            ps.last_page_path,
            COALESCE(ev.cnt, 0)::text AS event_count,
            ev.last_at AS last_event_at
     FROM users u
     LEFT JOIN LATERAL (
       SELECT id, started_at, last_seen_at, last_page_path
       FROM user_presence_sessions
       WHERE user_id = u.id AND ended_at IS NULL
       ORDER BY last_seen_at DESC
       LIMIT 1
     ) ps ON true
     LEFT JOIN LATERAL (
       SELECT count(*)::bigint AS cnt, max(created_at) AS last_at
       FROM user_activity_events e
       WHERE e.user_id = u.id
         AND ($4::timestamptz IS NULL OR e.created_at >= $4::timestamptz)
         AND ($5::timestamptz IS NULL OR e.created_at <= $5::timestamptz)
     ) ev ON true
     WHERE u.deleted_at IS NULL
       AND ($1::uuid IS NULL OR u.id = $1::uuid)
       AND (
         $2::text IS NULL
         OR u.username ILIKE $2
         OR u.email ILIKE $2
         OR COALESCE(u.display_name, '') ILIKE $2
       )
     ORDER BY ps.last_seen_at DESC NULLS LAST, ev.last_at DESC NULLS LAST
     LIMIT $3`,
    [options.userId ?? null, pattern, limit, options.from ?? null, options.to ?? null]
  );

  return result.rows
    .map((row) => {
      const lastSeen = row.last_seen_at;
      const online = lastSeen ? isOnline(lastSeen) : false;
      const sessionStarted = row.session_started_at;
      const sessionDurationMs =
        online && sessionStarted ? Date.now() - sessionStarted.getTime() : null;

      return {
        userId: row.id,
        email: row.email,
        username: row.username,
        displayName: row.display_name,
        online,
        lastSeenAt: lastSeen?.toISOString() ?? null,
        activeSessionId: row.active_session_id,
        sessionStartedAt: sessionStarted?.toISOString() ?? null,
        sessionDurationMinutes:
          sessionDurationMs !== null ? Math.round(sessionDurationMs / 60000) : null,
        lastPagePath: row.last_page_path,
        eventCount: Number(row.event_count),
        lastEventAt: row.last_event_at?.toISOString() ?? null
      };
    })
    .filter((row) => !options.onlineOnly || row.online);
}

export async function listPresenceSessionsForAdmin(userId: string, limit = 40) {
  const result = await query<{
    id: string;
    started_at: Date;
    last_seen_at: Date;
    ended_at: Date | null;
    last_page_path: string | null;
    user_agent: string | null;
  }>(
    `SELECT id, started_at, last_seen_at, ended_at, last_page_path, user_agent
     FROM user_presence_sessions
     WHERE user_id = $1
     ORDER BY started_at DESC
     LIMIT $2`,
    [userId, limit]
  );

  return result.rows.map((row) => {
    const endMs = row.ended_at?.getTime() ?? row.last_seen_at.getTime();
    const durationMs = Math.max(0, endMs - row.started_at.getTime());
    return {
      id: row.id,
      startedAt: row.started_at.toISOString(),
      lastSeenAt: row.last_seen_at.toISOString(),
      endedAt: row.ended_at?.toISOString() ?? null,
      lastPagePath: row.last_page_path,
      userAgent: row.user_agent,
      durationMinutes: Math.round(durationMs / 60000),
      online: !row.ended_at && isOnline(row.last_seen_at)
    };
  });
}

export async function listActivityEventsForAdmin(options: {
  userId?: string;
  queryText?: string;
  eventType?: string;
  from?: string;
  to?: string;
  limit?: number;
}) {
  const limit = Math.min(Math.max(options.limit ?? 80, 1), 200);
  const q = options.queryText?.trim().slice(0, 80);
  const pattern = q ? `%${q.replace(/[%_]/g, "")}%` : null;

  const result = await query<{
    id: string;
    user_id: string;
    username: string;
    display_name: string | null;
    email: string;
    event_type: string;
    summary: string;
    metadata: Record<string, unknown>;
    created_at: Date;
    session_id: string | null;
  }>(
    `SELECT e.id, e.user_id, u.username, u.display_name, u.email,
            e.event_type, e.summary, e.metadata, e.created_at, e.session_id
     FROM user_activity_events e
     INNER JOIN users u ON u.id = e.user_id
     WHERE ($1::uuid IS NULL OR e.user_id = $1::uuid)
       AND ($2::text IS NULL OR e.event_type = $2)
       AND ($3::timestamptz IS NULL OR e.created_at >= $3::timestamptz)
       AND ($4::timestamptz IS NULL OR e.created_at <= $4::timestamptz)
       AND (
         $5::text IS NULL
         OR e.summary ILIKE $5
         OR e.event_type ILIKE $5
         OR u.username ILIKE $5
         OR u.email ILIKE $5
       )
     ORDER BY e.created_at DESC
     LIMIT $6`,
    [
      options.userId ?? null,
      options.eventType?.trim() || null,
      options.from ?? null,
      options.to ?? null,
      pattern,
      limit
    ]
  );

  return result.rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    username: row.username,
    displayName: row.display_name,
    email: row.email,
    eventType: row.event_type,
    summary: row.summary,
    metadata: row.metadata,
    createdAt: row.created_at.toISOString(),
    sessionId: row.session_id
  }));
}

export async function getOnlineUserCount() {
  const result = await query<{ count: string }>(
    `SELECT count(DISTINCT user_id)::text AS count
     FROM user_presence_sessions
     WHERE ended_at IS NULL
       AND last_seen_at > now() - ($1::text || ' minutes')::interval`,
    [String(Math.ceil(ONLINE_THRESHOLD_MS / 60000))]
  );
  return Number(result.rows[0]?.count ?? 0);
}
