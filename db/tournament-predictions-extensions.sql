-- Tournament-wide picks (champion, finalists, awards) — one row per user per tournament.

CREATE TABLE IF NOT EXISTS tournament_predictions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tournament_key varchar(20) NOT NULL DEFAULT 'WC26',
  predicted_champion varchar(80),
  predicted_finalists jsonb NOT NULL DEFAULT '[]'::jsonb,
  predicted_top_scorer jsonb,
  predicted_best_player jsonb,
  champion_status varchar(20) NOT NULL DEFAULT 'pending',
  finalists_status varchar(20) NOT NULL DEFAULT 'pending',
  top_scorer_status varchar(20) NOT NULL DEFAULT 'pending',
  best_player_status varchar(20) NOT NULL DEFAULT 'pending',
  champion_points_awarded smallint NOT NULL DEFAULT 0,
  finalists_points_awarded smallint NOT NULL DEFAULT 0,
  top_scorer_points_awarded smallint NOT NULL DEFAULT 0,
  best_player_points_awarded smallint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, tournament_key)
);

CREATE INDEX IF NOT EXISTS idx_tournament_predictions_user
  ON tournament_predictions (user_id, tournament_key);
