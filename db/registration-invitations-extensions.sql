-- Registration invitations (apply after db/connections-social-extensions.sql).

DO $$ BEGIN
  CREATE TYPE registration_invitation_status AS ENUM ('pending', 'accepted', 'revoked', 'expired');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS registration_invitations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  inviter_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invitee_email citext,
  token varchar(64) NOT NULL,
  personal_message varchar(280),
  status registration_invitation_status NOT NULL DEFAULT 'pending',
  accepted_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  CONSTRAINT registration_invitations_token_unique UNIQUE (token)
);

CREATE INDEX IF NOT EXISTS idx_registration_invitations_inviter_status
  ON registration_invitations (inviter_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_registration_invitations_token_pending
  ON registration_invitations (token)
  WHERE status = 'pending';

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS invited_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_users_invited_by ON users (invited_by_user_id);
