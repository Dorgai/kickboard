import { query } from "@/lib/db";
import { areUsersConnected, listAcceptedPeerIds } from "@/lib/connections/store";
import { normalizeLineupSlots, isValidFormation } from "@/lib/squads/lineup";
import type { SquadFormation, SquadLineupSlot } from "@/lib/squads/lineup";

export type PeerSquadSummary = {
  id: string;
  name: string;
  formation: string;
  playersPlaced: number;
  updatedAt: string;
};

export type PeerFixturePrediction = {
  homeScore: number;
  awayScore: number;
  updatedAt: string;
};

export type PeerMatchActivity = {
  userId: string;
  username: string;
  displayName: string | null;
  squads: PeerSquadSummary[];
  prediction: PeerFixturePrediction | null;
};

export async function assertPeerAccess(viewerId: string, peerId: string) {
  if (viewerId === peerId) return true;
  const connected = await areUsersConnected(viewerId, peerId);
  if (!connected) throw new Error("NOT_CONNECTED");
  return true;
}

export async function getPeerSquadForViewer(
  viewerId: string,
  peerId: string,
  squadId: string
) {
  await assertPeerAccess(viewerId, peerId);

  const result = await query<{
    id: string;
    name: string;
    formation: string;
    lineup: unknown;
    fixture_key: string | null;
  }>(
    `SELECT id, name, formation, lineup, fixture_key
     FROM squads
     WHERE id = $1 AND user_id = $2`,
    [squadId, peerId]
  );

  const row = result.rows[0];
  if (!row) return null;

  const formation = isValidFormation(row.formation) ? row.formation : "4-3-3";
  return {
    id: row.id,
    name: row.name,
    formation,
    lineup: normalizeLineupSlots(row.lineup, formation) as SquadLineupSlot[],
    fixtureKey: row.fixture_key
  };
}

function mapSquadSummary(row: {
  id: string;
  name: string;
  formation: string;
  lineup: unknown;
  updated_at: Date;
}) {
  const formation = isValidFormation(row.formation) ? row.formation : "4-3-3";
  const lineup = normalizeLineupSlots(row.lineup, formation);
  return {
    id: row.id,
    name: row.name,
    formation: row.formation,
    playersPlaced: lineup.filter((slot) => slot.label).length,
    updatedAt: row.updated_at.toISOString()
  };
}

export async function listPeersMatchActivity(viewerId: string, fixtureKey: string) {
  const key = fixtureKey.trim().slice(0, 120);
  if (!key) return [];

  const peerIds = await listAcceptedPeerIds(viewerId);
  if (!peerIds.length) return [];

  const squadsResult = await query<{
    user_id: string;
    id: string;
    name: string;
    formation: string;
    lineup: unknown;
    updated_at: Date;
  }>(
    `SELECT user_id, id, name, formation, lineup, updated_at
     FROM squads
     WHERE user_id = ANY($1::uuid[])
       AND fixture_key = $2
     ORDER BY updated_at DESC`,
    [peerIds, key]
  );

  const predictionsResult = await query<{
    user_id: string;
    home_score: number;
    away_score: number;
    updated_at: Date;
  }>(
    `SELECT user_id, home_score, away_score, updated_at
     FROM fixture_predictions
     WHERE user_id = ANY($1::uuid[])
       AND fixture_key = $2`,
    [peerIds, key]
  );

  const usersResult = await query<{
    id: string;
    username: string;
    display_name: string | null;
  }>(
    `SELECT id, username, display_name
     FROM users
     WHERE id = ANY($1::uuid[]) AND deleted_at IS NULL`,
    [peerIds]
  );

  const squadsByUser = new Map<string, PeerSquadSummary[]>();
  for (const row of squadsResult.rows) {
    const list = squadsByUser.get(row.user_id) ?? [];
    if (list.length < 5) {
      list.push(mapSquadSummary(row));
      squadsByUser.set(row.user_id, list);
    }
  }

  const predictionByUser = new Map<string, PeerFixturePrediction>();
  for (const row of predictionsResult.rows) {
    predictionByUser.set(row.user_id, {
      homeScore: row.home_score,
      awayScore: row.away_score,
      updatedAt: row.updated_at.toISOString()
    });
  }

  const activity: PeerMatchActivity[] = [];
  for (const user of usersResult.rows) {
    const squads = squadsByUser.get(user.id) ?? [];
    const prediction = predictionByUser.get(user.id) ?? null;
    if (!squads.length && !prediction) continue;
    activity.push({
      userId: user.id,
      username: user.username,
      displayName: user.display_name,
      squads,
      prediction
    });
  }

  activity.sort((a, b) => {
    const aLabel = a.displayName ?? a.username;
    const bLabel = b.displayName ?? b.username;
    return aLabel.localeCompare(bLabel);
  });

  return activity;
}
