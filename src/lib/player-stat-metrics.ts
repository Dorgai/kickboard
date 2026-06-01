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
    label: "G",
    caption: "Goals scored in this match (StatsBomb events).",
    kind: "number",
    format: (row) => String(row.goals)
  },
  {
    id: "assists",
    label: "A",
    caption: "Assists on goals in this match.",
    kind: "number",
    format: (row) => String(row.assists)
  },
  {
    id: "shots",
    label: "Sh",
    caption: "Shot attempts including goals.",
    kind: "number",
    format: (row) => String(row.shots)
  },
  {
    id: "xg",
    label: "xG",
    caption: "Expected goals from shot quality in this match.",
    kind: "number",
    format: (row) => row.xg.toFixed(2)
  },
  {
    id: "passes",
    label: "Ps",
    caption: "Passes attempted in this match.",
    kind: "number",
    format: (row) => String(row.passes)
  },
  {
    id: "passAccuracy",
    label: "Acc%",
    caption: "Pass completion rate when outcomes are recorded.",
    kind: "number",
    format: (row) => (row.passAccuracy == null ? "n/a" : `${row.passAccuracy}%`)
  },
  {
    id: "carries",
    label: "Car",
    caption: "Ball carries in this match.",
    kind: "number",
    format: (row) => String(row.carries)
  },
  {
    id: "dribbles",
    label: "Dr",
    caption: "Dribbles attempted in this match.",
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

/** Full titles for team totals on the match details panel (not abbreviated player-table headers). */
export const TEAM_MATCH_STAT_CHIPS: TeamMatchStatChipDef[] = [
  { id: "goals", label: "Goals", format: (row) => String(row.goals) },
  { id: "shots", label: "Shots", format: (row) => String(row.shots) },
  { id: "xg", label: "Expected goals", format: (row) => row.xg.toFixed(2) },
  { id: "passes", label: "Passes", format: (row) => String(row.passes) },
  {
    id: "passAccuracy",
    label: "Pass accuracy",
    format: (row) => (row.passAccuracy == null ? "n/a" : `${row.passAccuracy}%`)
  },
  { id: "carries", label: "Carries", format: (row) => String(row.carries) },
  {
    id: "dribbles",
    label: "Dribbles completed",
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
