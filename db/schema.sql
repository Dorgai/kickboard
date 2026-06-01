-- Kickboard starter schema for Railway Postgres.
-- This is intentionally conservative: it establishes core domains, enums,
-- safety constraints and indexes before app code starts writing production data.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS citext;

DO $$
BEGIN
  CREATE TYPE tier_enum AS ENUM ('fan', 'pro', 'elite');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE sub_status_enum AS ENUM ('none', 'trialing', 'active', 'past_due', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE role_enum AS ENUM ('user', 'moderator', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE position_enum AS ENUM ('GK', 'DEF', 'MID', 'FWD');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE tournament_status_enum AS ENUM ('upcoming', 'active', 'completed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE match_status_enum AS ENUM (
    'scheduled',
    'live',
    'half_time',
    'extra_time',
    'penalties',
    'completed',
    'postponed',
    'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE event_type_enum AS ENUM (
    'goal',
    'own_goal',
    'yellow_card',
    'red_card',
    'yellow_red_card',
    'substitution',
    'penalty_scored',
    'penalty_missed',
    'var_decision',
    'kickoff',
    'halftime',
    'fulltime',
    'extra_time_start',
    'extra_time_end',
    'penalty_shootout_start'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE post_type_enum AS ENUM ('text', 'squad_share', 'prediction', 'rating');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE mod_status_enum AS ENUM ('approved', 'withheld', 'removed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE connection_status_enum AS ENUM ('pending', 'accepted', 'blocked');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE vote_type_enum AS ENUM ('substitution', 'tactical');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE prediction_type_enum AS ENUM ('exact_score', 'first_scorer', 'motm', 'next_scorer');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE result_status_enum AS ENUM ('correct', 'partial', 'incorrect');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE wallet_tx_enum AS ENUM (
    'prediction_correct',
    'prediction_partial',
    'rating_submitted',
    'squad_shared',
    'streak_bonus',
    'connection_bonus',
    'daily_login',
    'admin_adjustment',
    'sponsor_prize'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS tournaments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name varchar(100) NOT NULL,
  short_name varchar(20) NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  status tournament_status_enum NOT NULL DEFAULT 'upcoming',
  api_source varchar(30) NOT NULL DEFAULT 'api_football',
  api_tournament_id varchar(30),
  logo_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS teams (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id uuid NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  name varchar(100) NOT NULL,
  short_name varchar(10) NOT NULL,
  flag_url text,
  theme_frame_url text,
  primary_colour char(7),
  secondary_colour char(7),
  api_team_id varchar(30),
  group_name varchar(5),
  eliminated_at_stage varchar(30),
  CHECK (primary_colour IS NULL OR primary_colour ~ '^#[0-9A-Fa-f]{6}$'),
  CHECK (secondary_colour IS NULL OR secondary_colour ~ '^#[0-9A-Fa-f]{6}$')
);

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  email citext NOT NULL UNIQUE,
  email_verified_at timestamptz,
  username varchar(30) NOT NULL UNIQUE,
  display_name varchar(60),
  avatar_url text,
  birth_year smallint NOT NULL,
  is_child boolean NOT NULL DEFAULT false,
  parent_user_id uuid REFERENCES users(id),
  tier tier_enum NOT NULL DEFAULT 'fan',
  tier_expires_at timestamptz,
  subscription_status sub_status_enum NOT NULL DEFAULT 'none',
  stripe_customer_id varchar(60),
  role role_enum NOT NULL DEFAULT 'user',
  is_suspended boolean NOT NULL DEFAULT false,
  suspended_until timestamptz,
  locale varchar(10) NOT NULL DEFAULT 'en',
  timezone varchar(60) NOT NULL DEFAULT 'UTC',
  favourite_team_id uuid REFERENCES teams(id),
  points_balance integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CHECK (username ~ '^[a-zA-Z0-9_]{3,30}$'),
  CHECK (birth_year BETWEEN 1900 AND 2100),
  CHECK (points_balance >= 0),
  CHECK (NOT is_child OR tier = 'fan')
);

CREATE TABLE IF NOT EXISTS user_preferences (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  widget_layout jsonb NOT NULL DEFAULT '[]'::jsonb,
  toast_events jsonb NOT NULL DEFAULT '{"goals": true, "cards": true}'::jsonb,
  notification_channels jsonb NOT NULL DEFAULT '{"push": true, "email": false}'::jsonb,
  display_mode varchar(10) NOT NULL DEFAULT 'auto',
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (jsonb_typeof(widget_layout) = 'array'),
  CHECK (display_mode IN ('auto', 'light', 'dark'))
);

CREATE TABLE IF NOT EXISTS user_sessions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_token_hash varchar(64) NOT NULL,
  device_fingerprint varchar(128),
  ip_address inet,
  user_agent text,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS players (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  tournament_id uuid NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  name varchar(100) NOT NULL,
  short_name varchar(40) NOT NULL,
  position position_enum NOT NULL,
  shirt_number smallint,
  nationality varchar(60) NOT NULL,
  date_of_birth date,
  portrait_url text,
  api_player_id varchar(30),
  statsbomb_player_id integer,
  avg_user_rating numeric(4, 2) NOT NULL DEFAULT 0,
  rating_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (shirt_number IS NULL OR shirt_number BETWEEN 1 AND 99),
  CHECK (avg_user_rating BETWEEN 0 AND 10),
  CHECK (rating_count >= 0)
);

CREATE TABLE IF NOT EXISTS matches (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id uuid NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  stage varchar(30) NOT NULL,
  group_name varchar(5),
  match_number smallint NOT NULL,
  home_team_id uuid REFERENCES teams(id),
  away_team_id uuid REFERENCES teams(id),
  scheduled_at timestamptz NOT NULL,
  venue varchar(100),
  status match_status_enum NOT NULL DEFAULT 'scheduled',
  minute smallint,
  home_score smallint NOT NULL DEFAULT 0,
  away_score smallint NOT NULL DEFAULT 0,
  home_score_ht smallint,
  away_score_ht smallint,
  home_score_et smallint,
  away_score_et smallint,
  home_score_pens smallint,
  away_score_pens smallint,
  api_fixture_id varchar(30),
  statsbomb_match_id integer UNIQUE,
  last_synced_at timestamptz,
  CHECK (stage IN ('group', 'round_of_16', 'quarter_final', 'semi_final', 'third_place', 'final')),
  CHECK (minute IS NULL OR minute BETWEEN 0 AND 130)
);

CREATE TABLE IF NOT EXISTS match_events (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id uuid NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  event_type event_type_enum NOT NULL,
  minute smallint NOT NULL,
  extra_minute smallint,
  player_id uuid REFERENCES players(id),
  player2_id uuid REFERENCES players(id),
  team_id uuid NOT NULL REFERENCES teams(id),
  detail text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (minute BETWEEN 0 AND 130),
  CHECK (extra_minute IS NULL OR extra_minute BETWEEN 1 AND 30)
);

CREATE TABLE IF NOT EXISTS statsbomb_events (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  statsbomb_event_id uuid NOT NULL UNIQUE,
  match_id uuid NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  statsbomb_match_id integer NOT NULL,
  player_id uuid REFERENCES players(id),
  statsbomb_player_id integer,
  event_type varchar(80) NOT NULL,
  minute smallint NOT NULL,
  second smallint,
  location numeric(6, 3)[],
  raw_event jsonb NOT NULL,
  ingested_at timestamptz NOT NULL DEFAULT now(),
  CHECK (minute BETWEEN 0 AND 130),
  CHECK (second IS NULL OR second BETWEEN 0 AND 59)
);

CREATE TABLE IF NOT EXISTS statsbomb_player_mismatches (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  statsbomb_player_id integer NOT NULL,
  statsbomb_player_name varchar(120) NOT NULL,
  match_id uuid REFERENCES matches(id) ON DELETE SET NULL,
  candidate_player_id uuid REFERENCES players(id) ON DELETE SET NULL,
  confidence numeric(4, 3),
  review_status varchar(20) NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  CHECK (confidence IS NULL OR confidence BETWEEN 0 AND 1),
  CHECK (review_status IN ('pending', 'linked', 'ignored'))
);

CREATE TABLE IF NOT EXISTS portrait_generations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  prompt text NOT NULL,
  negative_prompt text NOT NULL,
  model varchar(80) NOT NULL,
  lora varchar(120),
  sampler varchar(80) NOT NULL,
  steps smallint NOT NULL,
  cfg_scale numeric(3, 1) NOT NULL,
  seed bigint NOT NULL,
  variant_count smallint NOT NULL DEFAULT 4,
  accepted_variant smallint,
  cdn_base_url text,
  generated_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  CHECK (steps > 0),
  CHECK (cfg_scale > 0),
  CHECK (variant_count BETWEEN 1 AND 8),
  CHECK (accepted_variant IS NULL OR accepted_variant BETWEEN 1 AND variant_count)
);

CREATE TABLE IF NOT EXISTS squads (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  match_id uuid REFERENCES matches(id) ON DELETE SET NULL,
  tournament_id uuid NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  name varchar(60) NOT NULL,
  formation varchar(10) NOT NULL,
  is_all_stars boolean NOT NULL DEFAULT false,
  is_public boolean NOT NULL DEFAULT true,
  is_locked boolean NOT NULL DEFAULT false,
  published_to_board_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (formation IN ('4-4-2', '4-3-3', '3-5-2', '4-2-3-1', '5-3-2', '3-4-3'))
);

CREATE TABLE IF NOT EXISTS squad_players (
  squad_id uuid NOT NULL REFERENCES squads(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  position_slot smallint NOT NULL,
  pitch_position varchar(10) NOT NULL,
  added_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (squad_id, player_id),
  UNIQUE (squad_id, position_slot),
  CHECK (position_slot BETWEEN 1 AND 16)
);

CREATE TABLE IF NOT EXISTS connections (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  requester_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  addressee_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status connection_status_enum NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  CHECK (requester_id <> addressee_id)
);

CREATE TABLE IF NOT EXISTS posts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_type post_type_enum NOT NULL,
  body varchar(280),
  squad_id uuid REFERENCES squads(id) ON DELETE SET NULL,
  match_id uuid REFERENCES matches(id) ON DELETE SET NULL,
  image_url text,
  moderation_status mod_status_enum NOT NULL DEFAULT 'approved',
  reaction_counts jsonb NOT NULL DEFAULT '{}'::jsonb,
  comment_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CHECK (comment_count >= 0)
);

CREATE TABLE IF NOT EXISTS predictions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  match_id uuid NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  prediction_type prediction_type_enum NOT NULL,
  predicted_home_score smallint,
  predicted_away_score smallint,
  predicted_player_id uuid REFERENCES players(id),
  is_locked boolean NOT NULL DEFAULT false,
  result_status result_status_enum,
  points_awarded smallint,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  CHECK (predicted_home_score IS NULL OR predicted_home_score BETWEEN 0 AND 20),
  CHECK (predicted_away_score IS NULL OR predicted_away_score BETWEEN 0 AND 20),
  CHECK (points_awarded IS NULL OR points_awarded >= 0)
);

CREATE TABLE IF NOT EXISTS wallet_ledger (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES users(id),
  amount integer NOT NULL,
  balance_after integer NOT NULL,
  transaction_type wallet_tx_enum NOT NULL,
  reference_id uuid,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (balance_after >= 0)
);

CREATE TABLE IF NOT EXISTS user_stat_card_exports (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tournament_id uuid NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  storage_url text NOT NULL,
  signed_url_expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer ON users(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_matches_tournament_status ON matches(tournament_id, status);
CREATE INDEX IF NOT EXISTS idx_matches_scheduled_at ON matches USING brin(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_matches_statsbomb_match_id ON matches(statsbomb_match_id);
CREATE INDEX IF NOT EXISTS idx_match_events_match_id ON match_events(match_id);
CREATE INDEX IF NOT EXISTS idx_statsbomb_events_match ON statsbomb_events(match_id, minute, second);
CREATE INDEX IF NOT EXISTS idx_statsbomb_events_player ON statsbomb_events(player_id) WHERE player_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_statsbomb_events_type ON statsbomb_events(event_type);
CREATE INDEX IF NOT EXISTS idx_statsbomb_events_raw ON statsbomb_events USING gin(raw_event);
CREATE INDEX IF NOT EXISTS idx_portrait_generations_player ON portrait_generations(player_id, generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_author_created ON posts(author_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_connections_pair
  ON connections(least(requester_id, addressee_id), greatest(requester_id, addressee_id));
CREATE INDEX IF NOT EXISTS idx_predictions_user_match ON predictions(user_id, match_id);
CREATE INDEX IF NOT EXISTS idx_predictions_unresolved ON predictions(match_id) WHERE resolved_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_wallet_user_created ON wallet_ledger(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_stat_card_exports_user ON user_stat_card_exports(user_id, created_at DESC);
