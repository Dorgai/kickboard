-- Audit log for fixture prediction create / update / delete (apply after fixture-prediction-types-extensions.sql).

CREATE TABLE IF NOT EXISTS fixture_prediction_events (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  fixture_key varchar(120) NOT NULL,
  action varchar(16) NOT NULL CHECK (action IN ('created', 'updated', 'deleted')),
  summary varchar(320) NOT NULL,
  previous_snapshot jsonb,
  next_snapshot jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fixture_prediction_events_user_created
  ON fixture_prediction_events (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_fixture_prediction_events_peers_created
  ON fixture_prediction_events (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_fixture_prediction_events_fixture
  ON fixture_prediction_events (fixture_key, created_at DESC);
