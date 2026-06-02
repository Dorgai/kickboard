/** Compact codes used in lineup slots and drag payloads. */
export type SquadPlayerRole = "GK" | "DEF" | "MID" | "FWD";

const ROLE_LABELS: Record<SquadPlayerRole, string> = {
  GK: "Goalkeeper",
  DEF: "Defender",
  MID: "Midfielder",
  FWD: "Forward"
};

export function isSquadPlayerRole(value: string): value is SquadPlayerRole {
  return value === "GK" || value === "DEF" || value === "MID" || value === "FWD";
}

export function playerRoleLabel(role: SquadPlayerRole | string) {
  if (isSquadPlayerRole(role)) return ROLE_LABELS[role];
  return role;
}

export const SQUAD_PLAYER_ROLES: SquadPlayerRole[] = ["GK", "DEF", "MID", "FWD"];
