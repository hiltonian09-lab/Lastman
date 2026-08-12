-- The Gauntlet — initial schema
-- Matches PLAN.md §5 data model

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT,
  name TEXT NOT NULL,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'player' CHECK (role IN ('player', 'platform_owner')),
  stripe_customer_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE leagues (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  country TEXT,
  provider_id TEXT NOT NULL UNIQUE -- API-Football league id
);

CREATE TABLE teams (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  short_name TEXT,
  crest_url TEXT,
  league_id TEXT NOT NULL REFERENCES leagues(id),
  provider_id TEXT NOT NULL UNIQUE -- API-Football team id
);

CREATE TABLE games (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  owner_id TEXT NOT NULL REFERENCES users(id),
  type TEXT NOT NULL DEFAULT 'private' CHECK (type IN ('private', 'platform_official')),
  league_ids TEXT NOT NULL DEFAULT '[]', -- JSON array of leagues.id
  rules_json TEXT NOT NULL DEFAULT '{}', -- lives, missed-pick policy, tiebreaker config
  display_entry_fee_cents INTEGER, -- informational only, never processed by platform
  display_prize_pool_note TEXT,
  currency TEXT NOT NULL DEFAULT 'GBP',
  max_players INTEGER, -- null = unlimited
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'open', 'locked', 'in_progress', 'blocked', 'completed', 'cancelled')),
  blocked_at TEXT,
  blocked_reason TEXT,
  invite_code TEXT UNIQUE,
  visibility TEXT NOT NULL DEFAULT 'invite_only' CHECK (visibility IN ('public', 'invite_only')),
  starts_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_games_owner ON games(owner_id);
CREATE INDEX idx_games_status ON games(status);

CREATE TABLE admin_fee_config (
  id TEXT PRIMARY KEY,
  minimum_fee_cents INTEGER NOT NULL DEFAULT 1000, -- £10.00
  per_player_fee_cents INTEGER NOT NULL DEFAULT 199, -- £1.99
  currency TEXT NOT NULL DEFAULT 'GBP',
  effective_from TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE admin_fee_charges (
  id TEXT PRIMARY KEY,
  game_id TEXT NOT NULL UNIQUE REFERENCES games(id),
  owner_id TEXT NOT NULL REFERENCES users(id),
  stripe_customer_id TEXT,
  stripe_payment_method_id TEXT,
  minimum_fee_cents INTEGER NOT NULL,
  minimum_fee_payment_intent_id TEXT,
  minimum_fee_status TEXT NOT NULL DEFAULT 'pending' CHECK (minimum_fee_status IN ('pending', 'paid', 'failed')),
  balance_cents INTEGER,
  balance_payment_intent_id TEXT,
  balance_status TEXT NOT NULL DEFAULT 'not_due'
    CHECK (balance_status IN ('not_due', 'pending', 'paid', 'failed', 'retrying')),
  player_count_at_lock INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  balance_charged_at TEXT
);

CREATE TABLE game_entries (
  id TEXT PRIMARY KEY,
  game_id TEXT NOT NULL REFERENCES games(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  lives_remaining INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'eliminated', 'winner')),
  joined_at TEXT NOT NULL DEFAULT (datetime('now')),
  eliminated_at_round_id TEXT,
  UNIQUE (game_id, user_id)
);

CREATE INDEX idx_game_entries_game ON game_entries(game_id);
CREATE INDEX idx_game_entries_user ON game_entries(user_id);

CREATE TABLE rounds (
  id TEXT PRIMARY KEY,
  game_id TEXT NOT NULL REFERENCES games(id),
  round_number INTEGER NOT NULL,
  deadline_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'locked', 'resolved')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (game_id, round_number)
);

CREATE INDEX idx_rounds_game ON rounds(game_id);

CREATE TABLE fixtures (
  id TEXT PRIMARY KEY,
  external_id TEXT NOT NULL UNIQUE, -- API-Football fixture id
  league_id TEXT NOT NULL REFERENCES leagues(id),
  home_team_id TEXT NOT NULL REFERENCES teams(id),
  away_team_id TEXT NOT NULL REFERENCES teams(id),
  kickoff_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'live', 'postponed', 'finished', 'abandoned')),
  home_score INTEGER,
  away_score INTEGER,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_fixtures_kickoff ON fixtures(kickoff_at);
CREATE INDEX idx_fixtures_league ON fixtures(league_id);

CREATE TABLE picks (
  id TEXT PRIMARY KEY,
  round_id TEXT NOT NULL REFERENCES rounds(id),
  game_entry_id TEXT NOT NULL REFERENCES game_entries(id),
  fixture_id TEXT NOT NULL REFERENCES fixtures(id),
  team_id TEXT NOT NULL REFERENCES teams(id),
  result TEXT NOT NULL DEFAULT 'pending' CHECK (result IN ('pending', 'win', 'loss', 'draw', 'void')),
  auto_assigned INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (round_id, game_entry_id)
);

CREATE INDEX idx_picks_entry ON picks(game_entry_id);
CREATE INDEX idx_picks_entry_team ON picks(game_entry_id, team_id);

CREATE TABLE invites (
  id TEXT PRIMARY KEY,
  game_id TEXT NOT NULL REFERENCES games(id),
  code TEXT NOT NULL UNIQUE,
  created_by TEXT NOT NULL REFERENCES users(id),
  max_uses INTEGER,
  uses_count INTEGER NOT NULL DEFAULT 0,
  expires_at TEXT
);

CREATE TABLE game_messages (
  id TEXT PRIMARY KEY,
  game_id TEXT NOT NULL REFERENCES games(id),
  sender_id TEXT NOT NULL REFERENCES users(id),
  body TEXT NOT NULL,
  sent_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_game_messages_game ON game_messages(game_id);

CREATE TABLE notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  type TEXT NOT NULL,
  payload_json TEXT NOT NULL DEFAULT '{}',
  read_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_notifications_user ON notifications(user_id, read_at);

-- sessions table for auth (Lucia-style)
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  expires_at TEXT NOT NULL
);

CREATE INDEX idx_sessions_user ON sessions(user_id);

INSERT INTO admin_fee_config (id, minimum_fee_cents, per_player_fee_cents, currency)
VALUES ('default', 1000, 199, 'GBP');
