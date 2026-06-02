-- Outcome (1X2), exact score, and goal-scorer picks on fixture_predictions.
-- Apply after fixture-prediction-settlement-extensions.sql.

ALTER TABLE fixture_predictions
  ALTER COLUMN home_score DROP NOT NULL,
  ALTER COLUMN away_score DROP NOT NULL;

ALTER TABLE fixture_predictions
  ADD COLUMN IF NOT EXISTS predicted_outcome varchar(10),
  ADD COLUMN IF NOT EXISTS scorer_picks jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS outcome_status varchar(20) NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS score_status varchar(20) NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS scorers_status varchar(20) NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS outcome_points_awarded smallint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS score_points_awarded smallint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS scorers_points_awarded smallint NOT NULL DEFAULT 0;

ALTER TABLE fixture_predictions
  DROP CONSTRAINT IF EXISTS fixture_predictions_predicted_outcome_check;

ALTER TABLE fixture_predictions
  ADD CONSTRAINT fixture_predictions_predicted_outcome_check
  CHECK (predicted_outcome IS NULL OR predicted_outcome IN ('home', 'draw', 'away'));

ALTER TABLE fixture_predictions
  DROP CONSTRAINT IF EXISTS fixture_predictions_outcome_status_check;

ALTER TABLE fixture_predictions
  ADD CONSTRAINT fixture_predictions_outcome_status_check
  CHECK (outcome_status IN ('pending', 'won', 'lost', 'partial', 'void'));

ALTER TABLE fixture_predictions
  DROP CONSTRAINT IF EXISTS fixture_predictions_score_status_check;

ALTER TABLE fixture_predictions
  ADD CONSTRAINT fixture_predictions_score_status_check
  CHECK (score_status IN ('pending', 'won', 'lost', 'partial', 'void'));

ALTER TABLE fixture_predictions
  DROP CONSTRAINT IF EXISTS fixture_predictions_scorers_status_check;

ALTER TABLE fixture_predictions
  ADD CONSTRAINT fixture_predictions_scorers_status_check
  CHECK (scorers_status IN ('pending', 'won', 'lost', 'partial', 'void'));

ALTER TABLE fixture_predictions
  DROP CONSTRAINT IF EXISTS fixture_predictions_scorer_picks_is_array;

ALTER TABLE fixture_predictions
  ADD CONSTRAINT fixture_predictions_scorer_picks_is_array
  CHECK (jsonb_typeof(scorer_picks) = 'array');

-- Backfill per-type status from legacy score columns where present.
UPDATE fixture_predictions
SET score_status = COALESCE(NULLIF(result_status, ''), 'pending')
WHERE score_status = 'pending' AND result_status IS NOT NULL AND result_status <> '';

UPDATE fixture_predictions
SET score_points_awarded = COALESCE(points_awarded, 0)
WHERE score_points_awarded = 0 AND COALESCE(points_awarded, 0) > 0;
