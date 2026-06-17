import { FIXTURE_PREDICTION_POINTS } from "@/lib/predictions/points-config";
import type { MatchBoardGoal } from "@/lib/fixtures/fixture-key";
import type {
  FixtureOutcome,
  FixturePredictionRecord,
  PredictionResultStatus,
  ScorerPick
} from "@/lib/fixture-predictions/types";

export type GradeResult = {
  status: PredictionResultStatus;
  points: number;
};

export type FixtureMatchFacts = {
  homeGoals: number;
  awayGoals: number;
  goalScorers: MatchBoardGoal[];
  voided?: boolean;
};

export function actualOutcome(homeGoals: number, awayGoals: number): FixtureOutcome {
  if (homeGoals > awayGoals) return "home";
  if (awayGoals > homeGoals) return "away";
  return "draw";
}

function normalizePlayerName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function playerNamesMatch(predicted: string, actual: string) {
  const a = normalizePlayerName(predicted);
  const b = normalizePlayerName(actual);
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.includes(b) || b.includes(a)) return true;
  const lastA = a.split(" ").pop() ?? "";
  const lastB = b.split(" ").pop() ?? "";
  return lastA.length >= 3 && lastA === lastB;
}

export function scorerPickMatchesGoal(pick: ScorerPick, goal: MatchBoardGoal) {
  if (pick.teamSide !== goal.teamSide) return false;
  return playerNamesMatch(pick.playerName, goal.playerName);
}

export function gradeOutcomePick(
  predicted: FixtureOutcome | null,
  facts: FixtureMatchFacts
): GradeResult | null {
  if (!predicted) return null;
  if (facts.voided) return { status: "void", points: 0 };

  const actual = actualOutcome(facts.homeGoals, facts.awayGoals);
  const won = predicted === actual;
  return {
    status: won ? "won" : "lost",
    points: won ? FIXTURE_PREDICTION_POINTS.outcome : 0
  };
}

export function gradeScorePick(
  homeScore: number | null,
  awayScore: number | null,
  facts: FixtureMatchFacts
): GradeResult | null {
  if (homeScore === null || awayScore === null) return null;
  if (facts.voided) return { status: "void", points: 0 };

  const won = homeScore === facts.homeGoals && awayScore === facts.awayGoals;
  return {
    status: won ? "won" : "lost",
    points: won ? FIXTURE_PREDICTION_POINTS.exactScore : 0
  };
}

export function gradeScorerPicks(
  picks: ScorerPick[],
  facts: FixtureMatchFacts
): GradeResult | null {
  if (!picks.length) return null;
  if (facts.voided) return { status: "void", points: 0 };

  const remaining = [...facts.goalScorers];
  let matched = 0;

  for (const pick of picks) {
    const index = remaining.findIndex((goal) => scorerPickMatchesGoal(pick, goal));
    if (index >= 0) {
      matched += 1;
      remaining.splice(index, 1);
    }
  }

  if (matched === 0) {
    return { status: "lost", points: 0 };
  }

  const points = matched * FIXTURE_PREDICTION_POINTS.scorerPerCorrect;
  const perfect =
    matched === picks.length &&
    picks.length === facts.goalScorers.length &&
    facts.goalScorers.length > 0;

  return {
    status: perfect ? "won" : "partial",
    points
  };
}

export type FixturePredictionGrades = {
  outcome: GradeResult | null;
  score: GradeResult | null;
  scorers: GradeResult | null;
};

export function gradeFixturePrediction(
  record: Pick<
    FixturePredictionRecord,
    "predictedOutcome" | "homeScore" | "awayScore" | "scorerPicks"
  >,
  facts: FixtureMatchFacts
): FixturePredictionGrades {
  return {
    outcome: gradeOutcomePick(record.predictedOutcome, facts),
    score: gradeScorePick(record.homeScore, record.awayScore, facts),
    scorers: gradeScorerPicks(record.scorerPicks, facts)
  };
}
