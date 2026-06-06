import { getAdminMessagingSenderId } from "@/lib/admin/system-user";
import { ensureAcceptedConnection } from "@/lib/connections/store";
import { normalizeFanChatBody } from "@/lib/fan-chat/store";
import { deliverUserAlert } from "@/lib/alerts/deliver";
import { query } from "@/lib/db";

export type AdminFanChatMessage = {
  id: string;
  senderId: string;
  recipientId: string;
  body: string;
  createdAt: string;
  senderUsername: string;
  senderDisplayName: string | null;
  recipientUsername: string;
  recipientDisplayName: string | null;
  broadcastId: string | null;
};

export async function listFanChatMessagesForAdmin(limit = 60, userId?: string | null) {
  const capped = Math.min(Math.max(limit, 1), 200);
  const filterUserId = userId?.trim() || null;

  const result = filterUserId
    ? await query<{
        id: string;
        sender_id: string;
        recipient_id: string;
        body: string;
        created_at: Date;
        broadcast_id: string | null;
        sender_username: string;
        sender_display_name: string | null;
        recipient_username: string;
        recipient_display_name: string | null;
      }>(
        `SELECT m.id, m.sender_id, m.recipient_id, m.body, m.created_at, m.broadcast_id,
                s.username AS sender_username, s.display_name AS sender_display_name,
                r.username AS recipient_username, r.display_name AS recipient_display_name
         FROM fan_chat_messages m
         INNER JOIN users s ON s.id = m.sender_id
         INNER JOIN users r ON r.id = m.recipient_id
         WHERE m.deleted_at IS NULL
           AND (m.sender_id = $2 OR m.recipient_id = $2)
         ORDER BY m.created_at DESC
         LIMIT $1`,
        [capped, filterUserId]
      )
    : await query<{
        id: string;
        sender_id: string;
        recipient_id: string;
        body: string;
        created_at: Date;
        broadcast_id: string | null;
        sender_username: string;
        sender_display_name: string | null;
        recipient_username: string;
        recipient_display_name: string | null;
      }>(
        `SELECT m.id, m.sender_id, m.recipient_id, m.body, m.created_at, m.broadcast_id,
                s.username AS sender_username, s.display_name AS sender_display_name,
                r.username AS recipient_username, r.display_name AS recipient_display_name
         FROM fan_chat_messages m
         INNER JOIN users s ON s.id = m.sender_id
         INNER JOIN users r ON r.id = m.recipient_id
         WHERE m.deleted_at IS NULL
         ORDER BY m.created_at DESC
         LIMIT $1`,
        [capped]
      );

  return result.rows.map(
    (row): AdminFanChatMessage => ({
      id: row.id,
      senderId: row.sender_id,
      recipientId: row.recipient_id,
      body: row.body,
      createdAt: row.created_at.toISOString(),
      broadcastId: row.broadcast_id,
      senderUsername: row.sender_username,
      senderDisplayName: row.sender_display_name,
      recipientUsername: row.recipient_username,
      recipientDisplayName: row.recipient_display_name
    })
  );
}

export async function deleteFanChatMessageForAdmin(messageId: string) {
  const result = await query<{ id: string }>(
    `UPDATE fan_chat_messages
     SET deleted_at = now()
     WHERE id = $1 AND deleted_at IS NULL
     RETURNING id`,
    [messageId]
  );

  if (!result.rowCount) throw new Error("MESSAGE_NOT_FOUND");
}

export async function sendAdminDirectMessage(recipientUserId: string, body: string) {
  const trimmed = normalizeFanChatBody(body);
  if (!trimmed) throw new Error("MESSAGE_EMPTY");

  const recipient = await query<{ id: string }>(
    `SELECT id FROM users WHERE id = $1 AND deleted_at IS NULL`,
    [recipientUserId]
  );
  if (!recipient.rows[0]?.id) throw new Error("USER_NOT_FOUND");

  const senderId = await getAdminMessagingSenderId();
  await ensureAcceptedConnection(senderId, recipientUserId);

  const inserted = await query<{ id: string; created_at: Date }>(
    `INSERT INTO fan_chat_messages (sender_id, recipient_id, body)
     VALUES ($1, $2, $3)
     RETURNING id, created_at`,
    [senderId, recipientUserId, trimmed]
  );
  const row = inserted.rows[0];
  if (!row) throw new Error("SEND_FAILED");

  const preview = trimmed.length > 80 ? `${trimmed.slice(0, 77)}…` : trimmed;
  await deliverUserAlert({
    userId: recipientUserId,
    alertKey: `fan-chat:${row.id}`,
    category: "connection_activity",
    title: "Message from Kickboard",
    body: preview,
    href: "/#fan-chat",
    occurredAt: row.created_at,
    actorUserId: senderId,
    push: true
  });

  return { messageId: row.id, createdAt: row.created_at.toISOString(), senderId };
}
