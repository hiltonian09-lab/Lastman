-- Owner-uploaded logo, stored inline as a data URL (small images only,
-- capped client/server-side) — no object storage needed for something this size.
ALTER TABLE games ADD COLUMN logo_data_url TEXT;
