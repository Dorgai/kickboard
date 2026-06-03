-- Short public links for shared fixture predictions (Copy / social share).
CREATE TABLE IF NOT EXISTS prediction_share_links (
  id text PRIMARY KEY,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prediction_share_links_created
  ON prediction_share_links (created_at DESC);
