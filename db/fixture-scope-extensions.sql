-- Per-fixture Coach Board scope (apply after auth-extensions.sql).

ALTER TABLE squads
  ADD COLUMN IF NOT EXISTS fixture_key varchar(120);

ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS fixture_key varchar(120);

CREATE INDEX IF NOT EXISTS idx_squads_user_fixture
  ON squads (user_id, fixture_key, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_posts_fixture_created
  ON posts (fixture_key, created_at DESC)
  WHERE deleted_at IS NULL;
