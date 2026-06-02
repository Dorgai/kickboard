export type FixtureOutcome = "home" | "draw" | "away";

export type PredictionResultStatus = "pending" | "won" | "lost" | "partial" | "void";

export type ScorerPick = {
  playerId: number;
  playerName: string;
  teamSide: "home" | "away";
};

export type FixturePredictionRecord = {
  id: string;
  fixtureKey: string;
  predictedOutcome: FixtureOutcome | null;
  homeScore: number | null;
  awayScore: number | null;
  scorerPicks: ScorerPick[];
  outcomeStatus: PredictionResultStatus;
  scoreStatus: PredictionResultStatus;
  scorersStatus: PredictionResultStatus;
  outcomePointsAwarded: number;
  scorePointsAwarded: number;
  scorersPointsAwarded: number;
  createdAt: string;
  updatedAt: string;
};

export type PredictionCategory = "outcome" | "score" | "scorers";

export const MAX_SCORER_PICKS = 5;

export function outcomeLabel(outcome: FixtureOutcome, homeTeam: string, awayTeam: string) {
  if (outcome === "home") return `${homeTeam} win`;
  if (outcome === "away") return `${awayTeam} win`;
  return "Draw";
}

export function outcomeShort(outcome: FixtureOutcome) {
  if (outcome === "home") return "Home";
  if (outcome === "away") return "Away";
  return "Draw";
}

export function parseScorerPicks(raw: unknown): ScorerPick[] {
  if (!Array.isArray(raw)) return [];
  const picks: ScorerPick[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const row = entry as Record<string, unknown>;
    const playerId = typeof row.playerId === "number" ? row.playerId : Number(row.playerId);
    const playerName = typeof row.playerName === "string" ? row.playerName.trim() : "";
    const teamSide = row.teamSide === "home" || row.teamSide === "away" ? row.teamSide : null;
    if (!Number.isFinite(playerId) || !playerName || !teamSide) continue;
    if (picks.some((pick) => pick.playerId === playerId)) continue;
    picks.push({ playerId, playerName: playerName.slice(0, 80), teamSide });
    if (picks.length >= MAX_SCORER_PICKS) break;
  }
  return picks;
}

export function normalizeResultStatus(value: string | null | undefined): PredictionResultStatus {
  if (value === "won" || value === "lost" || value === "partial" || value === "void") return value;
  return "pending";
}
