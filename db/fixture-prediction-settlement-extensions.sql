-- Optional settlement fields for fixture score picks (apply after connections-social-extensions.sql).

ALTER TABLE fixture_predictions
  ADD COLUMN IF NOT EXISTS result_status varchar(20) NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS points_awarded smallint NOT NULL DEFAULT 0;

ALTER TABLE fixture_predictions
  DROP CONSTRAINT IF EXISTS fixture_predictions_result_status_check;

ALTER TABLE fixture_predictions
  ADD CONSTRAINT fixture_predictions_result_status_check
  CHECK (result_status IN ('pending', 'won', 'lost', 'partial', 'void'));

CREATE INDEX IF NOT EXISTS idx_fixture_predictions_user_updated
  ON fixture_predictions (user_id, updated_at DESC);
