-- Optional ranked top scorer board (top 5 or 10 with goal counts).
-- Apply after db/tournament-predictions-extensions.sql.

ALTER TABLE tournament_predictions
  ADD COLUMN IF NOT EXISTS predicted_top_scorer_board jsonb;
