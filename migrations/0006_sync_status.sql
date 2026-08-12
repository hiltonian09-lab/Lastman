-- Tracks the last time each background fixture-sync job ran, so the cron can
-- decide when a job is due and the UI can show players how fresh the data is.
CREATE TABLE sync_status (
  kind TEXT PRIMARY KEY, -- 'full_schedule' | 'live_scores'
  last_synced_at TEXT NOT NULL,
  fixtures_synced INTEGER NOT NULL DEFAULT 0
);
