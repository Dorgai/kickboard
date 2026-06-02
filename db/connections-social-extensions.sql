-- Social connections visibility + per-fixture score picks (free-to-play, not wagering).
-- Apply after fixture-scope-extensions.sql.

CREATE TABLE IF NOT EXISTS fixture_predictions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  fixture_key varchar(120) NOT NULL,
  home_score smallint NOT NULL,
  away_score smallint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (home_score BETWEEN 0 AND 20),
  CHECK (away_score BETWEEN 0 AND 20),
  UNIQUE (user_id, fixture_key)
);

CREATE INDEX IF NOT EXISTS idx_fixture_predictions_fixture
  ON fixture_predictions (fixture_key, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_connections_requester_status
  ON connections (requester_id, status);

CREATE INDEX IF NOT EXISTS idx_connections_addressee_status
  ON connections (addressee_id, status);
