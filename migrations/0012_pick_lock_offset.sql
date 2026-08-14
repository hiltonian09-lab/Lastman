-- Owner-configurable pick lock: how many hours before kickoff picks close,
-- instead of locking exactly at kickoff. rounds.lock_at is the actual
-- enforcement deadline (submitPick + cron lock-check); rounds.deadline_at
-- keeps meaning "earliest kickoff this gameweek" — still used to anchor
-- which gameweek's fixtures to show, unaffected by this offset.
ALTER TABLE games ADD COLUMN pick_lock_hours_before INTEGER NOT NULL DEFAULT 1;
ALTER TABLE rounds ADD COLUMN lock_at TEXT;
