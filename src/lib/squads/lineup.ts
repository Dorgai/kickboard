import { isSquadPlayerRole, type SquadPlayerRole } from "@/lib/squads/player-roles";

export const FORMATIONS = ["4-3-3", "4-4-2", "3-5-2", "4-2-3-1"] as const;
export type SquadFormation = (typeof FORMATIONS)[number];

export type MatchFormations = {
  home: SquadFormation;
  away: SquadFormation;
};

const DEFAULT_FORMATION: SquadFormation = "4-3-3";

export function defaultMatchFormations(): MatchFormations {
  return { home: DEFAULT_FORMATION, away: DEFAULT_FORMATION };
}

export function parseStoredFormations(value: string): MatchFormations {
  const trimmed = value.trim();
  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed) as { home?: string; away?: string };
      const home = parsed.home ?? "";
      const away = parsed.away ?? "";
      return {
        home: isValidFormation(home) ? home : DEFAULT_FORMATION,
        away: isValidFormation(away) ? away : DEFAULT_FORMATION
      };
    } catch {
      return defaultMatchFormations();
    }
  }
  if (isValidFormation(trimmed)) {
    return { home: trimmed, away: trimmed };
  }
  return defaultMatchFormations();
}

export function serializeFormations(formations: MatchFormations): string {
  if (formations.home === formations.away) {
    return formations.home;
  }
  return JSON.stringify(formations);
}

export function formatFormationsLabel(formations: MatchFormations) {
  if (formations.home === formations.away) return formations.home;
  return `${formations.home} / ${formations.away}`;
}

export const SLOTS_PER_TEAM = 11;
export const MATCH_LINEUP_SIZE = SLOTS_PER_TEAM * 2;

export type SquadLineupSide = "home" | "away";

export type SquadLineupSlot = {
  slot: number;
  label: string;
  role: SquadPlayerRole;
  x: number;
  y: number;
  side?: SquadLineupSide;
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

/** Keep dragged tokens on the correct half of a dual-team pitch. */
export function clampCoordsToSide(side: SquadLineupSide, coords: PitchCoords): PitchCoords {
  if (side === "home") {
    return { x: coords.x, y: clampPitchCoord(Math.min(coords.y, 48)) };
  }
  return { x: coords.x, y: clampPitchCoord(Math.max(coords.y, 52)) };
}

function coordsForSide(layout: PitchCoords, side: SquadLineupSide): PitchCoords {
  const halfSpan = 44;
  const yHome = 4 + (layout.y / 100) * halfSpan;
  if (side === "home") {
    return { x: layout.x, y: clampPitchCoord(yHome) };
  }
  return { x: layout.x, y: clampPitchCoord(100 - yHome) };
}

/** One XI in the attacking half of a shared pitch (legacy / single-team). */
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

function sideLineupFromFormation(formation: SquadFormation, side: SquadLineupSide): SquadLineupSlot[] {
  const base = defaultLineupWithPositions(formation);
  const slotOffset = side === "home" ? 0 : SLOTS_PER_TEAM;
  return base.map((slot, index) => ({
    ...slot,
    slot: index + 1 + slotOffset,
    side,
    label: "",
    playerId: undefined,
    teamName: undefined,
    jerseyNumber: undefined,
    x: coordsForSide({ x: slot.x, y: slot.y }, side).x,
    y: coordsForSide({ x: slot.x, y: slot.y }, side).y
  }));
}

/** Home (top) + away (bottom) XIs for a fixture — 22 slots total. */
export function defaultMatchLineupWithFormations(formations: MatchFormations): SquadLineupSlot[] {
  return [
    ...sideLineupFromFormation(formations.home, "home"),
    ...sideLineupFromFormation(formations.away, "away")
  ];
}

/** @deprecated Use defaultMatchLineupWithFormations — same formation for both teams. */
export function defaultMatchLineupWithPositions(formation: SquadFormation): SquadLineupSlot[] {
  return defaultMatchLineupWithFormations({ home: formation, away: formation });
}

export function slotSide(slot: SquadLineupSlot): SquadLineupSide {
  if (slot.side === "home" || slot.side === "away") return slot.side;
  return slot.slot <= SLOTS_PER_TEAM ? "home" : "away";
}

export function countFilledBySide(lineup: SquadLineupSlot[], side: SquadLineupSide) {
  return lineup.filter((slot) => slotSide(slot) === side && slot.label).length;
}

function mergeFormationChangeForSide(
  template: SquadLineupSlot[],
  previous: SquadLineupSlot[]
): SquadLineupSlot[] {
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

export function mergeMatchFormationChangeForSide(
  side: SquadLineupSide,
  formation: SquadFormation,
  previous: SquadLineupSlot[]
): SquadLineupSlot[] {
  const template = sideLineupFromFormation(formation, side);
  const prior = previous.filter((slot) => slotSide(slot) === side);
  return mergeFormationChangeForSide(template, prior);
}

export function mergeMatchFormationChange(
  formations: MatchFormations,
  previous: SquadLineupSlot[]
): SquadLineupSlot[] {
  return [
    ...mergeMatchFormationChangeForSide("home", formations.home, previous),
    ...mergeMatchFormationChangeForSide("away", formations.away, previous)
  ];
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

function mapLineupEntry(
  slot: SquadLineupSlot,
  entry: Record<string, unknown> | undefined
): SquadLineupSlot {
  if (!entry || typeof entry !== "object") return slot;

  const label = typeof entry.label === "string" ? entry.label.trim().slice(0, 80) : "";
  const role =
    typeof entry.role === "string" && isSquadPlayerRole(entry.role) ? entry.role : slot.role;
  const x = typeof entry.x === "number" ? clampPitchCoord(entry.x) : slot.x;
  const y = typeof entry.y === "number" ? clampPitchCoord(entry.y) : slot.y;
  const side =
    entry.side === "home" || entry.side === "away" ? entry.side : slot.side ?? slotSide(slot);
  const playerId =
    typeof entry.playerId === "number"
      ? entry.playerId
      : typeof entry.playerId === "string" && entry.playerId
        ? Number(entry.playerId) || entry.playerId
        : undefined;
  const teamName = typeof entry.teamName === "string" ? entry.teamName.slice(0, 80) : undefined;
  const jerseyNumber = typeof entry.jerseyNumber === "number" ? entry.jerseyNumber : undefined;

  return {
    slot: slot.slot,
    label,
    role,
    x,
    y,
    side,
    playerId: playerId === undefined || Number.isNaN(playerId as number) ? undefined : playerId,
    teamName,
    jerseyNumber
  };
}

export function normalizeLineupSlots(
  raw: unknown,
  formations: MatchFormations | SquadFormation
): SquadLineupSlot[] {
  const matchFormations =
    typeof formations === "string" ? { home: formations, away: formations } : formations;
  const matchTemplate = defaultMatchLineupWithFormations(matchFormations);
  if (!Array.isArray(raw) || raw.length === 0) {
    return matchTemplate;
  }

  const hasDualSides =
    raw.length >= MATCH_LINEUP_SIZE || raw.some((entry) => {
      const side = (entry as Record<string, unknown> | undefined)?.side;
      return side === "home" || side === "away";
    });

  if (hasDualSides) {
    const bySlot = new Map<number, Record<string, unknown>>();
    raw.forEach((entry, index) => {
      if (!entry || typeof entry !== "object") return;
      const slotNumber =
        typeof (entry as Record<string, unknown>).slot === "number"
          ? ((entry as Record<string, unknown>).slot as number)
          : index + 1;
      bySlot.set(slotNumber, entry as Record<string, unknown>);
    });

    return matchTemplate.map((slot) =>
      mapLineupEntry(slot, bySlot.get(slot.slot) ?? bySlot.get(slot.slot - SLOTS_PER_TEAM))
    );
  }

  const legacyFormation =
    typeof formations === "string" ? formations : matchFormations.home;
  const legacyTemplate = defaultLineupWithPositions(legacyFormation);
  const legacy = legacyTemplate.map((slot, index) =>
    mapLineupEntry(slot, raw[index] as Record<string, unknown> | undefined)
  );

  return matchTemplate.map((slot) => {
    if (slotSide(slot) === "away") return slot;
    const legacySlot = legacy[slot.slot - 1];
    if (!legacySlot) return slot;
    return {
      ...slot,
      label: legacySlot.label,
      role: legacySlot.role,
      x: legacySlot.x,
      y: legacySlot.y,
      playerId: legacySlot.playerId,
      teamName: legacySlot.teamName,
      jerseyNumber: legacySlot.jerseyNumber
    };
  });
}
