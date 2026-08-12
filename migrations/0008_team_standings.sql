-- Previous (and eventually historical) league standings per team.
-- Populated from football-data.org standings endpoint during the cron sync.
CREATE TABLE team_standings (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  league_id TEXT NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  season TEXT NOT NULL, -- e.g. '2024' for the 2024-25 campaign
  position INTEGER NOT NULL,
  points INTEGER,
  played INTEGER,
  won INTEGER,
  drawn INTEGER,
  lost INTEGER,
  goals_for INTEGER,
  goals_against INTEGER,
  UNIQUE (team_id, league_id, season)
);

CREATE INDEX idx_team_standings_team ON team_standings(team_id, season);
CREATE INDEX idx_team_standings_league ON team_standings(league_id, season);
