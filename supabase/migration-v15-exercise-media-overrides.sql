-- Per-user custom image/GIF URLs for catalog exercises (keyed by exercise id in app).
ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS exercise_media_overrides JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN user_settings.exercise_media_overrides IS
  'Map of exercise id (or name:*) → { media_url } for user-chosen thumbnails';
