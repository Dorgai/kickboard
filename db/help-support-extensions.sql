-- Help center: AI + admin support conversations (apply after auth-extensions.sql).

CREATE TABLE IF NOT EXISTS help_conversations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel varchar(16) NOT NULL CHECK (channel IN ('ai', 'admin')),
  subject varchar(200),
  status varchar(24) NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'answered', 'closed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_help_conversations_user_updated
  ON help_conversations (user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_help_conversations_channel_updated
  ON help_conversations (channel, updated_at DESC);

CREATE TABLE IF NOT EXISTS help_messages (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id uuid NOT NULL REFERENCES help_conversations(id) ON DELETE CASCADE,
  role varchar(16) NOT NULL CHECK (role IN ('user', 'assistant', 'admin', 'system')),
  body text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (char_length(trim(body)) >= 1)
);

CREATE INDEX IF NOT EXISTS idx_help_messages_conversation_created
  ON help_messages (conversation_id, created_at ASC);
