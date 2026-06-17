import { normalizeResultStatus, type PredictionResultStatus } from "@/lib/fixture-predictions/types";

export const DEFAULT_TOURNAMENT_KEY = "WC26";

export type TournamentPlayerPick = {
  playerId: number;
  playerName: string;
  teamName: string;
};

export type TournamentTopScorerBoardSize = 5 | 10;

export type TournamentScorerRankPick = TournamentPlayerPick & {
  rank: number;
  predictedGoals: number;
};

export type TournamentTopScorerBoard = {
  size: TournamentTopScorerBoardSize;
  picks: TournamentScorerRankPick[];
};

export const TOURNAMENT_SCORER_BOARD_SIZES: TournamentTopScorerBoardSize[] = [5, 10];
export const MAX_TOURNAMENT_SCORER_BOARD_GOALS = 30;

export type TournamentPredictionRecord = {
  id: string;
  tournamentKey: string;
  predictedChampion: string | null;
  predictedFinalists: string[];
  predictedTopScorer: TournamentPlayerPick | null;
  predictedTopScorerBoard: TournamentTopScorerBoard | null;
  predictedBestPlayer: TournamentPlayerPick | null;
  championStatus: PredictionResultStatus;
  finalistsStatus: PredictionResultStatus;
  topScorerStatus: PredictionResultStatus;
  bestPlayerStatus: PredictionResultStatus;
  topScorerBoardStatus: PredictionResultStatus;
  championPointsAwarded: number;
  finalistsPointsAwarded: number;
  topScorerPointsAwarded: number;
  bestPlayerPointsAwarded: number;
  topScorerBoardPointsAwarded: number;
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

function parseScorerBoardSize(raw: unknown): TournamentTopScorerBoardSize | null {
  const size = typeof raw === "number" ? raw : Number(raw);
  if (size === 5 || size === 10) return size;
  return null;
}

function parseScorerRankPick(raw: unknown): TournamentScorerRankPick | null {
  const player = parseTournamentPlayerPick(raw);
  if (!player || !raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const rank = typeof row.rank === "number" ? row.rank : Number(row.rank);
  const predictedGoals =
    typeof row.predictedGoals === "number" ? row.predictedGoals : Number(row.predictedGoals);
  if (!Number.isFinite(rank) || rank < 1 || rank > 10) return null;
  if (!Number.isFinite(predictedGoals) || predictedGoals < 1 || predictedGoals > MAX_TOURNAMENT_SCORER_BOARD_GOALS) {
    return null;
  }
  return {
    ...player,
    rank: Math.trunc(rank),
    predictedGoals: Math.trunc(predictedGoals)
  };
}

export function parseTournamentTopScorerBoard(raw: unknown): TournamentTopScorerBoard | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const size = parseScorerBoardSize(row.size);
  if (!size) return null;
  if (!Array.isArray(row.picks) || row.picks.length === 0) return null;

  const picks: TournamentScorerRankPick[] = [];
  const seenPlayers = new Set<number>();
  const seenRanks = new Set<number>();

  for (const entry of row.picks) {
    const pick = parseScorerRankPick(entry);
    if (!pick || pick.rank > size) continue;
    if (seenPlayers.has(pick.playerId) || seenRanks.has(pick.rank)) continue;
    seenPlayers.add(pick.playerId);
    seenRanks.add(pick.rank);
    picks.push(pick);
  }

  if (!picks.length) return null;
  picks.sort((a, b) => a.rank - b.rank);
  return { size, picks };
}

export function normalizeTournamentTopScorerBoard(
  raw: unknown
): TournamentTopScorerBoard | null {
  if (raw === null) return null;
  return parseTournamentTopScorerBoard(raw);
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
