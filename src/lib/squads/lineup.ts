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

/** Relative depth (y) and width (x) for one XI — y: 0 own goal → 100 toward halfway. */
const FORMATION_LAYOUTS: Record<SquadFormation, PitchCoords[]> = {
  "4-3-3": [
    { x: 50, y: 4 },
    { x: 18, y: 22 },
    { x: 38, y: 20 },
    { x: 62, y: 20 },
    { x: 82, y: 22 },
    { x: 28, y: 46 },
    { x: 50, y: 50 },
    { x: 72, y: 46 },
    { x: 22, y: 78 },
    { x: 50, y: 84 },
    { x: 78, y: 78 }
  ],
  "4-4-2": [
    { x: 50, y: 4 },
    { x: 18, y: 22 },
    { x: 38, y: 20 },
    { x: 62, y: 20 },
    { x: 82, y: 22 },
    { x: 16, y: 48 },
    { x: 38, y: 46 },
    { x: 62, y: 46 },
    { x: 84, y: 48 },
    { x: 38, y: 80 },
    { x: 62, y: 80 }
  ],
  "3-5-2": [
    { x: 50, y: 4 },
    { x: 26, y: 20 },
    { x: 50, y: 18 },
    { x: 74, y: 20 },
    { x: 12, y: 46 },
    { x: 32, y: 44 },
    { x: 50, y: 50 },
    { x: 68, y: 44 },
    { x: 88, y: 46 },
    { x: 38, y: 82 },
    { x: 62, y: 82 }
  ],
  "4-2-3-1": [
    { x: 50, y: 4 },
    { x: 18, y: 22 },
    { x: 38, y: 20 },
    { x: 62, y: 20 },
    { x: 82, y: 22 },
    { x: 36, y: 42 },
    { x: 64, y: 42 },
    { x: 22, y: 64 },
    { x: 50, y: 68 },
    { x: 78, y: 64 },
    { x: 50, y: 88 }
  ]
};

export function clampPitchCoord(value: number) {
  return Math.min(100, Math.max(0, Number(value.toFixed(1))));
}

/** Home defends the top edge; away defends the bottom — each XI uses its full half. */
const HOME_HALF = { deep: 3, advance: 48 } as const;
const AWAY_HALF = { deep: 97, advance: 52 } as const;

/** Keep dragged tokens on the correct half of a dual-team pitch. */
export function clampCoordsToSide(side: SquadLineupSide, coords: PitchCoords): PitchCoords {
  if (side === "home") {
    return {
      x: coords.x,
      y: clampPitchCoord(Math.min(Math.max(coords.y, HOME_HALF.deep), HOME_HALF.advance))
    };
  }
  return {
    x: coords.x,
    y: clampPitchCoord(Math.max(Math.min(coords.y, AWAY_HALF.deep), AWAY_HALF.advance))
  };
}

/** Depth within a team's half by role (0 = own goal → 1 = near halfway). */
const ROLE_DEPTH_IN_HALF: Record<SquadPlayerRole, number> = {
  GK: 0.05,
  DEF: 0.22,
  MID: 0.52,
  FWD: 0.88
};

function coordsForSlot(
  role: SquadPlayerRole,
  x: number,
  roleIndex: number,
  roleCount: number,
  side: SquadLineupSide
): PitchCoords {
  const band = ROLE_DEPTH_IN_HALF[role];
  const spread = roleCount > 1 ? 0.1 : 0;
  const t = roleCount > 1 ? roleIndex / (roleCount - 1) : 0.5;
  const depth = Math.min(1, Math.max(0, band + (t - 0.5) * spread));
  const span = HOME_HALF.advance - HOME_HALF.deep;

  if (side === "home") {
    return { x, y: clampPitchCoord(HOME_HALF.deep + depth * span) };
  }
  return { x, y: clampPitchCoord(AWAY_HALF.deep - depth * span) };
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
  const roleIndexBySlot = new Map<number, number>();
  const roleCounts = new Map<SquadPlayerRole, number>();

  for (const slot of base) {
    roleCounts.set(slot.role, (roleCounts.get(slot.role) ?? 0) + 1);
  }

  const roleSeen = new Map<SquadPlayerRole, number>();
  base.forEach((slot, index) => {
    const seen = roleSeen.get(slot.role) ?? 0;
    roleIndexBySlot.set(index, seen);
    roleSeen.set(slot.role, seen + 1);
  });

  return base.map((slot, index) => {
    const coords = coordsForSlot(
      slot.role,
      slot.x,
      roleIndexBySlot.get(index) ?? 0,
      roleCounts.get(slot.role) ?? 1,
      side
    );
    return {
      ...slot,
      slot: index + 1 + slotOffset,
      side,
      label: "",
      playerId: undefined,
      teamName: undefined,
      jerseyNumber: undefined,
      x: coords.x,
      y: coords.y
    };
  });
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

export type BenchPlayerPick = {
  playerId: number;
  name: string;
  role: SquadPlayerRole;
  teamName: string;
  jerseyNumber?: number;
};

function assignPlayersToSideTemplate(
  template: SquadLineupSlot[],
  players: BenchPlayerPick[]
): SquadLineupSlot[] {
  const used = new Set<number>();

  return template.map((slot) => {
    let pickIndex = players.findIndex(
      (player, index) => !used.has(index) && player.role === slot.role
    );
    if (pickIndex < 0) {
      pickIndex = players.findIndex((player, index) => !used.has(index));
    }
    if (pickIndex < 0) return slot;

    used.add(pickIndex);
    const player = players[pickIndex];
    return {
      ...slot,
      label: player.name,
      playerId: player.playerId,
      teamName: player.teamName,
      jerseyNumber: player.jerseyNumber
    };
  });
}

/** Place bench-selected players onto formation slots; keeps the other side unchanged. */
export function applyBenchSelectionToSideFormation(
  side: SquadLineupSide,
  formation: SquadFormation,
  previous: SquadLineupSlot[],
  selectedPlayers: BenchPlayerPick[]
): SquadLineupSlot[] {
  const template = sideLineupFromFormation(formation, side);
  const filled = assignPlayersToSideTemplate(template, selectedPlayers);
  const otherSide = previous.filter((slot) => slotSide(slot) !== side);
  return side === "home" ? [...filled, ...otherSide] : [...otherSide, ...filled];
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

/** Use fixture home/away labels on filled slots so kit colours and drag checks stay consistent. */
export function normalizeLineupTeamLabels(
  lineup: SquadLineupSlot[],
  homeTeam: string,
  awayTeam: string
): SquadLineupSlot[] {
  const home = homeTeam.trim();
  const away = awayTeam.trim();
  return lineup.map((slot) => {
    if (!slot.label?.trim()) {
      return { ...slot, teamName: undefined };
    }
    const side = slotSide(slot);
    return { ...slot, teamName: side === "home" ? home : away };
  });
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
