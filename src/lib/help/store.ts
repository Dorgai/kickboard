import { query } from "@/lib/db";

export type HelpChannel = "ai" | "admin";
export type HelpMessageRole = "user" | "assistant" | "admin" | "system";
export type HelpConversationStatus = "open" | "answered" | "closed";

export type HelpMessage = {
  id: string;
  role: HelpMessageRole;
  body: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type HelpConversationSummary = {
  id: string;
  channel: HelpChannel;
  subject: string | null;
  status: HelpConversationStatus;
  createdAt: string;
  updatedAt: string;
  lastMessagePreview: string | null;
  messageCount: number;
};

export type HelpConversationDetail = HelpConversationSummary & {
  messages: HelpMessage[];
  userId: string;
  userEmail: string | null;
  userDisplayName: string | null;
};

function mapMessage(row: {
  id: string;
  role: string;
  body: string;
  metadata: unknown;
  created_at: Date;
}): HelpMessage {
  return {
    id: row.id,
    role: row.role as HelpMessageRole,
    body: row.body,
    metadata:
      row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
        ? (row.metadata as Record<string, unknown>)
        : {},
    createdAt: row.created_at.toISOString()
  };
}

export async function createHelpConversation(input: {
  userId: string;
  channel: HelpChannel;
  subject?: string;
  initialMessage: string;
  initialRole?: HelpMessageRole;
  metadata?: Record<string, unknown>;
}) {
  const subject = input.subject?.trim().slice(0, 200) || null;
  const body = input.initialMessage.trim().slice(0, 4000);
  if (!body) throw new Error("MESSAGE_EMPTY");

  const conv = await query<{ id: string }>(
    `INSERT INTO help_conversations (user_id, channel, subject)
     VALUES ($1, $2, $3)
     RETURNING id`,
    [input.userId, input.channel, subject]
  );
  const conversationId = conv.rows[0]?.id;
  if (!conversationId) throw new Error("CONVERSATION_CREATE_FAILED");

  await query(
    `INSERT INTO help_messages (conversation_id, role, body, metadata)
     VALUES ($1, $2, $3, $4::jsonb)`,
    [
      conversationId,
      input.initialRole ?? "user",
      body,
      JSON.stringify(input.metadata ?? {})
    ]
  );

  return conversationId;
}

export async function appendHelpMessageToConversation(input: {
  conversationId: string;
  role: HelpMessageRole;
  body: string;
  metadata?: Record<string, unknown>;
  status?: HelpConversationStatus;
}) {
  const body = input.body.trim().slice(0, 4000);
  if (!body) throw new Error("MESSAGE_EMPTY");

  await query(
    `INSERT INTO help_messages (conversation_id, role, body, metadata)
     VALUES ($1, $2, $3, $4::jsonb)`,
    [input.conversationId, input.role, body, JSON.stringify(input.metadata ?? {})]
  );

  if (input.status) {
    await query(
      `UPDATE help_conversations SET status = $2, updated_at = now() WHERE id = $1`,
      [input.conversationId, input.status]
    );
  } else {
    await query(`UPDATE help_conversations SET updated_at = now() WHERE id = $1`, [
      input.conversationId
    ]);
  }
}

export async function appendHelpMessage(input: {
  conversationId: string;
  userId: string;
  role: HelpMessageRole;
  body: string;
  metadata?: Record<string, unknown>;
  status?: HelpConversationStatus;
}) {
  const owned = await query<{ id: string }>(
    `SELECT id FROM help_conversations WHERE id = $1 AND user_id = $2`,
    [input.conversationId, input.userId]
  );
  if (!owned.rows[0]) throw new Error("CONVERSATION_NOT_FOUND");

  await appendHelpMessageToConversation({
    conversationId: input.conversationId,
    role: input.role,
    body: input.body,
    metadata: input.metadata,
    status: input.status
  });
}

export async function appendHelpMessageAsAdmin(input: {
  conversationId: string;
  body: string;
  adminUserId: string;
}) {
  const body = input.body.trim().slice(0, 4000);
  if (!body) throw new Error("MESSAGE_EMPTY");

  const exists = await query<{ id: string; user_id: string }>(
    `SELECT id, user_id FROM help_conversations WHERE id = $1`,
    [input.conversationId]
  );
  if (!exists.rows[0]) throw new Error("CONVERSATION_NOT_FOUND");

  await query(
    `INSERT INTO help_messages (conversation_id, role, body, metadata)
     VALUES ($1, 'admin', $2, $3::jsonb)`,
    [
      input.conversationId,
      body,
      JSON.stringify({ adminUserId: input.adminUserId })
    ]
  );

  await query(
    `UPDATE help_conversations SET status = 'answered', updated_at = now() WHERE id = $1`,
    [input.conversationId]
  );
}

export async function listUserHelpConversations(userId: string, limit = 30) {
  const result = await query<{
    id: string;
    channel: string;
    subject: string | null;
    status: string;
    created_at: Date;
    updated_at: Date;
    last_body: string | null;
    message_count: string;
  }>(
    `SELECT c.id, c.channel, c.subject, c.status, c.created_at, c.updated_at,
            (
              SELECT m.body FROM help_messages m
              WHERE m.conversation_id = c.id
              ORDER BY m.created_at DESC LIMIT 1
            ) AS last_body,
            (SELECT count(*)::text FROM help_messages m WHERE m.conversation_id = c.id) AS message_count
     FROM help_conversations c
     WHERE c.user_id = $1
     ORDER BY c.updated_at DESC
     LIMIT $2`,
    [userId, limit]
  );

  return result.rows.map((row) => ({
    id: row.id,
    channel: row.channel as HelpChannel,
    subject: row.subject,
    status: row.status as HelpConversationStatus,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    lastMessagePreview: row.last_body?.slice(0, 120) ?? null,
    messageCount: Number(row.message_count) || 0
  })) satisfies HelpConversationSummary[];
}

export async function getUserHelpConversation(conversationId: string, userId: string) {
  return getHelpConversationDetail(conversationId, userId);
}

export async function getHelpConversationDetail(
  conversationId: string,
  userId?: string
): Promise<HelpConversationDetail | null> {
  const result = await query<{
    id: string;
    user_id: string;
    channel: string;
    subject: string | null;
    status: string;
    created_at: Date;
    updated_at: Date;
    email: string | null;
    display_name: string | null;
  }>(
    `SELECT c.id, c.user_id, c.channel, c.subject, c.status, c.created_at, c.updated_at,
            u.email, u.display_name
     FROM help_conversations c
     JOIN users u ON u.id = c.user_id
     WHERE c.id = $1${userId ? " AND c.user_id = $2" : ""}`,
    userId ? [conversationId, userId] : [conversationId]
  );

  const row = result.rows[0];
  if (!row) return null;

  const messages = await query<{
    id: string;
    role: string;
    body: string;
    metadata: unknown;
    created_at: Date;
  }>(
    `SELECT id, role, body, metadata, created_at
     FROM help_messages
     WHERE conversation_id = $1
     ORDER BY created_at ASC`,
    [conversationId]
  );

  const mappedMessages = messages.rows.map(mapMessage);

  return {
    id: row.id,
    userId: row.user_id,
    channel: row.channel as HelpChannel,
    subject: row.subject,
    status: row.status as HelpConversationStatus,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    userEmail: row.email,
    userDisplayName: row.display_name,
    lastMessagePreview: mappedMessages.at(-1)?.body.slice(0, 120) ?? null,
    messageCount: mappedMessages.length,
    messages: mappedMessages
  };
}

export async function listAllHelpConversationsForAdmin(input: {
  channel?: HelpChannel | null;
  limit?: number;
}) {
  const limit = Math.min(Math.max(input.limit ?? 80, 1), 200);
  const channel = input.channel ?? null;

  const result = await query<{
    id: string;
    user_id: string;
    channel: string;
    subject: string | null;
    status: string;
    created_at: Date;
    updated_at: Date;
    email: string | null;
    display_name: string | null;
    last_body: string | null;
    message_count: string;
  }>(
    `SELECT c.id, c.user_id, c.channel, c.subject, c.status, c.created_at, c.updated_at,
            u.email, u.display_name,
            (
              SELECT m.body FROM help_messages m
              WHERE m.conversation_id = c.id
              ORDER BY m.created_at DESC LIMIT 1
            ) AS last_body,
            (SELECT count(*)::text FROM help_messages m WHERE m.conversation_id = c.id) AS message_count
     FROM help_conversations c
     JOIN users u ON u.id = c.user_id
     WHERE ($1::text IS NULL OR c.channel = $1)
     ORDER BY c.updated_at DESC
     LIMIT $2`,
    [channel, limit]
  );

  return result.rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    channel: row.channel as HelpChannel,
    subject: row.subject,
    status: row.status as HelpConversationStatus,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    userEmail: row.email,
    userDisplayName: row.display_name,
    lastMessagePreview: row.last_body?.slice(0, 120) ?? null,
    messageCount: Number(row.message_count) || 0
  }));
}

export async function assertConversationOwnedByUser(conversationId: string, userId: string) {
  const row = await query<{ channel: string }>(
    `SELECT channel FROM help_conversations WHERE id = $1 AND user_id = $2`,
    [conversationId, userId]
  );
  if (!row.rows[0]) throw new Error("CONVERSATION_NOT_FOUND");
  return row.rows[0].channel as HelpChannel;
}
