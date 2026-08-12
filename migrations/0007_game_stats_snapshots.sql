-- One row per resolved round, capturing the state of the game at that point.
-- Used for owner-side attrition/survival trend charts. Populated by the cron tick
-- immediately after a round is resolved.
CREATE TABLE game_stats_snapshots (
  id TEXT PRIMARY KEY,
  game_id TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  round_id TEXT NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL,
  active_players INTEGER NOT NULL,
  eliminated_this_round INTEGER NOT NULL,
  total_picks INTEGER NOT NULL,
  auto_assigned_picks INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX idx_game_stats_game_round ON game_stats_snapshots(game_id, round_id);
CREATE INDEX idx_game_stats_game ON game_stats_snapshots(game_id, created_at);
