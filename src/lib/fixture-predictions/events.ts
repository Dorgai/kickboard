import { deliverUserAlert } from "@/lib/alerts/deliver";
import { recordActivityEvent } from "@/lib/activity/store";
import { listAcceptedPeerIds } from "@/lib/connections/store";
import { query } from "@/lib/db";
import { fixtureKeyToShortLabel } from "@/lib/fixtures/fixture-key";
import {
  describePredictionSnapshot,
  type PredictionSnapshot
} from "@/lib/fixture-predictions/snapshot";

export type PredictionEventAction = "created" | "updated" | "deleted";

export type FixturePredictionEventRow = {
  id: string;
  userId: string;
  fixtureKey: string;
  action: PredictionEventAction;
  summary: string;
  previousSnapshot: PredictionSnapshot | null;
  nextSnapshot: PredictionSnapshot | null;
  createdAt: string;
  username?: string;
  displayName?: string | null;
};

function parseSnapshot(raw: unknown): PredictionSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const predictedOutcome =
    row.predictedOutcome === "home" || row.predictedOutcome === "draw" || row.predictedOutcome === "away"
      ? row.predictedOutcome
      : null;
  const homeScore = typeof row.homeScore === "number" ? row.homeScore : null;
  const awayScore = typeof row.awayScore === "number" ? row.awayScore : null;
  const scorerPicks = Array.isArray(row.scorerPicks) ? row.scorerPicks : [];
  return {
    predictedOutcome,
    homeScore,
    awayScore,
    scorerPicks: scorerPicks as PredictionSnapshot["scorerPicks"]
  };
}

function mapEventRow(row: {
  id: string;
  user_id: string;
  fixture_key: string;
  action: string;
  summary: string;
  previous_snapshot: unknown;
  next_snapshot: unknown;
  created_at: Date;
  username?: string;
  display_name?: string | null;
}): FixturePredictionEventRow {
  return {
    id: row.id,
    userId: row.user_id,
    fixtureKey: row.fixture_key,
    action: row.action as PredictionEventAction,
    summary: row.summary,
    previousSnapshot: parseSnapshot(row.previous_snapshot),
    nextSnapshot: parseSnapshot(row.next_snapshot),
    createdAt: row.created_at.toISOString(),
    username: row.username,
    displayName: row.display_name ?? null
  };
}

async function getActorLabel(userId: string) {
  const result = await query<{ username: string; display_name: string | null }>(
    `SELECT username, display_name FROM users WHERE id = $1`,
    [userId]
  );
  const row = result.rows[0];
  if (!row) return "A connection";
  return row.display_name?.trim() || row.username;
}

export async function recordFixturePredictionEvent(input: {
  userId: string;
  fixtureKey: string;
  action: PredictionEventAction;
  summary: string;
  previousSnapshot: PredictionSnapshot | null;
  nextSnapshot: PredictionSnapshot | null;
}) {
  const result = await query<{ id: string }>(
    `INSERT INTO fixture_prediction_events (
       user_id, fixture_key, action, summary, previous_snapshot, next_snapshot
     )
     VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb)
     RETURNING id`,
    [
      input.userId,
      input.fixtureKey.trim().slice(0, 120),
      input.action,
      input.summary.trim().slice(0, 320),
      input.previousSnapshot ? JSON.stringify(input.previousSnapshot) : null,
      input.nextSnapshot ? JSON.stringify(input.nextSnapshot) : null
    ]
  );

  const eventId = result.rows[0]?.id;
  if (!eventId) return null;

  void recordActivityEvent({
    userId: input.userId,
    eventType:
      input.action === "created"
        ? "prediction_saved"
        : input.action === "deleted"
          ? "prediction_deleted"
          : "prediction_updated",
    summary: input.summary,
    metadata: {
      eventId,
      fixtureKey: input.fixtureKey,
      action: input.action
    }
  }).catch(() => undefined);

  const actorName = await getActorLabel(input.userId);
  const fixtureLabel = fixtureKeyToShortLabel(input.fixtureKey);
  const peerIds = await listAcceptedPeerIds(input.userId);

  const title =
    input.action === "deleted"
      ? `${actorName} removed picks`
      : input.action === "created"
        ? `${actorName} added picks`
        : `${actorName} changed picks`;

  const body =
    input.action === "deleted"
      ? `${fixtureLabel} — was ${describePredictionSnapshot(input.previousSnapshot)}`
      : `${fixtureLabel} — ${describePredictionSnapshot(input.nextSnapshot)}`;

  await Promise.all(
    peerIds.map((peerId) =>
      deliverUserAlert({
        userId: peerId,
        alertKey: `connection:prediction-event:${eventId}`,
        category: "connection_activity",
        title,
        body,
        href: "/#predictions",
        actorUserId: input.userId,
        fixtureKey: input.fixtureKey,
        occurredAt: new Date(),
        push: true
      })
    )
  );

  return eventId;
}

export async function listUserPredictionEvents(userId: string, limit = 40) {
  const result = await query<{
    id: string;
    user_id: string;
    fixture_key: string;
    action: string;
    summary: string;
    previous_snapshot: unknown;
    next_snapshot: unknown;
    created_at: Date;
  }>(
    `SELECT id, user_id, fixture_key, action, summary, previous_snapshot, next_snapshot, created_at
     FROM fixture_prediction_events
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [userId, limit]
  );

  return result.rows.map((row) => mapEventRow(row));
}

export async function listConnectionPredictionEvents(userId: string, limit = 60) {
  const peerIds = await listAcceptedPeerIds(userId);
  if (!peerIds.length) return [];

  const result = await query<{
    id: string;
    user_id: string;
    fixture_key: string;
    action: string;
    summary: string;
    previous_snapshot: unknown;
    next_snapshot: unknown;
    created_at: Date;
    username: string;
    display_name: string | null;
  }>(
    `SELECT e.id, e.user_id, e.fixture_key, e.action, e.summary, e.previous_snapshot, e.next_snapshot,
            e.created_at, u.username, u.display_name
     FROM fixture_prediction_events e
     INNER JOIN users u ON u.id = e.user_id
     WHERE e.user_id = ANY($1::uuid[])
     ORDER BY e.created_at DESC
     LIMIT $2`,
    [peerIds, limit]
  );

  return result.rows.map((row) => mapEventRow(row));
}
