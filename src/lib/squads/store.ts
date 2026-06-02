import { query } from "@/lib/db";
import { getDefaultTournamentId } from "@/lib/auth/users";
import {
  defaultMatchFormations,
  defaultMatchLineupWithFormations,
  formatFormationsLabel,
  isValidFormation,
  MATCH_LINEUP_SIZE,
  normalizeLineupSlots,
  parseStoredFormations,
  serializeFormations,
  type MatchFormations,
  type SquadFormation,
  type SquadLineupSlot
} from "@/lib/squads/lineup";

export type { MatchFormations, SquadFormation, SquadLineupSlot } from "@/lib/squads/lineup";
export {
  FORMATIONS,
  formatFormationsLabel,
  isValidFormation,
  parseStoredFormations,
  serializeFormations
} from "@/lib/squads/lineup";

export function defaultLineupForFormations(formations: MatchFormations): SquadLineupSlot[] {
  return defaultMatchLineupWithFormations(formations);
}

export function parseFormationsFromRequest(body: {
  formation?: unknown;
  homeFormation?: string;
  awayFormation?: string;
}): MatchFormations | null {
  if (body.homeFormation !== undefined || body.awayFormation !== undefined) {
    const home = body.homeFormation ?? "4-3-3";
    const away = body.awayFormation ?? "4-3-3";
    if (!isValidFormation(home) || !isValidFormation(away)) return null;
    return { home, away };
  }

  if (body.formation && typeof body.formation === "object") {
    const record = body.formation as { home?: string; away?: string };
    const home = record.home ?? "4-3-3";
    const away = record.away ?? "4-3-3";
    if (!isValidFormation(home) || !isValidFormation(away)) return null;
    return { home, away };
  }

  if (typeof body.formation === "string") {
    if (body.formation.trim().startsWith("{")) {
      return parseStoredFormations(body.formation);
    }
    if (!isValidFormation(body.formation)) return null;
    return { home: body.formation, away: body.formation };
  }

  return defaultMatchFormations();
}

function serializeLineup(lineup: SquadLineupSlot[]) {
  return lineup.slice(0, MATCH_LINEUP_SIZE).map((slot) => ({
    slot: slot.slot,
    label: slot.label.trim().slice(0, 80),
    role: slot.role,
    x: slot.x,
    y: slot.y,
    side: slot.side,
    ...(slot.playerId !== undefined ? { playerId: slot.playerId } : {}),
    ...(slot.teamName ? { teamName: slot.teamName.slice(0, 80) } : {}),
    ...(slot.jerseyNumber !== undefined ? { jerseyNumber: slot.jerseyNumber } : {})
  }));
}

export async function createUserSquad(input: {
  userId: string;
  name: string;
  formations: MatchFormations;
  lineup: SquadLineupSlot[];
  fixtureKey: string;
}) {
  const tournamentId = await getDefaultTournamentId();
  if (!tournamentId) throw new Error("TOURNAMENT_NOT_CONFIGURED");

  const trimmedName = input.name.trim().slice(0, 60) || "My XI";
  const lineup = serializeLineup(normalizeLineupSlots(input.lineup, input.formations));
  const formationStored = serializeFormations(input.formations);

  const fixtureKey = input.fixtureKey.trim().slice(0, 120);
  if (!fixtureKey) throw new Error("FIXTURE_KEY_REQUIRED");

  const result = await query<{ id: string }>(
    `INSERT INTO squads (user_id, tournament_id, name, formation, lineup, is_public, fixture_key)
     VALUES ($1, $2, $3, $4, $5::jsonb, true, $6)
     RETURNING id`,
    [input.userId, tournamentId, trimmedName, formationStored, JSON.stringify(lineup), fixtureKey]
  );

  return result.rows[0]?.id ?? null;
}

export async function publishSquadToBoard(squadId: string, userId: string) {
  const squad = await query<{
    id: string;
    name: string;
    formation: string;
    lineup: SquadLineupSlot[];
    fixture_key: string | null;
  }>(
    `UPDATE squads
     SET published_to_board_at = now(), updated_at = now()
     WHERE id = $1 AND user_id = $2
     RETURNING id, name, formation, lineup, fixture_key`,
    [squadId, userId]
  );

  const row = squad.rows[0];
  if (!row) throw new Error("SQUAD_NOT_FOUND");

  const formations = parseStoredFormations(row.formation);
  const lineup = normalizeLineupSlots(row.lineup, formations);
  const summary = lineup
    .filter((slot) => slot.label)
    .map((slot) => `${slot.side === "away" ? "Away" : "Home"} ${slot.label}`)
    .join(" · ");

  const body = `${row.name} (${formatFormationsLabel(formations)})${summary ? ` — ${summary}` : ""}`.slice(
    0,
    280
  );

  const post = await query<{ id: string }>(
    `INSERT INTO posts (author_id, post_type, body, squad_id, moderation_status, fixture_key)
     VALUES ($1, 'squad_share', $2, $3, 'approved', $4)
     RETURNING id`,
    [userId, body, row.id, row.fixture_key]
  );

  return { squadId: row.id, postId: post.rows[0]?.id ?? null, body };
}

export async function getLatestUserSquad(userId: string, fixtureKey: string) {
  const key = fixtureKey.trim().slice(0, 120);
  if (!key) return null;

  const result = await query<{
    id: string;
    name: string;
    formation: string;
    lineup: unknown;
    published_to_board_at: Date | null;
    created_at: Date;
    updated_at: Date;
  }>(
    `SELECT id, name, formation, lineup, published_to_board_at, created_at, updated_at
     FROM squads
     WHERE user_id = $1 AND fixture_key = $2
     ORDER BY updated_at DESC
     LIMIT 1`,
    [userId, key]
  );

  const row = result.rows[0];
  if (!row) return null;

  const formations = parseStoredFormations(row.formation);

  return {
    id: row.id,
    name: row.name,
    formation: formatFormationsLabel(formations),
    formations,
    lineup: normalizeLineupSlots(row.lineup, formations),
    publishedAt: row.published_to_board_at?.toISOString() ?? null,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString()
  };
}

export async function updateUserSquad(input: {
  squadId: string;
  userId: string;
  name: string;
  formations: MatchFormations;
  lineup: SquadLineupSlot[];
  fixtureKey: string;
}) {
  const lineup = serializeLineup(normalizeLineupSlots(input.lineup, input.formations));
  const formationStored = serializeFormations(input.formations);
  const trimmedName = input.name.trim().slice(0, 60) || "My XI";
  const fixtureKey = input.fixtureKey.trim().slice(0, 120);

  const result = await query<{ id: string }>(
    `UPDATE squads
     SET name = $3,
         formation = $4,
         lineup = $5::jsonb,
         fixture_key = $6,
         updated_at = now()
     WHERE id = $1 AND user_id = $2
     RETURNING id`,
    [
      input.squadId,
      input.userId,
      trimmedName,
      formationStored,
      JSON.stringify(lineup),
      fixtureKey
    ]
  );

  return result.rows[0]?.id ?? null;
}

export type SquadSummary = {
  id: string;
  name: string;
  formation: string;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  playersPlaced: number;
};

function mapSquadSummary(row: {
  id: string;
  name: string;
  formation: string;
  published_to_board_at: Date | null;
  created_at: Date;
  updated_at: Date;
  lineup: unknown;
}) {
  const formations = parseStoredFormations(row.formation);
  const lineup = normalizeLineupSlots(row.lineup, formations);
  return {
    id: row.id,
    name: row.name,
    formation: formatFormationsLabel(formations),
    publishedAt: row.published_to_board_at?.toISOString() ?? null,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    playersPlaced: lineup.filter((slot) => slot.label).length
  };
}

export async function getUserSquadById(squadId: string, userId: string) {
  const result = await query<{
    id: string;
    name: string;
    formation: string;
    lineup: unknown;
    fixture_key: string | null;
    published_to_board_at: Date | null;
    created_at: Date;
    updated_at: Date;
  }>(
    `SELECT id, name, formation, lineup, fixture_key, published_to_board_at, created_at, updated_at
     FROM squads
     WHERE id = $1 AND user_id = $2`,
    [squadId, userId]
  );

  const row = result.rows[0];
  if (!row) return null;

  const formations = parseStoredFormations(row.formation);

  return {
    ...mapSquadSummary(row),
    formations,
    lineup: normalizeLineupSlots(row.lineup, formations),
    fixtureKey: row.fixture_key
  };
}

export async function listUserSquadsForFixture(userId: string, fixtureKey: string) {
  const key = fixtureKey.trim().slice(0, 120);
  if (!key) return [];

  const result = await query<{
    id: string;
    name: string;
    formation: string;
    published_to_board_at: Date | null;
    created_at: Date;
    updated_at: Date;
    lineup: unknown;
  }>(
    `SELECT id, name, formation, lineup, published_to_board_at, created_at, updated_at
     FROM squads
     WHERE user_id = $1 AND fixture_key = $2
     ORDER BY updated_at DESC
     LIMIT 30`,
    [userId, key]
  );

  return result.rows.map((row) => mapSquadSummary(row));
}

export async function listUserSquads(userId: string) {
  const result = await query<{
    id: string;
    name: string;
    formation: string;
    published_to_board_at: Date | null;
    created_at: Date;
    updated_at: Date;
    lineup: unknown;
  }>(
    `SELECT id, name, formation, lineup, published_to_board_at, created_at, updated_at
     FROM squads
     WHERE user_id = $1
     ORDER BY updated_at DESC
     LIMIT 20`,
    [userId]
  );

  return result.rows.map((row) => mapSquadSummary(row));
}
