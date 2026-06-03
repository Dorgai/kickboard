-- Per-user read cursor for Fan Chat 1:1 threads (unread counts).

CREATE TABLE IF NOT EXISTS fan_chat_thread_reads (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  peer_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, peer_id),
  CHECK (user_id <> peer_id)
);

CREATE INDEX IF NOT EXISTS idx_fan_chat_thread_reads_user
  ON fan_chat_thread_reads (user_id, last_read_at DESC);
