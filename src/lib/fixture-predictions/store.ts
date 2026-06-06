import { query } from "@/lib/db";
import { fixtureKeyToShortLabel } from "@/lib/fixtures/fixture-key";
import { recordFixturePredictionEvent } from "@/lib/fixture-predictions/events";
import {
  detectPredictionAction,
  snapshotFromRecord,
  summarizePredictionChange
} from "@/lib/fixture-predictions/snapshot";
import {
  MAX_SCORER_PICKS,
  validateScorerPicksForScore,
  normalizeResultStatus,
  parseScorerPicks,
  type FixtureOutcome,
  type FixturePredictionRecord,
  type ScorerPick
} from "@/lib/fixture-predictions/types";

type PredictionRow = {
  id: string;
  fixture_key: string;
  predicted_outcome: string | null;
  home_score: number | null;
  away_score: number | null;
  scorer_picks: unknown;
  outcome_status: string;
  score_status: string;
  scorers_status: string;
  outcome_points_awarded: number;
  score_points_awarded: number;
  scorers_points_awarded: number;
  result_status: string | null;
  points_awarded: number | null;
  created_at: Date;
  updated_at: Date;
};

function mapRow(row: PredictionRow): FixturePredictionRecord {
  const legacyScoreStatus = row.result_status ? normalizeResultStatus(row.result_status) : null;
  return {
    id: row.id,
    fixtureKey: row.fixture_key,
    predictedOutcome:
      row.predicted_outcome === "home" || row.predicted_outcome === "draw" || row.predicted_outcome === "away"
        ? row.predicted_outcome
        : null,
    homeScore: row.home_score,
    awayScore: row.away_score,
    scorerPicks: parseScorerPicks(row.scorer_picks),
    outcomeStatus: normalizeResultStatus(row.outcome_status),
    scoreStatus: normalizeResultStatus(row.score_status ?? legacyScoreStatus ?? "pending"),
    scorersStatus: normalizeResultStatus(row.scorers_status),
    outcomePointsAwarded: row.outcome_points_awarded ?? 0,
    scorePointsAwarded: row.score_points_awarded ?? row.points_awarded ?? 0,
    scorersPointsAwarded: row.scorers_points_awarded ?? 0,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString()
  };
}

const SELECT_PREDICTION = `SELECT id, fixture_key, predicted_outcome, home_score, away_score, scorer_picks,
  COALESCE(outcome_status, 'pending') AS outcome_status,
  COALESCE(score_status, result_status, 'pending') AS score_status,
  COALESCE(scorers_status, 'pending') AS scorers_status,
  COALESCE(outcome_points_awarded, 0) AS outcome_points_awarded,
  COALESCE(score_points_awarded, points_awarded, 0) AS score_points_awarded,
  COALESCE(scorers_points_awarded, 0) AS scorers_points_awarded,
  result_status, points_awarded, created_at, updated_at`;

export async function getUserFixturePrediction(userId: string, fixtureKey: string) {
  const key = fixtureKey.trim().slice(0, 120);
  if (!key) return null;

  const result = await query<PredictionRow>(
    `${SELECT_PREDICTION}
     FROM fixture_predictions
     WHERE user_id = $1 AND fixture_key = $2`,
    [userId, key]
  );

  const row = result.rows[0];
  if (!row) return null;
  return mapRow(row);
}

function normalizeOutcome(value: unknown): FixtureOutcome | null {
  if (value === "home" || value === "draw" || value === "away") return value;
  return null;
}

function normalizeScore(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const score = Math.round(Number(value));
  if (!Number.isFinite(score) || score < 0 || score > 20) return null;
  return score;
}

export type PredictionChangeAction = "created" | "updated" | "deleted" | "unchanged";

export async function upsertUserFixturePrediction(input: {
  userId: string;
  fixtureKey: string;
  predictedOutcome?: FixtureOutcome | null;
  homeScore?: number | null;
  awayScore?: number | null;
  scorerPicks?: ScorerPick[];
}) {
  const key = input.fixtureKey.trim().slice(0, 120);
  if (!key) throw new Error("FIXTURE_KEY_REQUIRED");

  const existing = await getUserFixturePrediction(input.userId, key);

  const predictedOutcome =
    input.predictedOutcome !== undefined
      ? input.predictedOutcome
      : (existing?.predictedOutcome ?? null);

  const homeScore =
    input.homeScore !== undefined ? normalizeScore(input.homeScore) : (existing?.homeScore ?? null);
  const awayScore =
    input.awayScore !== undefined ? normalizeScore(input.awayScore) : (existing?.awayScore ?? null);

  const scorerPicks =
    input.scorerPicks !== undefined
      ? parseScorerPicks(input.scorerPicks)
      : (existing?.scorerPicks ?? []);

  if (scorerPicks.length > MAX_SCORER_PICKS) throw new Error("TOO_MANY_SCORERS");

  const scorerScoreError = validateScorerPicksForScore(scorerPicks, homeScore, awayScore);
  if (scorerScoreError) throw new Error(scorerScoreError);

  const hasOutcome = Boolean(predictedOutcome);
  const hasScore = homeScore !== null && awayScore !== null;
  const hasScorers = scorerPicks.length > 0;

  if (!hasOutcome && !hasScore && !hasScorers) {
    throw new Error("PICK_REQUIRED");
  }

  if ((homeScore !== null && awayScore === null) || (homeScore === null && awayScore !== null)) {
    throw new Error("INVALID_SCORE");
  }

  const result = await query<{ id: string }>(
    `INSERT INTO fixture_predictions (
       user_id, fixture_key, predicted_outcome, home_score, away_score, scorer_picks
     )
     VALUES ($1, $2, $3, $4, $5, $6::jsonb)
     ON CONFLICT (user_id, fixture_key)
     DO UPDATE SET
       predicted_outcome = EXCLUDED.predicted_outcome,
       home_score = EXCLUDED.home_score,
       away_score = EXCLUDED.away_score,
       scorer_picks = EXCLUDED.scorer_picks,
       updated_at = now()
     RETURNING id`,
    [
      input.userId,
      key,
      predictedOutcome,
      homeScore,
      awayScore,
      JSON.stringify(scorerPicks)
    ]
  );

  const id = result.rows[0]?.id ?? null;
  if (!id) return { id: null, change: "unchanged" as const };

  const nextRecord = await getUserFixturePrediction(input.userId, key);
  const previousSnapshot = snapshotFromRecord(existing);
  const nextSnapshot = snapshotFromRecord(nextRecord);
  const action = detectPredictionAction(previousSnapshot, nextSnapshot);

  if (action !== "unchanged") {
    const fixtureLabel = fixtureKeyToShortLabel(key);
    await recordFixturePredictionEvent({
      userId: input.userId,
      fixtureKey: key,
      action,
      summary: summarizePredictionChange({
        action,
        previous: previousSnapshot,
        next: nextSnapshot,
        fixtureLabel
      }),
      previousSnapshot,
      nextSnapshot
    });
  }

  return { id, change: action };
}

export async function deleteUserFixturePrediction(userId: string, fixtureKey: string) {
  const key = fixtureKey.trim().slice(0, 120);
  if (!key) throw new Error("FIXTURE_KEY_REQUIRED");

  const existing = await getUserFixturePrediction(userId, key);
  if (!existing) return { deleted: false, change: "unchanged" as const };

  const previousSnapshot = snapshotFromRecord(existing);

  await query(`DELETE FROM fixture_predictions WHERE user_id = $1 AND fixture_key = $2`, [
    userId,
    key
  ]);

  const fixtureLabel = fixtureKeyToShortLabel(key);
  await recordFixturePredictionEvent({
    userId,
    fixtureKey: key,
    action: "deleted",
    summary: summarizePredictionChange({
      action: "deleted",
      previous: previousSnapshot,
      next: null,
      fixtureLabel
    }),
    previousSnapshot,
    nextSnapshot: null
  });

  return { deleted: true, change: "deleted" as const };
}
