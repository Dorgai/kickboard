import { isDatabaseConfigured, query } from "@/lib/db";

let fanChatSchemaReady: Promise<boolean> | null = null;

/** Idempotent — fan chat tables/columns when migrations were not applied yet. */
export async function ensureFanChatSchema(): Promise<boolean> {
  if (!isDatabaseConfigured()) return false;

  if (!fanChatSchemaReady) {
    fanChatSchemaReady = (async () => {
      try {
        await query(`
          CREATE TABLE IF NOT EXISTS fan_chat_messages (
            id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
            sender_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            recipient_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            broadcast_id uuid,
            body varchar(500) NOT NULL,
            created_at timestamptz NOT NULL DEFAULT now(),
            CHECK (sender_id <> recipient_id),
            CHECK (char_length(trim(body)) >= 1)
          )
        `);
        await query(`
          ALTER TABLE fan_chat_messages
          ADD COLUMN IF NOT EXISTS deleted_at timestamptz
        `);
        await query(`
          ALTER TABLE fan_chat_messages
          ADD COLUMN IF NOT EXISTS edited_at timestamptz
        `);
        await query(`
          CREATE INDEX IF NOT EXISTS idx_fan_chat_recipient_created
            ON fan_chat_messages (recipient_id, created_at DESC)
        `);
        await query(`
          CREATE INDEX IF NOT EXISTS idx_fan_chat_sender_recipient_created
            ON fan_chat_messages (sender_id, recipient_id, created_at DESC)
        `);
        await query(`
          CREATE TABLE IF NOT EXISTS fan_chat_thread_reads (
            user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            peer_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            last_read_at timestamptz NOT NULL DEFAULT now(),
            PRIMARY KEY (user_id, peer_id),
            CHECK (user_id <> peer_id)
          )
        `);
        return true;
      } catch (error) {
        console.error("[fan-chat] ensure schema failed", error);
        fanChatSchemaReady = null;
        return false;
      }
    })();
  }

  return fanChatSchemaReady;
}
