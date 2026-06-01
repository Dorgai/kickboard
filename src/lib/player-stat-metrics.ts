export type PlayerStatRow = {
  playerId: number | null;
  player: string;
  team: string;
  passes: number;
  passAccuracy: number | null;
  shots: number;
  goals: number;
  assists: number;
  xg: number;
  carries: number;
  dribbles: number;
};

export type PlayerMetricId =
  | "goals"
  | "assists"
  | "shots"
  | "xg"
  | "passes"
  | "passAccuracy"
  | "carries"
  | "dribbles";

/** Compact readable labels for match detail UI (not single-letter codes). */
export const MATCH_STAT_LABELS: Record<PlayerMetricId, string> = {
  goals: "Goals",
  assists: "Assists",
  shots: "Shots",
  xg: "Exp. goals",
  passes: "Passes",
  passAccuracy: "Pass %",
  carries: "Carries",
  dribbles: "Dribbles"
};

/** Short helper text under each stat in match details. */
export const MATCH_STAT_CAPTIONS: Record<PlayerMetricId, string> = {
  goals: "Goals scored",
  assists: "Assists",
  shots: "Shots taken",
  xg: "Expected goals",
  passes: "Passes attempted",
  passAccuracy: "Pass completion",
  carries: "Ball carries",
  dribbles: "Dribbles attempted"
};

export type PlayerMetricDef = {
  id: PlayerMetricId;
  label: string;
  caption: string;
  kind: "number";
  format: (row: PlayerStatRow) => string;
};

export const PLAYER_MATCH_METRICS: PlayerMetricDef[] = [
  {
    id: "goals",
    label: MATCH_STAT_LABELS.goals,
    caption: MATCH_STAT_CAPTIONS.goals,
    kind: "number",
    format: (row) => String(row.goals)
  },
  {
    id: "assists",
    label: MATCH_STAT_LABELS.assists,
    caption: MATCH_STAT_CAPTIONS.assists,
    kind: "number",
    format: (row) => String(row.assists)
  },
  {
    id: "shots",
    label: MATCH_STAT_LABELS.shots,
    caption: MATCH_STAT_CAPTIONS.shots,
    kind: "number",
    format: (row) => String(row.shots)
  },
  {
    id: "xg",
    label: MATCH_STAT_LABELS.xg,
    caption: MATCH_STAT_CAPTIONS.xg,
    kind: "number",
    format: (row) => row.xg.toFixed(2)
  },
  {
    id: "passes",
    label: MATCH_STAT_LABELS.passes,
    caption: MATCH_STAT_CAPTIONS.passes,
    kind: "number",
    format: (row) => String(row.passes)
  },
  {
    id: "passAccuracy",
    label: MATCH_STAT_LABELS.passAccuracy,
    caption: MATCH_STAT_CAPTIONS.passAccuracy,
    kind: "number",
    format: (row) => (row.passAccuracy == null ? "n/a" : `${row.passAccuracy}%`)
  },
  {
    id: "carries",
    label: MATCH_STAT_LABELS.carries,
    caption: MATCH_STAT_CAPTIONS.carries,
    kind: "number",
    format: (row) => String(row.carries)
  },
  {
    id: "dribbles",
    label: MATCH_STAT_LABELS.dribbles,
    caption: MATCH_STAT_CAPTIONS.dribbles,
    kind: "number",
    format: (row) => String(row.dribbles)
  }
];

export const PLAYER_CAREER_METRICS = PLAYER_MATCH_METRICS.filter((metric) =>
  ["goals", "assists", "shots", "xg"].includes(metric.id)
);

export type TeamMatchStatRow = {
  goals: number;
  shots: number;
  xg: number;
  passes: number;
  passAccuracy: number | null;
  carries: number;
  dribbles: number;
  successfulDribbles: number;
};

export type TeamMatchStatChipId =
  | "goals"
  | "shots"
  | "xg"
  | "passes"
  | "passAccuracy"
  | "carries"
  | "dribbles";

export type TeamMatchStatChipDef = {
  id: TeamMatchStatChipId;
  label: string;
  format: (row: TeamMatchStatRow) => string;
};

/** Team totals on the match details panel (same compact labels as player stats). */
export const TEAM_MATCH_STAT_CHIPS: TeamMatchStatChipDef[] = [
  { id: "goals", label: MATCH_STAT_LABELS.goals, format: (row) => String(row.goals) },
  { id: "shots", label: MATCH_STAT_LABELS.shots, format: (row) => String(row.shots) },
  { id: "xg", label: MATCH_STAT_LABELS.xg, format: (row) => row.xg.toFixed(2) },
  { id: "passes", label: MATCH_STAT_LABELS.passes, format: (row) => String(row.passes) },
  {
    id: "passAccuracy",
    label: MATCH_STAT_LABELS.passAccuracy,
    format: (row) => (row.passAccuracy == null ? "n/a" : `${row.passAccuracy}%`)
  },
  { id: "carries", label: MATCH_STAT_LABELS.carries, format: (row) => String(row.carries) },
  {
    id: "dribbles",
    label: MATCH_STAT_LABELS.dribbles,
    format: (row) => `${row.successfulDribbles}/${row.dribbles}`
  }
];

export function formatPlayerMetric(
  metricId: PlayerMetricId,
  values: { goals: number; assists: number; shots: number; xg: number }
) {
  const metric = PLAYER_MATCH_METRICS.find((entry) => entry.id === metricId);
  if (!metric) return "—";
  const row: PlayerStatRow = {
    goals: values.goals,
    assists: values.assists,
    shots: values.shots,
    xg: values.xg,
    passes: 0,
    passAccuracy: null,
    carries: 0,
    dribbles: 0,
    player: "",
    team: "",
    playerId: null
  };
  return metric.format(row);
}

export type CareerAppearance = {
  matchId: number;
  date: string;
  stage: string | null;
  team: string;
  opponent: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  goals: number;
  assists: number;
  shots: number;
  xg: number;
};
