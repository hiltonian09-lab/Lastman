-- Per-league checkpoint so a full-schedule sync that gets cut off mid-run
-- (Cloudflare terminates long-running cron invocations) resumes from where
-- it left off next tick, instead of restarting from league 1 every time.
ALTER TABLE leagues ADD COLUMN full_schedule_synced_at TEXT;
