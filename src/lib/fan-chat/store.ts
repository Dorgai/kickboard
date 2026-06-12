import { randomUUID } from "node:crypto";
import { areUsersConnected, listAcceptedPeerIds } from "@/lib/connections/store";
import { deliverUserAlert } from "@/lib/alerts/deliver";
import { query } from "@/lib/db";
import { ensureFanChatSchema } from "@/lib/fan-chat/ensure-schema";

const MAX_BODY_LENGTH = 500;
const MAX_THREAD_MESSAGES = 120;

export type FanChatDeliveryStatus = "pending" | "sent" | "read";

export type FanChatMessage = {
  id: string;
  senderId: string;
  recipientId: string;
  broadcastId: string | null;
  body: string;
  createdAt: string;
  editedAt: string | null;
  senderUsername: string;
  senderDisplayName: string | null;
  recipientUsername: string;
  recipientDisplayName: string | null;
  direction: "outgoing" | "incoming";
  /** Outgoing 1:1 messages only — pending is client-only while sending. */
  deliveryStatus: FanChatDeliveryStatus | null;
};

export type FanChatBroadcastSummary = {
  broadcastId: string;
  body: string;
  recipientCount: number;
  createdAt: string;
};

export type FanChatInboxThread = {
  peerId: string;
  peerUsername: string;
  peerDisplayName: string | null;
  lastMessageBody: string | null;
  lastMessageAt: string | null;
  lastDirection: "incoming" | "outgoing" | null;
  unreadCount: number;
};

function mapMessage(row: {
  id: string;
  sender_id: string;
  recipient_id: string;
  broadcast_id: string | null;
  body: string;
  created_at: Date;
  edited_at: Date | null;
  sender_username: string;
  sender_display_name: string | null;
  recipient_username: string;
  recipient_display_name: string | null;
  viewer_id: string;
  delivery_status: string | null;
}): FanChatMessage {
  const direction = row.sender_id === row.viewer_id ? "outgoing" : "incoming";
  let deliveryStatus: FanChatDeliveryStatus | null = null;
  if (direction === "outgoing" && !row.broadcast_id) {
    deliveryStatus = row.delivery_status === "read" ? "read" : "sent";
  }

  return {
    id: row.id,
    senderId: row.sender_id,
    recipientId: row.recipient_id,
    broadcastId: row.broadcast_id,
    body: row.body,
    createdAt: row.created_at.toISOString(),
    editedAt: row.edited_at?.toISOString() ?? null,
    senderUsername: row.sender_username,
    senderDisplayName: row.sender_display_name,
    recipientUsername: row.recipient_username,
    recipientDisplayName: row.recipient_display_name,
    direction,
    deliveryStatus
  };
}

export function normalizeFanChatBody(body: string) {
  return body.trim().slice(0, MAX_BODY_LENGTH);
}

async function notifyRecipient(input: {
  recipientId: string;
  senderId: string;
  senderDisplayName: string;
  messageId: string;
  body: string;
  broadcast: boolean;
}) {
  const preview = input.body.length > 80 ? `${input.body.slice(0, 77)}…` : input.body;
  const title = input.broadcast ? "Message from a connection" : `Message from ${input.senderDisplayName}`;
  await deliverUserAlert({
    userId: input.recipientId,
    alertKey: `fan-chat:${input.messageId}`,
    category: "connection_activity",
    title,
    body: preview,
    href: "/#fan-chat",
    occurredAt: new Date(),
    actorUserId: input.senderId,
    push: true
  });
}

export async function sendFanChatMessage(
  senderId: string,
  senderDisplayName: string,
  input: { recipientId: string | "all"; body: string }
) {
  await ensureFanChatSchema();
  const body = normalizeFanChatBody(input.body);
  if (!body) throw new Error("MESSAGE_EMPTY");

  if (input.recipientId === "all") {
    const peerIds = await listAcceptedPeerIds(senderId);
    if (!peerIds.length) throw new Error("NO_CONNECTIONS");

    const broadcastId = randomUUID();
    const createdAt = new Date();

    for (const recipientId of peerIds) {
      const inserted = await query<{ id: string }>(
        `INSERT INTO fan_chat_messages (sender_id, recipient_id, broadcast_id, body, created_at)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [senderId, recipientId, broadcastId, body, createdAt]
      );
      const messageId = inserted.rows[0]?.id;
      if (messageId) {
        await notifyRecipient({
          recipientId,
          senderId,
          senderDisplayName,
          messageId,
          body,
          broadcast: true
        });
      }
    }

    return { mode: "broadcast" as const, broadcastId, recipientCount: peerIds.length };
  }

  const recipientId = input.recipientId.trim();
  if (!recipientId) throw new Error("RECIPIENT_REQUIRED");

  const connected = await areUsersConnected(senderId, recipientId);
  if (!connected) throw new Error("NOT_CONNECTED");

  const inserted = await query<{ id: string; created_at: Date }>(
    `INSERT INTO fan_chat_messages (sender_id, recipient_id, body)
     VALUES ($1, $2, $3)
     RETURNING id, created_at`,
    [senderId, recipientId, body]
  );
  const row = inserted.rows[0];
  if (!row) throw new Error("SEND_FAILED");

  await notifyRecipient({
    recipientId,
    senderId,
    senderDisplayName,
    messageId: row.id,
    body,
    broadcast: false
  });

  return { mode: "direct" as const, messageId: row.id, createdAt: row.created_at.toISOString() };
}

export async function markFanChatThreadRead(viewerId: string, peerId: string) {
  await ensureFanChatSchema();
  const connected = await areUsersConnected(viewerId, peerId);
  if (!connected) return;

  await query(
    `INSERT INTO fan_chat_thread_reads (user_id, peer_id, last_read_at)
     VALUES ($1, $2, now())
     ON CONFLICT (user_id, peer_id)
     DO UPDATE SET last_read_at = EXCLUDED.last_read_at`,
    [viewerId, peerId]
  );
}

export async function listFanChatInbox(viewerId: string): Promise<FanChatInboxThread[]> {
  await ensureFanChatSchema();

  const result = await query<{
    peer_id: string;
    peer_username: string;
    peer_display_name: string | null;
    last_message_body: string | null;
    last_message_at: Date | null;
    last_sender_id: string | null;
    unread_count: string;
  }>(
    `WITH accepted_peers AS (
       SELECT CASE WHEN c.requester_id = $1 THEN c.addressee_id ELSE c.requester_id END AS peer_id
       FROM connections c
       WHERE c.status = 'accepted'
         AND (c.requester_id = $1 OR c.addressee_id = $1)
     ),
     thread_messages AS (
       SELECT
         CASE WHEN m.sender_id = $1 THEN m.recipient_id ELSE m.sender_id END AS peer_id,
         m.body,
         m.created_at,
         m.sender_id
       FROM fan_chat_messages m
       WHERE m.deleted_at IS NULL
         AND (m.sender_id = $1 OR m.recipient_id = $1)
     ),
     last_per_peer AS (
       SELECT DISTINCT ON (peer_id)
         peer_id,
         body,
         created_at,
         sender_id
       FROM thread_messages
       ORDER BY peer_id, created_at DESC
     ),
     unread_per_peer AS (
       SELECT
         m.sender_id AS peer_id,
         count(*)::text AS unread_count
       FROM fan_chat_messages m
       LEFT JOIN fan_chat_thread_reads r
         ON r.user_id = $1 AND r.peer_id = m.sender_id
       WHERE m.deleted_at IS NULL
         AND m.recipient_id = $1
         AND m.created_at > COALESCE(r.last_read_at, to_timestamp(0))
       GROUP BY m.sender_id
     )
     SELECT
       p.peer_id,
       u.username AS peer_username,
       u.display_name AS peer_display_name,
       l.body AS last_message_body,
       l.created_at AS last_message_at,
       l.sender_id AS last_sender_id,
       COALESCE(uu.unread_count, '0') AS unread_count
     FROM accepted_peers p
     INNER JOIN users u ON u.id = p.peer_id
       AND u.deleted_at IS NULL
       AND u.is_suspended = false
       AND COALESCE(u.is_banned, false) = false
     LEFT JOIN last_per_peer l ON l.peer_id = p.peer_id
     LEFT JOIN unread_per_peer uu ON uu.peer_id = p.peer_id
     ORDER BY
       COALESCE(l.created_at, to_timestamp(0)) DESC,
       u.username ASC`,
    [viewerId]
  );

  return result.rows.map((row) => ({
    peerId: row.peer_id,
    peerUsername: row.peer_username,
    peerDisplayName: row.peer_display_name,
    lastMessageBody: row.last_message_body,
    lastMessageAt: row.last_message_at?.toISOString() ?? null,
    lastDirection:
      row.last_sender_id === null
        ? null
        : row.last_sender_id === viewerId
          ? "outgoing"
          : "incoming",
    unreadCount: Number(row.unread_count) || 0
  }));
}

export async function listFanChatThread(viewerId: string, peerId: string) {
  await ensureFanChatSchema();
  const connected = await areUsersConnected(viewerId, peerId);
  if (!connected) throw new Error("NOT_CONNECTED");

  const result = await query<{
    id: string;
    sender_id: string;
    recipient_id: string;
    broadcast_id: string | null;
    body: string;
    created_at: Date;
    edited_at: Date | null;
    sender_username: string;
    sender_display_name: string | null;
    recipient_username: string;
    recipient_display_name: string | null;
    delivery_status: string | null;
  }>(
    `SELECT m.id, m.sender_id, m.recipient_id, m.broadcast_id, m.body, m.created_at, m.edited_at,
            s.username AS sender_username, s.display_name AS sender_display_name,
            r.username AS recipient_username, r.display_name AS recipient_display_name,
            CASE
              WHEN m.sender_id = $1 AND m.broadcast_id IS NULL THEN
                CASE
                  WHEN pr.last_read_at IS NOT NULL AND pr.last_read_at >= m.created_at THEN 'read'
                  ELSE 'sent'
                END
              ELSE NULL
            END AS delivery_status
     FROM (
       SELECT m.id, m.sender_id, m.recipient_id, m.broadcast_id, m.body, m.created_at, m.edited_at
       FROM fan_chat_messages m
       WHERE m.deleted_at IS NULL
         AND ((m.sender_id = $1 AND m.recipient_id = $2)
           OR (m.sender_id = $2 AND m.recipient_id = $1))
       ORDER BY m.created_at DESC
       LIMIT $3
     ) m
     INNER JOIN users s ON s.id = m.sender_id
     INNER JOIN users r ON r.id = m.recipient_id
     LEFT JOIN fan_chat_thread_reads pr
       ON pr.user_id = m.recipient_id AND pr.peer_id = m.sender_id
     ORDER BY m.created_at ASC`,
    [viewerId, peerId, MAX_THREAD_MESSAGES]
  );

  const messages = result.rows.map((row) =>
    mapMessage({
      ...row,
      viewer_id: viewerId
    })
  );

  await markFanChatThreadRead(viewerId, peerId);

  return messages;
}

export async function updateFanChatMessage(senderId: string, messageId: string, bodyInput: string) {
  await ensureFanChatSchema();
  const body = normalizeFanChatBody(bodyInput);
  if (!body) throw new Error("MESSAGE_EMPTY");

  const messageIdTrimmed = messageId.trim();
  if (!messageIdTrimmed || messageIdTrimmed.startsWith("pending-")) {
    throw new Error("MESSAGE_NOT_FOUND");
  }

  const updated = await query<{ id: string; edited_at: Date }>(
    `UPDATE fan_chat_messages
     SET body = $3, edited_at = now()
     WHERE id = $2
       AND sender_id = $1
       AND broadcast_id IS NULL
       AND deleted_at IS NULL
     RETURNING id, edited_at`,
    [senderId, messageIdTrimmed, body]
  );

  if (!updated.rows[0]) throw new Error("MESSAGE_NOT_FOUND");
  return {
    messageId: updated.rows[0].id,
    editedAt: updated.rows[0].edited_at.toISOString()
  };
}

export async function listFanChatBroadcasts(viewerId: string) {
  await ensureFanChatSchema();
  const result = await query<{
    broadcast_id: string;
    body: string;
    recipient_count: string;
    created_at: Date;
  }>(
    `SELECT broadcast_id, body, count(*)::text AS recipient_count, min(created_at) AS created_at
     FROM fan_chat_messages
     WHERE sender_id = $1 AND broadcast_id IS NOT NULL AND deleted_at IS NULL
     GROUP BY broadcast_id, body
     ORDER BY min(created_at) DESC
     LIMIT 40`,
    [viewerId]
  );

  return result.rows.map((row) => ({
    broadcastId: row.broadcast_id,
    body: row.body,
    recipientCount: Number(row.recipient_count),
    createdAt: row.created_at.toISOString()
  }));
}
