-- Direct Fan Chat messages between connected users (apply after connections-social-extensions.sql).

CREATE TABLE IF NOT EXISTS fan_chat_messages (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  broadcast_id uuid,
  body varchar(500) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (sender_id <> recipient_id),
  CHECK (char_length(trim(body)) >= 1)
);

CREATE INDEX IF NOT EXISTS idx_fan_chat_recipient_created
  ON fan_chat_messages (recipient_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_fan_chat_sender_recipient_created
  ON fan_chat_messages (sender_id, recipient_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_fan_chat_sender_broadcast
  ON fan_chat_messages (sender_id, broadcast_id, created_at DESC)
  WHERE broadcast_id IS NOT NULL;
