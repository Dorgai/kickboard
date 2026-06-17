-- Separate settlement for optional top scorer leaderboard picks.
-- Apply after db/tournament-predictions-top-scorer-board.sql.

ALTER TABLE tournament_predictions
  ADD COLUMN IF NOT EXISTS top_scorer_board_status varchar(20) NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS top_scorer_board_points_awarded integer NOT NULL DEFAULT 0;

ALTER TABLE tournament_predictions
  DROP CONSTRAINT IF EXISTS tournament_predictions_top_scorer_board_status_check;

ALTER TABLE tournament_predictions
  ADD CONSTRAINT tournament_predictions_top_scorer_board_status_check
  CHECK (top_scorer_board_status IN ('pending', 'won', 'lost', 'partial', 'void'));
