import type { MatchBoardGoal } from "@/lib/fixtures/match-board-shared";
import type {
  FixtureOutcome,
  PredictionResultStatus,
  ScorerPick
} from "@/lib/fixture-predictions/types";

export const FIXTURE_SCORING_POINTS = {
  outcome: 3,
  exactScore: 5,
  scorer: 1
} as const;

export type FixturePredictionScoringInput = {
  predictedOutcome: FixtureOutcome | null;
  homeScore: number | null;
  awayScore: number | null;
  scorerPicks: ScorerPick[];
};

export type FixtureResultForScoring = {
  homeGoals: number;
  awayGoals: number;
  goalScorers: MatchBoardGoal[];
};

export type FixturePredictionScore = {
  outcomeStatus: PredictionResultStatus;
  scoreStatus: PredictionResultStatus;
  scorersStatus: PredictionResultStatus;
  outcomePointsAwarded: number;
  scorePointsAwarded: number;
  scorersPointsAwarded: number;
  totalPointsAwarded: number;
};

export function outcomeFromGoalTotals(homeGoals: number, awayGoals: number): FixtureOutcome {
  if (homeGoals > awayGoals) return "home";
  if (awayGoals > homeGoals) return "away";
  return "draw";
}

function normalizeName(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function scorerKey(goal: MatchBoardGoal | ScorerPick) {
  const playerId = "playerId" in goal ? goal.playerId : null;
  if (typeof playerId === "number" && Number.isFinite(playerId)) {
    return `${goal.teamSide}:id:${playerId}`;
  }
  return `${goal.teamSide}:name:${normalizeName(goal.playerName)}`;
}

function countScorerMatches(picks: ScorerPick[], actualScorers: MatchBoardGoal[]) {
  const remaining = new Map<string, number>();
  for (const scorer of actualScorers) {
    const key = scorerKey(scorer);
    remaining.set(key, (remaining.get(key) ?? 0) + 1);
  }

  let matches = 0;
  for (const pick of picks) {
    const key = scorerKey(pick);
    const count = remaining.get(key) ?? 0;
    if (count <= 0) continue;
    matches += 1;
    if (count === 1) remaining.delete(key);
    else remaining.set(key, count - 1);
  }
  return matches;
}

function scorerStatus({
  picks,
  result
}: {
  picks: ScorerPick[];
  result: FixtureResultForScoring;
}): { status: PredictionResultStatus; points: number } {
  if (!picks.length) return { status: "void", points: 0 };

  const totalGoals = result.homeGoals + result.awayGoals;
  if (totalGoals > 0 && result.goalScorers.length === 0) {
    return { status: "pending", points: 0 };
  }

  const matched = countScorerMatches(picks, result.goalScorers);
  if (matched === 0) return { status: "lost", points: 0 };

  const points = matched * FIXTURE_SCORING_POINTS.scorer;
  return {
    status: matched === picks.length ? "won" : "partial",
    points
  };
}

export function scoreFixturePrediction(
  prediction: FixturePredictionScoringInput,
  result: FixtureResultForScoring
): FixturePredictionScore {
  const actualOutcome = outcomeFromGoalTotals(result.homeGoals, result.awayGoals);

  const outcomeStatus: PredictionResultStatus = prediction.predictedOutcome
    ? prediction.predictedOutcome === actualOutcome
      ? "won"
      : "lost"
    : "void";
  const outcomePointsAwarded =
    outcomeStatus === "won" ? FIXTURE_SCORING_POINTS.outcome : 0;

  const hasScore = prediction.homeScore !== null && prediction.awayScore !== null;
  const scoreStatus: PredictionResultStatus = hasScore
    ? prediction.homeScore === result.homeGoals && prediction.awayScore === result.awayGoals
      ? "won"
      : "lost"
    : "void";
  const scorePointsAwarded = scoreStatus === "won" ? FIXTURE_SCORING_POINTS.exactScore : 0;

  const scorer = scorerStatus({ picks: prediction.scorerPicks, result });

  return {
    outcomeStatus,
    scoreStatus,
    scorersStatus: scorer.status,
    outcomePointsAwarded,
    scorePointsAwarded,
    scorersPointsAwarded: scorer.points,
    totalPointsAwarded: outcomePointsAwarded + scorePointsAwarded + scorer.points
  };
}
