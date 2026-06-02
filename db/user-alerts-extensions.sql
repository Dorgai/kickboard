-- In-app alerts for connections activity and match schedule (apply after fixture-prediction-types-extensions.sql).

DO $$ BEGIN
  CREATE TYPE user_alert_category AS ENUM (
    'connection_activity',
    'match_upcoming',
    'match_result'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS user_alerts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  alert_key varchar(180) NOT NULL,
  category user_alert_category NOT NULL,
  title varchar(120) NOT NULL,
  body varchar(400) NOT NULL,
  href varchar(200) NOT NULL DEFAULT '/',
  actor_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  fixture_key varchar(120),
  occurred_at timestamptz NOT NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_alerts_user_key_unique UNIQUE (user_id, alert_key)
);

CREATE INDEX IF NOT EXISTS idx_user_alerts_user_unread
  ON user_alerts (user_id, read_at, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_alerts_user_occurred
  ON user_alerts (user_id, occurred_at DESC);
