-- Workout UI prefs (dual pulley per exercise, tile layout, etc.) synced from client localStorage
ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS workout_ui_prefs JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN user_settings.workout_ui_prefs IS
  'Client workout UI: dual_pulley_by_exercise, exercise_tile_layout, and related keys';
