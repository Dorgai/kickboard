import { query } from "@/lib/db";
import {
  gradeFixturePrediction,
  type FixturePredictionGrades,
  type GradeResult
} from "@/lib/fixture-predictions/grading";
import {
  buildFinishedMatchIndex,
  lookupFinishedMatchFacts
} from "@/lib/fixture-predictions/finished-match-index";
import { parseScorerPicks } from "@/lib/fixture-predictions/types";
import { creditUserPredictionPoints } from "@/lib/predictions/wallet";

type PendingPredictionRow = {
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
};

async function applyCategorySettlement(input: {
  predictionId: string;
  userId: string;
  fixtureKey: string;
  category: "outcome" | "score" | "scorers";
  grade: GradeResult;
}) {
  const column =
    input.category === "outcome"
      ? "outcome"
      : input.category === "score"
        ? "score"
        : "scorers";

  const updated = await query<{ points: number }>(
    `UPDATE fixture_predictions
     SET ${column}_status = $3,
         ${column}_points_awarded = $4,
         updated_at = now()
     WHERE id = $1
       AND user_id = $2
       AND ${column}_status = 'pending'
     RETURNING ${column}_points_awarded AS points`,
    [input.predictionId, input.userId, input.grade.status, input.grade.points]
  );

  if (!updated.rows[0]) return false;

  if (input.grade.points > 0) {
    await creditUserPredictionPoints({
      userId: input.userId,
      amount: input.grade.points,
      referenceId: input.predictionId,
      partial: input.grade.status === "partial",
      note: `${input.category} pick · ${input.fixtureKey}`
    });
  }

  return true;
}

function shouldSettleCategory(
  row: PendingPredictionRow,
  category: keyof FixturePredictionGrades,
  grade: GradeResult | null
) {
  if (!grade) return false;
  const statusColumn =
    category === "outcome" ? row.outcome_status : category === "score" ? row.score_status : row.scorers_status;
  return statusColumn === "pending";
}

export async function settleFixturePredictions() {
  const index = await buildFinishedMatchIndex();
  if (!index.byFixtureKey.size && !index.bySlugPair.size) {
    return { examined: 0, settledCategories: 0, skippedNoResult: 0 };
  }

  const pending = await query<PendingPredictionRow>(
    `SELECT id, user_id, fixture_key, predicted_outcome, home_score, away_score, scorer_picks,
            COALESCE(outcome_status, 'pending') AS outcome_status,
            COALESCE(score_status, 'pending') AS score_status,
            COALESCE(scorers_status, 'pending') AS scorers_status
     FROM fixture_predictions
     WHERE outcome_status = 'pending'
        OR score_status = 'pending'
        OR scorers_status = 'pending'
     ORDER BY updated_at ASC
     LIMIT 2000`
  );

  let settledCategories = 0;
  let skippedNoResult = 0;

  for (const row of pending.rows) {
    const facts = lookupFinishedMatchFacts(index, row.fixture_key);
    if (!facts) {
      skippedNoResult += 1;
      continue;
    }

    const grades = gradeFixturePrediction(
      {
        predictedOutcome:
          row.predicted_outcome === "home" || row.predicted_outcome === "draw" || row.predicted_outcome === "away"
            ? row.predicted_outcome
            : null,
        homeScore: row.home_score,
        awayScore: row.away_score,
        scorerPicks: parseScorerPicks(row.scorer_picks)
      },
      facts
    );

    for (const category of ["outcome", "score", "scorers"] as const) {
      const grade = grades[category];
      if (!shouldSettleCategory(row, category, grade)) continue;
      const applied = await applyCategorySettlement({
        predictionId: row.id,
        userId: row.user_id,
        fixtureKey: row.fixture_key,
        category,
        grade: grade!
      });
      if (applied) settledCategories += 1;
    }
  }

  return {
    examined: pending.rows.length,
    settledCategories,
    skippedNoResult
  };
}
