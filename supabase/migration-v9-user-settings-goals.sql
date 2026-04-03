-- Store goals JSON on user_settings (synced from app; replaces localStorage-only)
ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS goals JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN user_settings.goals IS 'User goals array (same shape as client logbook_goals localStorage)';
