-- Wipe all user-placed predictions and related derived data.
-- Does NOT delete users, squads, posts, or non-prediction alerts.
--
-- Run via: CONFIRM_CLEANUP_PREDICTIONS=yes npm run db:cleanup-predictions
-- Or: psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f db/cleanup-predictions.sql

BEGIN;

-- Match picks (outcome, score, scorers)
DELETE FROM fixture_prediction_events;
DELETE FROM fixture_predictions;

-- Tournament picks (champion, awards, scorer board)
DELETE FROM tournament_predictions;

-- Public share tokens for copied prediction links
DELETE FROM prediction_share_links;

-- Legacy predictions table from schema.sql (match_id FK), if populated
DELETE FROM predictions;

-- In-app alerts generated from prediction activity
DELETE FROM user_alerts
WHERE alert_key LIKE 'connection:prediction:%'
   OR alert_key LIKE 'connection:prediction-event:%';

-- Wallet ledger rows for prediction scoring (table may be empty on early deployments)
DELETE FROM wallet_ledger
WHERE transaction_type IN ('prediction_correct', 'prediction_partial');

-- Points shown in profile / overview come from users.points_balance
UPDATE users
SET points_balance = 0,
    updated_at = now()
WHERE deleted_at IS NULL
  AND points_balance <> 0;

COMMIT;
