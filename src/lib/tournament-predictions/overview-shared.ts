import { finalOpponentFromRecord, type TournamentPredictionRecord } from "@/lib/tournament-predictions/types";

export type TournamentCategory = "champion" | "finalists" | "topScorer" | "bestPlayer";

export type TournamentCategoryStats = {
  won: number;
  lost: number;
  pending: number;
  points: number;
};

export type TournamentWalletSummary = {
  balance: number;
  pointsWon: number;
  picksWon: number;
  picksLost: number;
  picksPending: number;
  byCategory: Record<TournamentCategory, TournamentCategoryStats>;
};

export type ConnectionTournamentPredictionSummary = TournamentPredictionRecord & {
  userId: string;
  username: string;
  displayName: string;
};

export type TournamentPredictionsOverview = {
  wallet: TournamentWalletSummary;
  myPrediction: TournamentPredictionRecord | null;
  connectionsPredictions: ConnectionTournamentPredictionSummary[];
};

function recordHasCategory(record: TournamentPredictionRecord, category: TournamentCategory) {
  if (category === "champion") return Boolean(record.predictedChampion);
  if (category === "finalists") return record.predictedFinalists.length > 0;
  if (category === "topScorer") return Boolean(record.predictedTopScorer);
  return Boolean(record.predictedBestPlayer);
}

function categoryStatus(record: TournamentPredictionRecord, category: TournamentCategory) {
  if (category === "champion") return record.championStatus;
  if (category === "finalists") return record.finalistsStatus;
  if (category === "topScorer") return record.topScorerStatus;
  return record.bestPlayerStatus;
}

function categoryPoints(record: TournamentPredictionRecord, category: TournamentCategory) {
  if (category === "champion") return record.championPointsAwarded;
  if (category === "finalists") return record.finalistsPointsAwarded;
  if (category === "topScorer") return record.topScorerPointsAwarded;
  return record.bestPlayerPointsAwarded;
}

export function formatTournamentFinalistsLabel(record: TournamentPredictionRecord | null) {
  if (!record) return null;
  const champion = record.predictedChampion;
  const opponent = finalOpponentFromRecord(record);
  if (champion && opponent) return `${champion} vs ${opponent}`;
  if (champion) return champion;
  if (record.predictedFinalists.length >= 2) {
    return `${record.predictedFinalists[0]} vs ${record.predictedFinalists[1]}`;
  }
  if (record.predictedFinalists.length === 1) return record.predictedFinalists[0];
  return null;
}

export function formatTournamentPlayerLabel(
  pick: { playerName: string; teamName?: string } | null
) {
  if (!pick) return null;
  return pick.teamName ? `${pick.playerName} (${pick.teamName})` : pick.playerName;
}

export function formatTournamentScorerBoardLabel(
  board: TournamentPredictionRecord["predictedTopScorerBoard"]
) {
  if (!board?.picks.length) return null;
  const preview = board.picks
    .slice(0, 3)
    .map((pick) => `#${pick.rank} ${pick.playerName} (${pick.predictedGoals})`);
  const suffix = board.picks.length > 3 ? ` +${board.picks.length - 3}` : "";
  return `${preview.join(", ")}${suffix}`;
}

export function tournamentCategoryValue(
  record: TournamentPredictionRecord | null,
  category: TournamentCategory | "topScorerBoard"
) {
  if (!record) return null;
  if (category === "champion") return record.predictedChampion;
  if (category === "finalists") return formatTournamentFinalistsLabel(record);
  if (category === "topScorer") return formatTournamentPlayerLabel(record.predictedTopScorer);
  if (category === "topScorerBoard") return formatTournamentScorerBoardLabel(record.predictedTopScorerBoard);
  return formatTournamentPlayerLabel(record.predictedBestPlayer);
}

export function tournamentCategoryResultStatus(
  record: TournamentPredictionRecord | null,
  category: TournamentCategory | "topScorerBoard"
) {
  if (!record) return "pending";
  if (category === "topScorerBoard") return "pending";
  if (!tournamentCategoryValue(record, category)) return "pending";
  return categoryStatus(record, category);
}

export function tournamentCategoryPoints(
  record: TournamentPredictionRecord | null,
  category: TournamentCategory
) {
  if (!record || !recordHasCategory(record, category)) return 0;
  return categoryPoints(record, category);
}
