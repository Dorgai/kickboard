import { randomUUID } from "node:crypto";
import { areUsersConnected, listAcceptedPeerIds } from "@/lib/connections/store";
import { upsertUserAlert } from "@/lib/alerts/store";
import { query } from "@/lib/db";

const MAX_BODY_LENGTH = 500;
const MAX_THREAD_MESSAGES = 120;

export type FanChatMessage = {
  id: string;
  senderId: string;
  recipientId: string;
  broadcastId: string | null;
  body: string;
  createdAt: string;
  senderUsername: string;
  senderDisplayName: string | null;
  recipientUsername: string;
  recipientDisplayName: string | null;
  direction: "outgoing" | "incoming";
};

export type FanChatBroadcastSummary = {
  broadcastId: string;
  body: string;
  recipientCount: number;
  createdAt: string;
};

function mapMessage(row: {
  id: string;
  sender_id: string;
  recipient_id: string;
  broadcast_id: string | null;
  body: string;
  created_at: Date;
  sender_username: string;
  sender_display_name: string | null;
  recipient_username: string;
  recipient_display_name: string | null;
  viewer_id: string;
}): FanChatMessage {
  return {
    id: row.id,
    senderId: row.sender_id,
    recipientId: row.recipient_id,
    broadcastId: row.broadcast_id,
    body: row.body,
    createdAt: row.created_at.toISOString(),
    senderUsername: row.sender_username,
    senderDisplayName: row.sender_display_name,
    recipientUsername: row.recipient_username,
    recipientDisplayName: row.recipient_display_name,
    direction: row.sender_id === row.viewer_id ? "outgoing" : "incoming"
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
  await upsertUserAlert({
    userId: input.recipientId,
    alertKey: `fan-chat:${input.messageId}`,
    category: "connection_activity",
    title,
    body: preview,
    href: "/#fan-chat",
    occurredAt: new Date(),
    actorUserId: input.senderId
  });
}

export async function sendFanChatMessage(
  senderId: string,
  senderDisplayName: string,
  input: { recipientId: string | "all"; body: string }
) {
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

export async function listFanChatThread(viewerId: string, peerId: string) {
  const connected = await areUsersConnected(viewerId, peerId);
  if (!connected) throw new Error("NOT_CONNECTED");

  const result = await query<{
    id: string;
    sender_id: string;
    recipient_id: string;
    broadcast_id: string | null;
    body: string;
    created_at: Date;
    sender_username: string;
    sender_display_name: string | null;
    recipient_username: string;
    recipient_display_name: string | null;
  }>(
    `SELECT m.id, m.sender_id, m.recipient_id, m.broadcast_id, m.body, m.created_at,
            s.username AS sender_username, s.display_name AS sender_display_name,
            r.username AS recipient_username, r.display_name AS recipient_display_name
     FROM fan_chat_messages m
     INNER JOIN users s ON s.id = m.sender_id
     INNER JOIN users r ON r.id = m.recipient_id
     WHERE m.deleted_at IS NULL
       AND ((m.sender_id = $1 AND m.recipient_id = $2)
         OR (m.sender_id = $2 AND m.recipient_id = $1))
     ORDER BY m.created_at ASC
     LIMIT $3`,
    [viewerId, peerId, MAX_THREAD_MESSAGES]
  );

  return result.rows.map((row) =>
    mapMessage({
      ...row,
      viewer_id: viewerId
    })
  );
}

export async function listFanChatBroadcasts(viewerId: string) {
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
