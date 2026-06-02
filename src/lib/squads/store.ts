import { query } from "@/lib/db";
import { getDefaultTournamentId } from "@/lib/auth/users";

export type SquadLineupSlot = {
  slot: number;
  label: string;
  role: "GK" | "DEF" | "MID" | "FWD";
};

const FORMATIONS = ["4-3-3", "4-4-2", "3-5-2", "4-2-3-1"] as const;
export type SquadFormation = (typeof FORMATIONS)[number];

export function isValidFormation(value: string): value is SquadFormation {
  return (FORMATIONS as readonly string[]).includes(value);
}

export function defaultLineupForFormation(formation: SquadFormation): SquadLineupSlot[] {
  const templates: Record<SquadFormation, SquadLineupSlot["role"][]> = {
    "4-3-3": ["GK", "DEF", "DEF", "DEF", "DEF", "MID", "MID", "MID", "FWD", "FWD", "FWD"],
    "4-4-2": ["GK", "DEF", "DEF", "DEF", "DEF", "MID", "MID", "MID", "MID", "FWD", "FWD"],
    "3-5-2": ["GK", "DEF", "DEF", "DEF", "MID", "MID", "MID", "MID", "MID", "FWD", "FWD"],
    "4-2-3-1": ["GK", "DEF", "DEF", "DEF", "DEF", "MID", "MID", "MID", "MID", "MID", "FWD"]
  };

  return templates[formation].map((role, index) => ({
    slot: index + 1,
    label: "",
    role
  }));
}

export async function createUserSquad(input: {
  userId: string;
  name: string;
  formation: SquadFormation;
  lineup: SquadLineupSlot[];
}) {
  const tournamentId = await getDefaultTournamentId();
  if (!tournamentId) throw new Error("TOURNAMENT_NOT_CONFIGURED");

  const trimmedName = input.name.trim().slice(0, 60) || "My XI";
  const lineup = input.lineup.slice(0, 11).map((slot, index) => ({
    slot: index + 1,
    label: slot.label.trim().slice(0, 80),
    role: slot.role
  }));

  const result = await query<{ id: string }>(
    `INSERT INTO squads (user_id, tournament_id, name, formation, lineup, is_public)
     VALUES ($1, $2, $3, $4, $5::jsonb, true)
     RETURNING id`,
    [input.userId, tournamentId, trimmedName, input.formation, JSON.stringify(lineup)]
  );

  return result.rows[0]?.id ?? null;
}

export async function publishSquadToBoard(squadId: string, userId: string) {
  const squad = await query<{
    id: string;
    name: string;
    formation: string;
    lineup: SquadLineupSlot[];
  }>(
    `UPDATE squads
     SET published_to_board_at = now(), updated_at = now()
     WHERE id = $1 AND user_id = $2
     RETURNING id, name, formation, lineup`,
    [squadId, userId]
  );

  const row = squad.rows[0];
  if (!row) throw new Error("SQUAD_NOT_FOUND");

  const rawLineup = row.lineup as unknown;
  const lineup = Array.isArray(rawLineup)
    ? (rawLineup as SquadLineupSlot[])
    : typeof rawLineup === "string"
      ? (JSON.parse(rawLineup) as SquadLineupSlot[])
      : [];
  const summary = lineup
    .filter((slot) => slot.label)
    .map((slot) => `${slot.role}: ${slot.label}`)
    .join(" · ");

  const body = `${row.name} (${row.formation})${summary ? ` — ${summary}` : ""}`.slice(0, 280);

  const post = await query<{ id: string }>(
    `INSERT INTO posts (author_id, post_type, body, squad_id, moderation_status)
     VALUES ($1, 'squad_share', $2, $3, 'withheld')
     RETURNING id`,
    [userId, body, row.id]
  );

  return { squadId: row.id, postId: post.rows[0]?.id ?? null, body };
}

export async function listUserSquads(userId: string) {
  const result = await query<{
    id: string;
    name: string;
    formation: string;
    published_to_board_at: Date | null;
    created_at: Date;
  }>(
    `SELECT id, name, formation, published_to_board_at, created_at
     FROM squads
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT 20`,
    [userId]
  );

  return result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    formation: row.formation,
    publishedAt: row.published_to_board_at?.toISOString() ?? null,
    createdAt: row.created_at.toISOString()
  }));
}
