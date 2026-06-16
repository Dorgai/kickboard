import { getPool } from "@/lib/db";
import { loadMatchBoard } from "@/lib/fixtures/match-board";
import type { MatchBoardFixtureState } from "@/lib/fixtures/match-board-shared";
import {
  scoreFixturePrediction,
  type FixturePredictionScore,
  type FixtureResultForScoring
} from "@/lib/fixture-predictions/scoring";
import {
  normalizeResultStatus,
  parseScorerPicks,
  type FixtureOutcome,
  type PredictionResultStatus
} from "@/lib/fixture-predictions/types";

type PredictionSettlementRow = {
  id: string;
  user_id: string;
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
};

export type FixturePredictionSettlementResult = {
  connected: boolean;
  fixtures: number;
  predictionsChecked: number;
  predictionsUpdated: number;
  pointsAwarded: number;
  message?: string;
};

type FinishedFixtureResult = FixtureResultForScoring & {
  fixtureKey: string;
};

function isFinishedResult(
  entry: [string, MatchBoardFixtureState]
): entry is [string, MatchBoardFixtureState & { homeGoals: number; awayGoals: number }] {
  const [, state] = entry;
  return state.status === "finished" && state.homeGoals !== null && state.awayGoals !== null;
}

function normalizeOutcome(value: string | null): FixtureOutcome | null {
  if (value === "home" || value === "draw" || value === "away") return value;
  return null;
}

function previousPoints(row: PredictionSettlementRow) {
  return (
    (row.outcome_points_awarded ?? 0) +
    (row.score_points_awarded ?? 0) +
    (row.scorers_points_awarded ?? 0)
  );
}

function changed(row: PredictionSettlementRow, next: FixturePredictionScore) {
  return (
    normalizeResultStatus(row.outcome_status) !== next.outcomeStatus ||
    normalizeResultStatus(row.score_status) !== next.scoreStatus ||
    normalizeResultStatus(row.scorers_status) !== next.scorersStatus ||
    (row.outcome_points_awarded ?? 0) !== next.outcomePointsAwarded ||
    (row.score_points_awarded ?? 0) !== next.scorePointsAwarded ||
    (row.scorers_points_awarded ?? 0) !== next.scorersPointsAwarded
  );
}

function transactionTypeFor(score: FixturePredictionScore): "prediction_correct" | "prediction_partial" {
  const statuses: PredictionResultStatus[] = [
    score.outcomeStatus,
    score.scoreStatus,
    score.scorersStatus
  ].filter((status) => status !== "void" && status !== "pending");
  return statuses.some((status) => status === "partial")
    ? "prediction_partial"
    : "prediction_correct";
}

export async function settleFinishedFixturePredictionsFromResults(
  results: FinishedFixtureResult[]
): Promise<FixturePredictionSettlementResult> {
  const pool = getPool();
  if (!pool) {
    return {
      connected: false,
      fixtures: results.length,
      predictionsChecked: 0,
      predictionsUpdated: 0,
      pointsAwarded: 0,
      message: "Database is not configured."
    };
  }

  const resultsByKey = new Map(results.map((result) => [result.fixtureKey, result]));
  if (!resultsByKey.size) {
    return {
      connected: true,
      fixtures: 0,
      predictionsChecked: 0,
      predictionsUpdated: 0,
      pointsAwarded: 0
    };
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const predictionRows = await client.query<PredictionSettlementRow>(
      `SELECT id, user_id, fixture_key, predicted_outcome, home_score, away_score, scorer_picks,
              COALESCE(outcome_status, 'pending') AS outcome_status,
              COALESCE(score_status, result_status, 'pending') AS score_status,
              COALESCE(scorers_status, 'pending') AS scorers_status,
              COALESCE(outcome_points_awarded, 0) AS outcome_points_awarded,
              COALESCE(score_points_awarded, points_awarded, 0) AS score_points_awarded,
              COALESCE(scorers_points_awarded, 0) AS scorers_points_awarded
       FROM fixture_predictions
       WHERE fixture_key = ANY($1::text[])
       FOR UPDATE`,
      [[...resultsByKey.keys()]]
    );

    let predictionsUpdated = 0;
    let pointsAwarded = 0;

    for (const row of predictionRows.rows) {
      const result = resultsByKey.get(row.fixture_key);
      if (!result) continue;

      const next = scoreFixturePrediction(
        {
          predictedOutcome: normalizeOutcome(row.predicted_outcome),
          homeScore: row.home_score,
          awayScore: row.away_score,
          scorerPicks: parseScorerPicks(row.scorer_picks)
        },
        result
      );

      if (!changed(row, next)) continue;

      const delta = next.totalPointsAwarded - previousPoints(row);

      await client.query(
        `UPDATE fixture_predictions
         SET outcome_status = $1,
             score_status = $2,
             scorers_status = $3,
             outcome_points_awarded = $4,
             score_points_awarded = $5,
             scorers_points_awarded = $6,
             result_status = $2,
             points_awarded = $5
         WHERE id = $7`,
        [
          next.outcomeStatus,
          next.scoreStatus,
          next.scorersStatus,
          next.outcomePointsAwarded,
          next.scorePointsAwarded,
          next.scorersPointsAwarded,
          row.id
        ]
      );

      predictionsUpdated += 1;

      if (delta === 0) continue;

      const balance = await client.query<{ points_balance: number }>(
        `UPDATE users
         SET points_balance = GREATEST(points_balance + $1, 0),
             updated_at = now()
         WHERE id = $2
         RETURNING points_balance`,
        [delta, row.user_id]
      );

      const balanceAfter = balance.rows[0]?.points_balance ?? 0;
      await client.query(
        `INSERT INTO wallet_ledger (user_id, amount, balance_after, transaction_type, reference_id, note)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          row.user_id,
          delta,
          balanceAfter,
          delta > 0 ? transactionTypeFor(next) : "admin_adjustment",
          row.id,
          `Fixture prediction settled for ${row.fixture_key}`
        ]
      );

      pointsAwarded += delta;
    }

    await client.query("COMMIT");

    return {
      connected: true,
      fixtures: resultsByKey.size,
      predictionsChecked: predictionRows.rowCount ?? predictionRows.rows.length,
      predictionsUpdated,
      pointsAwarded
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function settleRecentFinishedFixturePredictions(): Promise<FixturePredictionSettlementResult> {
  const payload = await loadMatchBoard();
  if (!payload.connected) {
    return {
      connected: false,
      fixtures: 0,
      predictionsChecked: 0,
      predictionsUpdated: 0,
      pointsAwarded: 0,
      message: payload.message ?? "Match board is not connected."
    };
  }

  const results: FinishedFixtureResult[] = Object.entries(payload.byKey)
    .filter(isFinishedResult)
    .map(([fixtureKey, state]) => ({
      fixtureKey,
      homeGoals: state.homeGoals,
      awayGoals: state.awayGoals,
      goalScorers: state.goalScorers
    }));

  return settleFinishedFixturePredictionsFromResults(results);
}
