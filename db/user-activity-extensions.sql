-- User presence (online) and activity audit log for admin dashboards.

CREATE TABLE IF NOT EXISTS user_presence_sessions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  user_agent varchar(500),
  last_page_path varchar(500)
);

CREATE INDEX IF NOT EXISTS idx_presence_user_last_seen
  ON user_presence_sessions (user_id, last_seen_at DESC);

CREATE INDEX IF NOT EXISTS idx_presence_active
  ON user_presence_sessions (last_seen_at DESC)
  WHERE ended_at IS NULL;

CREATE TABLE IF NOT EXISTS user_activity_events (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id uuid REFERENCES user_presence_sessions(id) ON DELETE SET NULL,
  event_type varchar(64) NOT NULL,
  summary varchar(500),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_user_created
  ON user_activity_events (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_activity_created
  ON user_activity_events (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_activity_type_created
  ON user_activity_events (event_type, created_at DESC);
