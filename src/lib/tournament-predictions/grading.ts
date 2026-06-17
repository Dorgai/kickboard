import type { GradeResult } from "@/lib/fixture-predictions/grading";
import { TOURNAMENT_PREDICTION_POINTS } from "@/lib/predictions/points-config";
import type {
  TournamentPlayerPick,
  TournamentPredictionRecord,
  TournamentScorerRankPick,
  TournamentTopScorerBoard
} from "@/lib/tournament-predictions/types";
import { teamsMatch } from "@/lib/squads/team-names";

export type TournamentResults = {
  champion: string | null;
  finalists: string[];
  topScorer: TournamentPlayerPick | null;
  bestPlayer: TournamentPlayerPick | null;
  topScorerLeaderboard: TournamentScorerRankPick[];
};

function teamsEqual(a: string | null | undefined, b: string | null | undefined) {
  if (!a?.trim() || !b?.trim()) return false;
  return teamsMatch(a, b);
}

function playerPickMatches(
  predicted: TournamentPlayerPick | null,
  actual: TournamentPlayerPick | null
) {
  if (!predicted || !actual) return false;
  if (predicted.playerId && actual.playerId && predicted.playerId === actual.playerId) return true;
  const nameA = predicted.playerName.trim().toLowerCase();
  const nameB = actual.playerName.trim().toLowerCase();
  return nameA === nameB || nameA.includes(nameB) || nameB.includes(nameA);
}

export function gradeChampionPick(
  predicted: string | null,
  results: TournamentResults
): GradeResult | null {
  if (!predicted?.trim() || !results.champion) return null;
  const won = teamsEqual(predicted, results.champion);
  return {
    status: won ? "won" : "lost",
    points: won ? TOURNAMENT_PREDICTION_POINTS.champion : 0
  };
}

export function gradeFinalistsPick(
  record: Pick<TournamentPredictionRecord, "predictedChampion" | "predictedFinalists">,
  results: TournamentResults
): GradeResult | null {
  if (!record.predictedFinalists.length || results.finalists.length < 2) return null;

  let matches = 0;
  for (const predicted of record.predictedFinalists) {
    if (results.finalists.some((actual) => teamsEqual(predicted, actual))) {
      matches += 1;
    }
  }

  if (matches === 0) return { status: "lost", points: 0 };
  if (matches >= 2) {
    return { status: "won", points: TOURNAMENT_PREDICTION_POINTS.finalists };
  }
  return { status: "partial", points: TOURNAMENT_PREDICTION_POINTS.finalistPartial };
}

export function gradeTopScorerPick(
  predicted: TournamentPlayerPick | null,
  results: TournamentResults
): GradeResult | null {
  if (!predicted || !results.topScorer) return null;
  const won = playerPickMatches(predicted, results.topScorer);
  return {
    status: won ? "won" : "lost",
    points: won ? TOURNAMENT_PREDICTION_POINTS.topScorer : 0
  };
}

export function gradeBestPlayerPick(
  predicted: TournamentPlayerPick | null,
  results: TournamentResults
): GradeResult | null {
  if (!predicted || !results.bestPlayer) return null;
  const won = playerPickMatches(predicted, results.bestPlayer);
  return {
    status: won ? "won" : "lost",
    points: won ? TOURNAMENT_PREDICTION_POINTS.bestPlayer : 0
  };
}

export function gradeTopScorerBoardPick(
  board: TournamentTopScorerBoard | null,
  results: TournamentResults
): GradeResult | null {
  if (!board?.picks.length || !results.topScorerLeaderboard.length) return null;

  let correctRanks = 0;
  for (const pick of board.picks) {
    const actual = results.topScorerLeaderboard.find((row) => row.rank === pick.rank);
    if (actual && playerPickMatches(pick, actual)) {
      correctRanks += 1;
    }
  }

  if (correctRanks === 0) return { status: "lost", points: 0 };
  const points = correctRanks * TOURNAMENT_PREDICTION_POINTS.scorerBoardPerRank;
  const perfect = correctRanks === board.picks.length && board.picks.length === board.size;
  return {
    status: perfect ? "won" : "partial",
    points
  };
}

export type TournamentPredictionGrades = {
  champion: GradeResult | null;
  finalists: GradeResult | null;
  topScorer: GradeResult | null;
  bestPlayer: GradeResult | null;
  topScorerBoard: GradeResult | null;
};

export function gradeTournamentPrediction(
  record: TournamentPredictionRecord,
  results: TournamentResults
): TournamentPredictionGrades {
  return {
    champion: gradeChampionPick(record.predictedChampion, results),
    finalists: gradeFinalistsPick(record, results),
    topScorer: gradeTopScorerPick(record.predictedTopScorer, results),
    bestPlayer: gradeBestPlayerPick(record.predictedBestPlayer, results),
    topScorerBoard: gradeTopScorerBoardPick(record.predictedTopScorerBoard, results)
  };
}
