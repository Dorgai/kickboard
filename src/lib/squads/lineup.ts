export const FORMATIONS = ["4-3-3", "4-4-2", "3-5-2", "4-2-3-1"] as const;
export type SquadFormation = (typeof FORMATIONS)[number];

export type SquadLineupSlot = {
  slot: number;
  label: string;
  role: "GK" | "DEF" | "MID" | "FWD";
  x: number;
  y: number;
  playerId?: number | string;
  teamName?: string;
  jerseyNumber?: number;
};

/** Pitch coordinates in percent (0–100). Y increases toward the opposition goal. */
export type PitchCoords = { x: number; y: number };

export function isValidFormation(value: string): value is SquadFormation {
  return (FORMATIONS as readonly string[]).includes(value);
}

const FORMATION_LAYOUTS: Record<SquadFormation, PitchCoords[]> = {
  "4-3-3": [
    { x: 50, y: 8 },
    { x: 18, y: 26 },
    { x: 38, y: 24 },
    { x: 62, y: 24 },
    { x: 82, y: 26 },
    { x: 28, y: 48 },
    { x: 50, y: 50 },
    { x: 72, y: 48 },
    { x: 22, y: 74 },
    { x: 50, y: 78 },
    { x: 78, y: 74 }
  ],
  "4-4-2": [
    { x: 50, y: 8 },
    { x: 18, y: 26 },
    { x: 38, y: 24 },
    { x: 62, y: 24 },
    { x: 82, y: 26 },
    { x: 16, y: 50 },
    { x: 38, y: 48 },
    { x: 62, y: 48 },
    { x: 84, y: 50 },
    { x: 38, y: 76 },
    { x: 62, y: 76 }
  ],
  "3-5-2": [
    { x: 50, y: 8 },
    { x: 26, y: 24 },
    { x: 50, y: 22 },
    { x: 74, y: 24 },
    { x: 12, y: 48 },
    { x: 32, y: 46 },
    { x: 50, y: 50 },
    { x: 68, y: 46 },
    { x: 88, y: 48 },
    { x: 38, y: 76 },
    { x: 62, y: 76 }
  ],
  "4-2-3-1": [
    { x: 50, y: 8 },
    { x: 18, y: 26 },
    { x: 38, y: 24 },
    { x: 62, y: 24 },
    { x: 82, y: 26 },
    { x: 36, y: 44 },
    { x: 64, y: 44 },
    { x: 22, y: 62 },
    { x: 50, y: 64 },
    { x: 78, y: 62 },
    { x: 50, y: 80 }
  ]
};

export function clampPitchCoord(value: number) {
  return Math.min(100, Math.max(0, Number(value.toFixed(1))));
}

export function defaultLineupWithPositions(formation: SquadFormation): SquadLineupSlot[] {
  const roles: Record<SquadFormation, SquadLineupSlot["role"][]> = {
    "4-3-3": ["GK", "DEF", "DEF", "DEF", "DEF", "MID", "MID", "MID", "FWD", "FWD", "FWD"],
    "4-4-2": ["GK", "DEF", "DEF", "DEF", "DEF", "MID", "MID", "MID", "MID", "FWD", "FWD"],
    "3-5-2": ["GK", "DEF", "DEF", "DEF", "MID", "MID", "MID", "MID", "MID", "FWD", "FWD"],
    "4-2-3-1": ["GK", "DEF", "DEF", "DEF", "DEF", "MID", "MID", "MID", "MID", "MID", "FWD"]
  };

  const layout = FORMATION_LAYOUTS[formation];
  const roleList = roles[formation];

  return roleList.map((role, index) => ({
    slot: index + 1,
    label: "",
    role,
    x: layout[index]?.x ?? 50,
    y: layout[index]?.y ?? 50
  }));
}

export function mergeFormationChange(
  formation: SquadFormation,
  previous: SquadLineupSlot[]
): SquadLineupSlot[] {
  const template = defaultLineupWithPositions(formation);
  const used = new Set<number>();

  function takePrior(prior: SquadLineupSlot) {
    return {
      label: prior.label,
      playerId: prior.playerId,
      teamName: prior.teamName,
      jerseyNumber: prior.jerseyNumber
    };
  }

  return template.map((slot) => {
    const sameRoleIndex = previous.findIndex(
      (prior, index) => !used.has(index) && prior.label && prior.role === slot.role
    );
    if (sameRoleIndex >= 0) {
      used.add(sameRoleIndex);
      return { ...slot, ...takePrior(previous[sameRoleIndex]) };
    }

    const anyIndex = previous.findIndex((prior, index) => !used.has(index) && prior.label);
    if (anyIndex >= 0) {
      used.add(anyIndex);
      return { ...slot, ...takePrior(previous[anyIndex]) };
    }

    return slot;
  });
}

export function normalizeLineupSlots(raw: unknown, formation: SquadFormation): SquadLineupSlot[] {
  const template = defaultLineupWithPositions(formation);
  if (!Array.isArray(raw) || raw.length === 0) {
    return template;
  }

  return template.map((slot, index) => {
    const entry = raw[index] as Record<string, unknown> | undefined;
    if (!entry || typeof entry !== "object") return slot;

    const label = typeof entry.label === "string" ? entry.label.trim().slice(0, 80) : "";
    const role = entry.role === "GK" || entry.role === "DEF" || entry.role === "MID" || entry.role === "FWD"
      ? entry.role
      : slot.role;
    const x = typeof entry.x === "number" ? clampPitchCoord(entry.x) : slot.x;
    const y = typeof entry.y === "number" ? clampPitchCoord(entry.y) : slot.y;
    const playerId =
      typeof entry.playerId === "number"
        ? entry.playerId
        : typeof entry.playerId === "string" && entry.playerId
          ? Number(entry.playerId) || entry.playerId
          : undefined;
    const teamName = typeof entry.teamName === "string" ? entry.teamName.slice(0, 80) : undefined;
    const jerseyNumber =
      typeof entry.jerseyNumber === "number" ? entry.jerseyNumber : undefined;

    return {
      slot: index + 1,
      label,
      role,
      x,
      y,
      playerId: playerId === undefined || Number.isNaN(playerId as number) ? undefined : playerId,
      teamName,
      jerseyNumber
    };
  });
}
