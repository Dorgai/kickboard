import { query } from "@/lib/db";

export type ConnectionStatus = "pending" | "accepted" | "blocked";

export type PublicUserCard = {
  id: string;
  username: string;
  displayName: string | null;
  pointsBalance: number;
};

export type ConnectionRow = {
  id: string;
  status: ConnectionStatus;
  createdAt: string;
  respondedAt: string | null;
  direction: "incoming" | "outgoing";
  peer: PublicUserCard;
};

function mapUserCard(row: {
  id: string;
  username: string;
  display_name: string | null;
  points_balance: number;
}): PublicUserCard {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    pointsBalance: row.points_balance
  };
}

export async function searchConnectableUsers(viewerId: string, queryText: string, limit = 12) {
  const term = queryText.trim().slice(0, 40);
  if (term.length < 2) return [];

  const pattern = `%${term.replace(/[%_]/g, "")}%`;

  const result = await query<{
    id: string;
    username: string;
    display_name: string | null;
    points_balance: number;
  }>(
    `SELECT id, username, display_name, points_balance
     FROM users
     WHERE deleted_at IS NULL
       AND is_suspended = false
       AND COALESCE(is_banned, false) = false
       AND is_child = false
       AND onboarding_completed_at IS NOT NULL
       AND id <> $1
       AND (username ILIKE $2 OR display_name ILIKE $2)
     ORDER BY
       CASE WHEN username ILIKE $3 THEN 0 ELSE 1 END,
       username
     LIMIT $4`,
    [viewerId, pattern, `${term}%`, limit]
  );

  return result.rows.map(mapUserCard);
}

async function getConnectionBetween(userA: string, userB: string) {
  const result = await query<{
    id: string;
    requester_id: string;
    addressee_id: string;
    status: ConnectionStatus;
  }>(
    `SELECT id, requester_id, addressee_id, status
     FROM connections
     WHERE least(requester_id, addressee_id) = least($1::uuid, $2::uuid)
       AND greatest(requester_id, addressee_id) = greatest($1::uuid, $2::uuid)`,
    [userA, userB]
  );
  return result.rows[0] ?? null;
}

export async function areUsersConnected(userId: string, peerId: string) {
  if (userId === peerId) return false;
  const row = await getConnectionBetween(userId, peerId);
  return row?.status === "accepted";
}

/** Ensures an accepted connection (e.g. official Kickboard moderator account → user). */
export async function ensureAcceptedConnection(userId: string, peerId: string) {
  if (userId === peerId) return;
  const existing = await getConnectionBetween(userId, peerId);
  if (existing?.status === "accepted") return;

  if (existing) {
    await query(
      `UPDATE connections
       SET status = 'accepted', responded_at = COALESCE(responded_at, now())
       WHERE id = $1`,
      [existing.id]
    );
    return;
  }

  await query(
    `INSERT INTO connections (requester_id, addressee_id, status, responded_at)
     VALUES ($1, $2, 'accepted', now())`,
    [userId, peerId]
  );
}

export async function createConnectionRequest(requesterId: string, addresseeUsername: string) {
  const username = addresseeUsername.trim().toLowerCase().slice(0, 30);
  if (!username) throw new Error("USERNAME_REQUIRED");

  const addressee = await query<{ id: string; is_child: boolean }>(
    `SELECT id, is_child
     FROM users
     WHERE username = $1 AND deleted_at IS NULL AND is_suspended = false
       AND COALESCE(is_banned, false) = false`,
    [username]
  );
  const peer = addressee.rows[0];
  if (!peer) throw new Error("USER_NOT_FOUND");
  if (peer.is_child) throw new Error("CANNOT_CONNECT_CHILD");
  if (peer.id === requesterId) throw new Error("CANNOT_CONNECT_SELF");

  const requester = await query<{ is_child: boolean }>(
    `SELECT is_child FROM users WHERE id = $1`,
    [requesterId]
  );
  if (requester.rows[0]?.is_child) throw new Error("CHILD_CANNOT_CONNECT");

  const existing = await getConnectionBetween(requesterId, peer.id);
  if (existing) {
    if (existing.status === "accepted") throw new Error("ALREADY_CONNECTED");
    if (existing.status === "blocked") throw new Error("CONNECTION_BLOCKED");
    if (existing.status === "pending") throw new Error("REQUEST_ALREADY_PENDING");
  }

  const inserted = await query<{ id: string }>(
    `INSERT INTO connections (requester_id, addressee_id, status)
     VALUES ($1, $2, 'pending')
     RETURNING id`,
    [requesterId, peer.id]
  );

  return inserted.rows[0]?.id ?? null;
}

export async function respondToConnectionRequest(
  connectionId: string,
  actorId: string,
  action: "accept" | "reject" | "block"
) {
  const row = await query<{
    id: string;
    requester_id: string;
    addressee_id: string;
    status: ConnectionStatus;
  }>(
    `SELECT id, requester_id, addressee_id, status FROM connections WHERE id = $1`,
    [connectionId]
  );
  const connection = row.rows[0];
  if (!connection) return null;

  const isAddressee = connection.addressee_id === actorId;
  const isRequester = connection.requester_id === actorId;
  if (!isAddressee && !isRequester) throw new Error("FORBIDDEN");

  if (action === "reject") {
    if (!isAddressee && !isRequester) throw new Error("FORBIDDEN");
    await query(`DELETE FROM connections WHERE id = $1`, [connectionId]);
    return { status: "removed" as const };
  }

  if (action === "accept") {
    if (!isAddressee) throw new Error("ONLY_ADDRESSEE_CAN_ACCEPT");
    if (connection.status !== "pending") throw new Error("NOT_PENDING");
    await query(
      `UPDATE connections
       SET status = 'accepted', responded_at = now()
       WHERE id = $1`,
      [connectionId]
    );
    return { status: "accepted" as const };
  }

  if (action === "block") {
    await query(
      `UPDATE connections
       SET status = 'blocked', responded_at = now()
       WHERE id = $1`,
      [connectionId]
    );
    return { status: "blocked" as const };
  }

  return null;
}

export async function cancelOutgoingRequest(connectionId: string, requesterId: string) {
  const result = await query(
    `DELETE FROM connections
     WHERE id = $1 AND requester_id = $2 AND status = 'pending'`,
    [connectionId, requesterId]
  );
  return (result.rowCount ?? 0) > 0;
}

export async function listConnectionsForUser(userId: string) {
  const result = await query<{
    id: string;
    requester_id: string;
    addressee_id: string;
    status: ConnectionStatus;
    created_at: Date;
    responded_at: Date | null;
    peer_id: string;
    peer_username: string;
    peer_display_name: string | null;
    peer_points_balance: number;
  }>(
    `SELECT c.id, c.requester_id, c.addressee_id, c.status, c.created_at, c.responded_at,
            p.id AS peer_id, p.username AS peer_username, p.display_name AS peer_display_name,
            p.points_balance AS peer_points_balance
     FROM connections c
     INNER JOIN users p ON p.id = CASE WHEN c.requester_id = $1 THEN c.addressee_id ELSE c.requester_id END
     WHERE (c.requester_id = $1 OR c.addressee_id = $1)
       AND p.deleted_at IS NULL
       AND p.is_suspended = false
       AND COALESCE(p.is_banned, false) = false
     ORDER BY c.created_at DESC`,
    [userId]
  );

  const accepted: ConnectionRow[] = [];
  const pendingIncoming: ConnectionRow[] = [];
  const pendingOutgoing: ConnectionRow[] = [];

  for (const row of result.rows) {
    const peer = mapUserCard({
      id: row.peer_id,
      username: row.peer_username,
      display_name: row.peer_display_name,
      points_balance: row.peer_points_balance
    });
    const direction = row.requester_id === userId ? "outgoing" : "incoming";
    const item: ConnectionRow = {
      id: row.id,
      status: row.status,
      createdAt: row.created_at.toISOString(),
      respondedAt: row.responded_at?.toISOString() ?? null,
      direction,
      peer
    };

    if (row.status === "accepted") {
      accepted.push(item);
    } else if (row.status === "pending" && direction === "incoming") {
      pendingIncoming.push(item);
    } else if (row.status === "pending" && direction === "outgoing") {
      pendingOutgoing.push(item);
    }
  }

  return { accepted, pendingIncoming, pendingOutgoing };
}

/** Connect inviter and new registrant after a registration invite is redeemed. */
export async function createAcceptedConnection(inviterId: string, inviteeId: string) {
  if (inviterId === inviteeId) return;

  const existing = await getConnectionBetween(inviterId, inviteeId);
  if (existing?.status === "accepted") return;
  if (existing?.status === "blocked") return;

  if (existing?.status === "pending") {
    if (existing.addressee_id === inviteeId) {
      await respondToConnectionRequest(existing.id, inviteeId, "accept");
    }
    return;
  }

  await query(
    `INSERT INTO connections (requester_id, addressee_id, status, responded_at)
     VALUES ($1, $2, 'accepted', now())`,
    [inviterId, inviteeId]
  );
}

export async function listAcceptedPeerIds(userId: string) {
  const result = await query<{ peer_id: string }>(
    `SELECT CASE WHEN requester_id = $1 THEN addressee_id ELSE requester_id END AS peer_id
     FROM connections
     WHERE status = 'accepted'
       AND (requester_id = $1 OR addressee_id = $1)`,
    [userId]
  );
  return result.rows.map((row) => row.peer_id);
}
