-- Profile discoverability on Community (opt-out: visible to anyone by default).

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS profile_discoverable boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_users_profile_discoverable
  ON users (username)
  WHERE deleted_at IS NULL
    AND profile_discoverable = true
    AND is_child = false
    AND onboarding_completed_at IS NOT NULL;
