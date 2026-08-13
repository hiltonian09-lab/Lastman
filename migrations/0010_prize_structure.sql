-- Structured prize distribution, replacing the freeform prize-pool note.
-- NULL means "not configured yet" — existing games fall back to the old
-- display_prize_pool_note text until the owner sets these.
ALTER TABLE games ADD COLUMN prize_fund_percent INTEGER;
ALTER TABLE games ADD COLUMN prize_places INTEGER;
ALTER TABLE games ADD COLUMN prize_splits_json TEXT;
ALTER TABLE games ADD COLUMN booby_prize_percent INTEGER;
