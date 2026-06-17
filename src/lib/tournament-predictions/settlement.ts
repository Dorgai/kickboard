import { query } from "@/lib/db";
import type { GradeResult } from "@/lib/fixture-predictions/grading";
import { creditUserPredictionPoints } from "@/lib/predictions/wallet";
import {
  gradeTournamentPrediction,
  type TournamentPredictionGrades
} from "@/lib/tournament-predictions/grading";
import { fetchTournamentResults, tournamentResultsReady } from "@/lib/tournament-predictions/results";
import {
  parsePredictedFinalists,
  parseTournamentPlayerPick,
  parseTournamentTopScorerBoard,
  type TournamentPredictionRecord
} from "@/lib/tournament-predictions/types";

type PendingTournamentRow = {
  id: string;
  user_id: string;
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
  top_scorer_board_status: string | null;
};

function mapPendingRow(row: PendingTournamentRow): TournamentPredictionRecord {
  return {
    id: row.id,
    tournamentKey: row.tournament_key,
    predictedChampion: row.predicted_champion,
    predictedFinalists: parsePredictedFinalists(row.predicted_finalists),
    predictedTopScorer: parseTournamentPlayerPick(row.predicted_top_scorer),
    predictedTopScorerBoard: parseTournamentTopScorerBoard(row.predicted_top_scorer_board),
    predictedBestPlayer: parseTournamentPlayerPick(row.predicted_best_player),
    championStatus: row.champion_status as TournamentPredictionRecord["championStatus"],
    finalistsStatus: row.finalists_status as TournamentPredictionRecord["finalistsStatus"],
    topScorerStatus: row.top_scorer_status as TournamentPredictionRecord["topScorerStatus"],
    bestPlayerStatus: row.best_player_status as TournamentPredictionRecord["bestPlayerStatus"],
    topScorerBoardStatus:
      (row.top_scorer_board_status as TournamentPredictionRecord["topScorerBoardStatus"]) ?? "pending",
    championPointsAwarded: 0,
    finalistsPointsAwarded: 0,
    topScorerPointsAwarded: 0,
    bestPlayerPointsAwarded: 0,
    topScorerBoardPointsAwarded: 0,
    createdAt: "",
    updatedAt: ""
  };
}

async function applyTournamentCategorySettlement(input: {
  predictionId: string;
  userId: string;
  tournamentKey: string;
  category: keyof TournamentPredictionGrades | "topScorerBoard";
  grade: GradeResult;
}) {
  const column =
    input.category === "topScorer"
      ? "top_scorer"
      : input.category === "topScorerBoard"
        ? "top_scorer_board"
        : input.category === "bestPlayer"
          ? "best_player"
          : input.category;

  const updated = await query<{ points: number }>(
    `UPDATE tournament_predictions
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
      note: `tournament ${input.category} · ${input.tournamentKey}`
    });
  }

  return true;
}

export async function settleTournamentPredictions() {
  const results = await fetchTournamentResults();
  if (!tournamentResultsReady(results)) {
    return { examined: 0, settledCategories: 0, resultsReady: false };
  }

  const pending = await query<PendingTournamentRow>(
    `SELECT id, user_id, tournament_key, predicted_champion, predicted_finalists,
            predicted_top_scorer, predicted_top_scorer_board, predicted_best_player,
            COALESCE(champion_status, 'pending') AS champion_status,
            COALESCE(finalists_status, 'pending') AS finalists_status,
            COALESCE(top_scorer_status, 'pending') AS top_scorer_status,
            COALESCE(best_player_status, 'pending') AS best_player_status,
            COALESCE(top_scorer_board_status, 'pending') AS top_scorer_board_status
     FROM tournament_predictions
     WHERE champion_status = 'pending'
        OR finalists_status = 'pending'
        OR top_scorer_status = 'pending'
        OR best_player_status = 'pending'
        OR top_scorer_board_status = 'pending'
     LIMIT 5000`
  );

  let settledCategories = 0;

  for (const row of pending.rows) {
    const record = mapPendingRow(row);
    const grades = gradeTournamentPrediction(record, results!);

    const categories: Array<keyof TournamentPredictionGrades | "topScorerBoard"> = [
      "champion",
      "finalists",
      "topScorer",
      "bestPlayer",
      "topScorerBoard"
    ];

    for (const category of categories) {
      const grade = grades[category];
      if (!grade) continue;
      const statusColumn =
        category === "topScorer"
          ? row.top_scorer_status
          : category === "topScorerBoard"
            ? row.top_scorer_board_status ?? "pending"
            : category === "bestPlayer"
              ? row.best_player_status
              : row[`${category}_status` as "champion_status" | "finalists_status"];
      if (statusColumn !== "pending") continue;

      const applied = await applyTournamentCategorySettlement({
        predictionId: row.id,
        userId: row.user_id,
        tournamentKey: row.tournament_key,
        category,
        grade
      });
      if (applied) settledCategories += 1;
    }
  }

  return {
    examined: pending.rows.length,
    settledCategories,
    resultsReady: true
  };
}
