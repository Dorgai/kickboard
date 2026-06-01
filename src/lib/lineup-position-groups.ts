import type { StatsBombLineupPosition } from "@/lib/lineup-roles";

export type LineupPositionGroup = "defence" | "midfield" | "attack";

export const LINEUP_POSITION_GROUP_ORDER: LineupPositionGroup[] = ["defence", "midfield", "attack"];

export const LINEUP_POSITION_GROUP_LABELS: Record<LineupPositionGroup, string> = {
  defence: "Defence",
  midfield: "Midfield",
  attack: "Attack"
};

/** Primary position label from StatsBomb `positions` (Starting XI segment preferred). */
export function primaryLineupPosition(positions: StatsBombLineupPosition[] | undefined | null) {
  if (!positions?.length) return null;

  const startingXi = positions.find((segment) => segment.start_reason?.includes("Starting XI"));
  if (startingXi?.position) return startingXi.position;

  const fromKickoff = positions.find((segment) => segment.from === "00:00");
  if (fromKickoff?.position) return fromKickoff.position;

  const firstOnPitch = positions.find((segment) => segment.position && segment.to !== "00:00");
  return positions.find((segment) => segment.position)?.position ?? null;
}

export function classifyLineupPositionGroup(positionName: string | null | undefined): LineupPositionGroup {
  if (!positionName) return "midfield";

  const normalized = positionName.toLowerCase();

  if (normalized.includes("goalkeeper")) return "defence";
  if (normalized.includes("wing back") || normalized.includes(" back")) return "defence";
  if (normalized.includes("forward")) return "attack";
  if (normalized.includes("attacking midfield")) return "attack";
  if (normalized.includes("wing")) return "attack";
  if (normalized.includes("midfield")) return "midfield";

  return "midfield";
}

export function lineupPositionGroupFromSegments(positions: StatsBombLineupPosition[] | undefined | null) {
  return classifyLineupPositionGroup(primaryLineupPosition(positions));
}
