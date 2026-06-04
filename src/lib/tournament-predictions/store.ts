import { query } from "@/lib/db";
import {
  DEFAULT_TOURNAMENT_KEY,
  normalizeResultStatus,
  normalizeTournamentTeam,
  parsePredictedFinalists,
  parseTournamentPlayerPick,
  type TournamentPlayerPick,
  type TournamentPredictionRecord
} from "@/lib/tournament-predictions/types";

type TournamentPredictionRow = {
  id: string;
  tournament_key: string;
  predicted_champion: string | null;
  predicted_finalists: unknown;
  predicted_top_scorer: unknown;
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
};

const SELECT_TOURNAMENT_PREDICTION = `SELECT id, tournament_key, predicted_champion, predicted_finalists,
  predicted_top_scorer, predicted_best_player,
  COALESCE(champion_status, 'pending') AS champion_status,
  COALESCE(finalists_status, 'pending') AS finalists_status,
  COALESCE(top_scorer_status, 'pending') AS top_scorer_status,
  COALESCE(best_player_status, 'pending') AS best_player_status,
  COALESCE(champion_points_awarded, 0) AS champion_points_awarded,
  COALESCE(finalists_points_awarded, 0) AS finalists_points_awarded,
  COALESCE(top_scorer_points_awarded, 0) AS top_scorer_points_awarded,
  COALESCE(best_player_points_awarded, 0) AS best_player_points_awarded,
  created_at, updated_at`;

function mapRow(row: TournamentPredictionRow): TournamentPredictionRecord {
  return {
    id: row.id,
    tournamentKey: row.tournament_key,
    predictedChampion: row.predicted_champion,
    predictedFinalists: parsePredictedFinalists(row.predicted_finalists),
    predictedTopScorer: parseTournamentPlayerPick(row.predicted_top_scorer),
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

function hasAnyPick(record: {
  predictedChampion: string | null;
  predictedFinalists: string[];
  predictedTopScorer: TournamentPlayerPick | null;
  predictedBestPlayer: TournamentPlayerPick | null;
}) {
  return Boolean(
    record.predictedChampion ||
      record.predictedFinalists.length > 0 ||
      record.predictedTopScorer ||
      record.predictedBestPlayer
  );
}

function validateFinalists(finalists: string[]) {
  if (finalists.length > 2) throw new Error("TOO_MANY_FINALISTS");
  if (finalists.length === 2 && finalists[0].toLowerCase() === finalists[1].toLowerCase()) {
    throw new Error("DUPLICATE_FINALISTS");
  }
}

export async function getUserTournamentPrediction(userId: string, tournamentKey = DEFAULT_TOURNAMENT_KEY) {
  const key = tournamentKey.trim().slice(0, 20) || DEFAULT_TOURNAMENT_KEY;
  const result = await query<TournamentPredictionRow>(
    `${SELECT_TOURNAMENT_PREDICTION}
     FROM tournament_predictions
     WHERE user_id = $1 AND tournament_key = $2`,
    [userId, key]
  );
  const row = result.rows[0];
  return row ? mapRow(row) : null;
}

export type TournamentPredictionChangeAction = "created" | "updated" | "deleted" | "unchanged";

export async function upsertUserTournamentPrediction(input: {
  userId: string;
  tournamentKey?: string;
  predictedChampion?: string | null;
  predictedFinalists?: string[];
  predictedTopScorer?: TournamentPlayerPick | null;
  predictedBestPlayer?: TournamentPlayerPick | null;
}) {
  const tournamentKey = (input.tournamentKey?.trim().slice(0, 20) || DEFAULT_TOURNAMENT_KEY) as string;
  const existing = await getUserTournamentPrediction(input.userId, tournamentKey);

  const predictedChampion =
    input.predictedChampion !== undefined
      ? normalizeTournamentTeam(input.predictedChampion)
      : (existing?.predictedChampion ?? null);

  const predictedFinalists =
    input.predictedFinalists !== undefined
      ? parsePredictedFinalists(input.predictedFinalists)
      : (existing?.predictedFinalists ?? []);

  const predictedTopScorer =
    input.predictedTopScorer !== undefined
      ? input.predictedTopScorer
      : (existing?.predictedTopScorer ?? null);

  const predictedBestPlayer =
    input.predictedBestPlayer !== undefined
      ? input.predictedBestPlayer
      : (existing?.predictedBestPlayer ?? null);

  validateFinalists(predictedFinalists);

  const next = {
    predictedChampion,
    predictedFinalists,
    predictedTopScorer,
    predictedBestPlayer
  };

  if (!hasAnyPick(next)) {
    if (existing) {
      await query(`DELETE FROM tournament_predictions WHERE user_id = $1 AND tournament_key = $2`, [
        input.userId,
        tournamentKey
      ]);
      return { id: null, change: "deleted" as const };
    }
    throw new Error("PICK_REQUIRED");
  }

  const finalistsJson = JSON.stringify(predictedFinalists);
  const topScorerJson = predictedTopScorer ? JSON.stringify(predictedTopScorer) : null;
  const bestPlayerJson = predictedBestPlayer ? JSON.stringify(predictedBestPlayer) : null;

  if (!existing) {
    const inserted = await query<{ id: string }>(
      `INSERT INTO tournament_predictions (
         user_id, tournament_key, predicted_champion, predicted_finalists,
         predicted_top_scorer, predicted_best_player
       ) VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6::jsonb)
       RETURNING id`,
      [input.userId, tournamentKey, predictedChampion, finalistsJson, topScorerJson, bestPlayerJson]
    );
    return { id: inserted.rows[0]?.id ?? null, change: "created" as const };
  }

  const unchanged =
    existing.predictedChampion === predictedChampion &&
    JSON.stringify(existing.predictedFinalists) === finalistsJson &&
    JSON.stringify(existing.predictedTopScorer) === topScorerJson &&
    JSON.stringify(existing.predictedBestPlayer) === bestPlayerJson;

  if (unchanged) {
    return { id: existing.id, change: "unchanged" as const };
  }

  await query(
    `UPDATE tournament_predictions
     SET predicted_champion = $3,
         predicted_finalists = $4::jsonb,
         predicted_top_scorer = $5::jsonb,
         predicted_best_player = $6::jsonb,
         updated_at = now()
     WHERE user_id = $1 AND tournament_key = $2`,
    [input.userId, tournamentKey, predictedChampion, finalistsJson, topScorerJson, bestPlayerJson]
  );

  return { id: existing.id, change: "updated" as const };
}

export async function deleteUserTournamentPrediction(userId: string, tournamentKey = DEFAULT_TOURNAMENT_KEY) {
  const key = tournamentKey.trim().slice(0, 20) || DEFAULT_TOURNAMENT_KEY;
  const result = await query(`DELETE FROM tournament_predictions WHERE user_id = $1 AND tournament_key = $2`, [
    userId,
    key
  ]);
  const deleted = (result.rowCount ?? 0) > 0;
  return { deleted, change: deleted ? ("deleted" as const) : ("unchanged" as const) };
}
