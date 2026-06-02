-- Auth, onboarding, and squad builder extensions (apply after db/schema.sql).

ALTER TABLE users
  ALTER COLUMN birth_year DROP NOT NULL;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS oauth_provider varchar(20),
  ADD COLUMN IF NOT EXISTS oauth_subject varchar(255),
  ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_oauth_provider_subject
  ON users (oauth_provider, oauth_subject)
  WHERE oauth_provider IS NOT NULL AND oauth_subject IS NOT NULL;

ALTER TABLE squads
  ADD COLUMN IF NOT EXISTS lineup jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE squads
  DROP CONSTRAINT IF EXISTS squads_lineup_is_array;

ALTER TABLE squads
  ADD CONSTRAINT squads_lineup_is_array CHECK (jsonb_typeof(lineup) = 'array');

INSERT INTO tournaments (name, short_name, start_date, end_date, status)
SELECT '2026 FIFA World Cup', 'WC26', '2026-06-11', '2026-07-19', 'upcoming'
WHERE NOT EXISTS (SELECT 1 FROM tournaments WHERE short_name = 'WC26');
