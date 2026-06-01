-- Community feature extensions (apply after db/schema.sql).

DO $$
BEGIN
  CREATE TYPE report_reason_enum AS ENUM ('spam', 'harassment', 'off_topic', 'other');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS content_reports (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  reporter_id uuid REFERENCES users(id) ON DELETE SET NULL,
  reason report_reason_enum NOT NULL DEFAULT 'other',
  details varchar(500),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_content_reports_post ON content_reports(post_id, created_at DESC);

-- New community posts await moderation before appearing on the public feed.
ALTER TABLE posts ALTER COLUMN moderation_status SET DEFAULT 'withheld';
