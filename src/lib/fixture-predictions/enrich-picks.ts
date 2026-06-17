import type { GradeResult } from "@/lib/fixture-predictions/grading";
import { gradeFixturePrediction } from "@/lib/fixture-predictions/grading";
import {
  lookupFinishedMatchFacts,
  type FinishedMatchIndex
} from "@/lib/fixture-predictions/finished-match-index";
import type { PredictionPickSummary } from "@/lib/fixture-predictions/overview";
import type { PredictionResultStatus } from "@/lib/fixture-predictions/types";

function effectiveCategory(
  dbStatus: PredictionResultStatus,
  dbPoints: number,
  computed: GradeResult | null
) {
  if (dbStatus !== "pending") {
    return { status: dbStatus, points: dbPoints };
  }
  if (computed) {
    return { status: computed.status, points: computed.points };
  }
  return { status: dbStatus as PredictionResultStatus, points: dbPoints };
}

export function enrichPredictionPickWithFinishedMatch(
  pick: PredictionPickSummary,
  index: FinishedMatchIndex | null
): PredictionPickSummary {
  if (!index) return pick;

  const facts = lookupFinishedMatchFacts(index, pick.fixtureKey);
  if (!facts) return pick;

  const grades = gradeFixturePrediction(pick, facts);
  const outcome = effectiveCategory(
    pick.outcomeStatus,
    pick.outcomePointsAwarded,
    grades.outcome
  );
  const score = effectiveCategory(pick.scoreStatus, pick.scorePointsAwarded, grades.score);
  const scorers = effectiveCategory(
    pick.scorersStatus,
    pick.scorersPointsAwarded,
    grades.scorers
  );

  return {
    ...pick,
    outcomeStatus: pick.predictedOutcome ? outcome.status : pick.outcomeStatus,
    scoreStatus: pick.homeScore !== null && pick.awayScore !== null ? score.status : pick.scoreStatus,
    scorersStatus: pick.scorerPicks.length > 0 ? scorers.status : pick.scorersStatus,
    outcomePointsAwarded: pick.predictedOutcome ? outcome.points : pick.outcomePointsAwarded,
    scorePointsAwarded:
      pick.homeScore !== null && pick.awayScore !== null ? score.points : pick.scorePointsAwarded,
    scorersPointsAwarded: pick.scorerPicks.length > 0 ? scorers.points : pick.scorersPointsAwarded
  };
}
