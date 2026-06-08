-- ============================================
-- Migration V18: Macro meal plans (JSONB)
-- ============================================

ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS macro_plans JSONB DEFAULT '{"plans":{}}'::jsonb;
