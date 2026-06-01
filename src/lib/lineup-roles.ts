export type StatsBombLineupPosition = {
  position_id?: number;
  position?: string;
  from?: string;
  to?: string | null;
  from_period?: number;
  to_period?: number | null;
  start_reason?: string | null;
  end_reason?: string | null;
};

export type LineupRole = "starter" | "substitute" | "unused";

export const LINEUP_ROLE_LABELS: Record<LineupRole, string> = {
  starter: "Starting XI",
  substitute: "Substitutes",
  unused: "Did not play"
};

export const LINEUP_ROLE_ORDER: LineupRole[] = ["starter", "substitute", "unused"];

/** Classify a player from StatsBomb lineup `positions` (starters, subs used, unused bench). */
export function classifyLineupRole(positions: StatsBombLineupPosition[] | undefined | null): LineupRole {
  if (!positions?.length) {
    return "unused";
  }

  if (positions.some((segment) => segment.start_reason?.includes("Starting XI"))) {
    return "starter";
  }

  return "substitute";
}
