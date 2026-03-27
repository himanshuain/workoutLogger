-- Exercise catalog: wger sync fields (GIF preferred in app when present)
-- Run in Supabase SQL Editor after prior migrations.

ALTER TABLE exercises ADD COLUMN IF NOT EXISTS external_source TEXT;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS external_id TEXT;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS gif_url TEXT;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Idempotent sync from scripts/sync-wger-exercises.mjs.
-- PostgreSQL treats NULLs as distinct, so legacy rows (NULL, NULL) stay valid.
CREATE UNIQUE INDEX IF NOT EXISTS exercises_external_source_id_key
  ON exercises (external_source, external_id);
