-- Admin moderation: instant community posts, user bans, Fan Chat message removal.

ALTER TABLE posts ALTER COLUMN moderation_status SET DEFAULT 'approved';

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_banned boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS banned_at timestamptz;

ALTER TABLE fan_chat_messages
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_fan_chat_messages_created
  ON fan_chat_messages (created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_users_admin_search
  ON users (username, email)
  WHERE deleted_at IS NULL;
