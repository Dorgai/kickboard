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

/** Max individual goal picks (same player may appear multiple times). */
export const MAX_SCORER_PICKS = 8;

export function groupScorerPicks(picks: ScorerPick[]) {
  const order: number[] = [];
  const map = new Map<number, { pick: ScorerPick; goals: number }>();

  for (const pick of picks) {
    if (!map.has(pick.playerId)) order.push(pick.playerId);
    const row = map.get(pick.playerId);
    if (row) {
      row.goals += 1;
    } else {
      map.set(pick.playerId, { pick, goals: 1 });
    }
  }

  return order.map((playerId) => map.get(playerId)!);
}

export function formatScorerPicksSummary(picks: ScorerPick[]) {
  return groupScorerPicks(picks)
    .map((row) => (row.goals > 1 ? `${row.pick.playerName} ×${row.goals}` : row.pick.playerName))
    .join(", ");
}

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

/** When both goal fields are valid integers, derive the matching 1X2 outcome. */
export function outcomeFromScores(homeScore: string, awayScore: string): FixtureOutcome | null {
  if (homeScore.trim() === "" || awayScore.trim() === "") return null;
  const home = Number(homeScore);
  const away = Number(awayScore);
  if (!Number.isFinite(home) || !Number.isFinite(away)) return null;
  if (!Number.isInteger(home) || !Number.isInteger(away) || home < 0 || away < 0) return null;
  if (home > away) return "home";
  if (away > home) return "away";
  return "draw";
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
    picks.push({ playerId, playerName: playerName.slice(0, 80), teamSide });
    if (picks.length >= MAX_SCORER_PICKS) break;
  }
  return picks;
}

export function normalizeResultStatus(value: string | null | undefined): PredictionResultStatus {
  if (value === "won" || value === "lost" || value === "partial" || value === "void") return value;
  return "pending";
}
