import { query } from "@/lib/db";
import { listAcceptedPeerIds } from "@/lib/connections/store";
import type { PredictionResultStatus } from "@/lib/fixture-predictions/types";
import {
  DEFAULT_TOURNAMENT_KEY,
  normalizeResultStatus,
  parsePredictedFinalists,
  parseTournamentPlayerPick,
  parseTournamentTopScorerBoard,
  type TournamentPredictionRecord
} from "@/lib/tournament-predictions/types";
import { getUserTournamentPrediction } from "@/lib/tournament-predictions/store";
import {
  type ConnectionTournamentPredictionSummary,
  type TournamentCategory,
  type TournamentCategoryStats,
  type TournamentPredictionsOverview,
  type TournamentWalletSummary
} from "@/lib/tournament-predictions/overview-shared";

export type {
  ConnectionTournamentPredictionSummary,
  TournamentCategory,
  TournamentCategoryStats,
  TournamentPredictionsOverview,
  TournamentWalletSummary
} from "@/lib/tournament-predictions/overview-shared";

export {
  formatTournamentFinalistsLabel,
  formatTournamentPlayerLabel,
  formatTournamentScorerBoardLabel,
  tournamentCategoryPoints,
  tournamentCategoryResultStatus,
  tournamentCategoryValue
} from "@/lib/tournament-predictions/overview-shared";

type TournamentPredictionRow = {
  id: string;
  tournament_key: string;
  predicted_champion: string | null;
  predicted_finalists: unknown;
  predicted_top_scorer: unknown;
  predicted_top_scorer_board: unknown;
  predicted_best_player: unknown;
  champion_status: string;
  finalists_status: string;
  top_scorer_status: string;
  best_player_status: string;
  champion_points_awarded: number;
  finalists_points_awarded: number;
  top_scorer_points_awarded: number;
  best_player_points_awarded: number;
  created_at: Date;
  updated_at: Date;
  user_id?: string;
  username?: string;
  display_name?: string | null;
};

const SELECT_TOURNAMENT_PREDICTION = `tp.id, tp.tournament_key, tp.predicted_champion, tp.predicted_finalists,
  tp.predicted_top_scorer, tp.predicted_top_scorer_board, tp.predicted_best_player,
  COALESCE(tp.champion_status, 'pending') AS champion_status,
  COALESCE(tp.finalists_status, 'pending') AS finalists_status,
  COALESCE(tp.top_scorer_status, 'pending') AS top_scorer_status,
  COALESCE(tp.best_player_status, 'pending') AS best_player_status,
  COALESCE(tp.champion_points_awarded, 0) AS champion_points_awarded,
  COALESCE(tp.finalists_points_awarded, 0) AS finalists_points_awarded,
  COALESCE(tp.top_scorer_points_awarded, 0) AS top_scorer_points_awarded,
  COALESCE(tp.best_player_points_awarded, 0) AS best_player_points_awarded,
  tp.created_at, tp.updated_at`;

function mapRow(row: TournamentPredictionRow): TournamentPredictionRecord {
  return {
    id: row.id,
    tournamentKey: row.tournament_key,
    predictedChampion: row.predicted_champion,
    predictedFinalists: parsePredictedFinalists(row.predicted_finalists),
    predictedTopScorer: parseTournamentPlayerPick(row.predicted_top_scorer),
    predictedTopScorerBoard: parseTournamentTopScorerBoard(row.predicted_top_scorer_board),
    predictedBestPlayer: parseTournamentPlayerPick(row.predicted_best_player),
    championStatus: normalizeResultStatus(row.champion_status),
    finalistsStatus: normalizeResultStatus(row.finalists_status),
    topScorerStatus: normalizeResultStatus(row.top_scorer_status),
    bestPlayerStatus: normalizeResultStatus(row.best_player_status),
    championPointsAwarded: row.champion_points_awarded ?? 0,
    finalistsPointsAwarded: row.finalists_points_awarded ?? 0,
    topScorerPointsAwarded: row.top_scorer_points_awarded ?? 0,
    bestPlayerPointsAwarded: row.best_player_points_awarded ?? 0,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString()
  };
}

function emptyCategoryStats(): TournamentCategoryStats {
  return { won: 0, lost: 0, pending: 0, points: 0 };
}

function tallyStatus(stats: TournamentCategoryStats, status: PredictionResultStatus, points: number) {
  if (status === "won" || status === "partial") {
    stats.won += 1;
    stats.points += points;
  } else if (status === "lost") {
    stats.lost += 1;
  } else if (status !== "void") {
    stats.pending += 1;
  }
}

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

function walletFromRecord(record: TournamentPredictionRecord | null, balance: number): TournamentWalletSummary {
  const byCategory: Record<TournamentCategory, TournamentCategoryStats> = {
    champion: emptyCategoryStats(),
    finalists: emptyCategoryStats(),
    topScorer: emptyCategoryStats(),
    bestPlayer: emptyCategoryStats()
  };

  let picksWon = 0;
  let picksLost = 0;
  let picksPending = 0;

  if (record) {
    const categories: TournamentCategory[] = ["champion", "finalists", "topScorer", "bestPlayer"];
    for (const category of categories) {
      if (!recordHasCategory(record, category)) continue;
      const status = categoryStatus(record, category);
      const points = categoryPoints(record, category);
      tallyStatus(byCategory[category], status, points);
      if (status === "won" || status === "partial") picksWon += 1;
      else if (status === "lost") picksLost += 1;
      else if (status !== "void") picksPending += 1;
    }
  }

  const pointsWon =
    byCategory.champion.points +
    byCategory.finalists.points +
    byCategory.topScorer.points +
    byCategory.bestPlayer.points;

  return {
    balance,
    pointsWon,
    picksWon,
    picksLost,
    picksPending,
    byCategory
  };
}

export async function listConnectionsTournamentPredictions(
  userId: string,
  tournamentKey = DEFAULT_TOURNAMENT_KEY,
  limit = 30
) {
  const peerIds = await listAcceptedPeerIds(userId);
  if (!peerIds.length) return [];

  const key = tournamentKey.trim().slice(0, 20) || DEFAULT_TOURNAMENT_KEY;
  const result = await query<TournamentPredictionRow & { user_id: string; username: string; display_name: string | null }>(
    `SELECT ${SELECT_TOURNAMENT_PREDICTION},
            tp.user_id, u.username, u.display_name
     FROM tournament_predictions tp
     INNER JOIN users u ON u.id = tp.user_id
     WHERE tp.user_id = ANY($1::uuid[])
       AND tp.tournament_key = $2
     ORDER BY tp.updated_at DESC
     LIMIT $3`,
    [peerIds, key, limit]
  );

  return result.rows.map((row) => ({
    ...mapRow(row),
    userId: row.user_id,
    username: row.username ?? "fan",
    displayName: row.display_name ?? row.username ?? "Fan"
  }));
}

export async function getTournamentPredictionsOverview(
  userId: string,
  tournamentKey = DEFAULT_TOURNAMENT_KEY
): Promise<TournamentPredictionsOverview> {
  const key = tournamentKey.trim().slice(0, 20) || DEFAULT_TOURNAMENT_KEY;

  const [balanceRow, myPrediction, connectionsPredictions] = await Promise.all([
    query<{ points_balance: number }>(
      `SELECT points_balance FROM users WHERE id = $1 AND deleted_at IS NULL`,
      [userId]
    ),
    getUserTournamentPrediction(userId, key),
    listConnectionsTournamentPredictions(userId, key)
  ]);

  const balance = balanceRow.rows[0]?.points_balance ?? 0;

  return {
    wallet: walletFromRecord(myPrediction, balance),
    myPrediction,
    connectionsPredictions
  };
}
