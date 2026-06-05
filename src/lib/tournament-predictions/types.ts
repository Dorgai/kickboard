import { normalizeResultStatus, type PredictionResultStatus } from "@/lib/fixture-predictions/types";

export const DEFAULT_TOURNAMENT_KEY = "WC26";

export type TournamentPlayerPick = {
  playerId: number;
  playerName: string;
  teamName: string;
};

export type TournamentPredictionRecord = {
  id: string;
  tournamentKey: string;
  predictedChampion: string | null;
  predictedFinalists: string[];
  predictedTopScorer: TournamentPlayerPick | null;
  predictedBestPlayer: TournamentPlayerPick | null;
  championStatus: PredictionResultStatus;
  finalistsStatus: PredictionResultStatus;
  topScorerStatus: PredictionResultStatus;
  bestPlayerStatus: PredictionResultStatus;
  championPointsAwarded: number;
  finalistsPointsAwarded: number;
  topScorerPointsAwarded: number;
  bestPlayerPointsAwarded: number;
  createdAt: string;
  updatedAt: string;
};

export function parseTournamentPlayerPick(raw: unknown): TournamentPlayerPick | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const playerId = typeof row.playerId === "number" ? row.playerId : Number(row.playerId);
  const playerName = typeof row.playerName === "string" ? row.playerName.trim() : "";
  const teamName = typeof row.teamName === "string" ? row.teamName.trim() : "";
  if (!Number.isFinite(playerId) || !playerName) return null;
  return {
    playerId,
    playerName: playerName.slice(0, 80),
    teamName: teamName.slice(0, 80)
  };
}

export function parsePredictedFinalists(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const teams: string[] = [];
  for (const entry of raw) {
    if (typeof entry !== "string") continue;
    const name = entry.trim().slice(0, 80);
    if (!name) continue;
    if (!teams.some((team) => team.toLowerCase() === name.toLowerCase())) {
      teams.push(name);
    }
    if (teams.length >= 2) break;
  }
  return teams;
}

export function normalizeTournamentTeam(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().slice(0, 80);
  return trimmed || null;
}

function teamsEqual(a: string, b: string) {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/** Other finalist when champion is stored separately. */
export function finalOpponentFromRecord(record: TournamentPredictionRecord | null): string | null {
  if (!record) return null;
  const finalists = record.predictedFinalists;
  if (!finalists.length) return null;
  const champion = record.predictedChampion;
  if (champion) {
    const other = finalists.find((team) => !teamsEqual(team, champion));
    return other ?? null;
  }
  if (finalists.length >= 2) return finalists[1];
  return finalists[0];
}

/** Persist both finalists while champion is the predicted winner. */
export function predictedFinalistsFromPicks(champion: string | null, opponent: string | null): string[] {
  if (champion && opponent) {
    return teamsEqual(champion, opponent) ? [champion] : [champion, opponent];
  }
  if (opponent) return [opponent];
  if (champion) return [champion];
  return [];
}

export { normalizeResultStatus };
