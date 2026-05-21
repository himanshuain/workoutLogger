-- ============================================
-- Migration V12: Session client metadata
-- ============================================

ALTER TABLE workout_sessions
  ADD COLUMN IF NOT EXISTS client_meta JSONB DEFAULT '{}'::jsonb;
