-- ============================================
-- Migration V17: Macro nutrition tracking
-- ============================================

-- Per-serving macros on food items (values are per 1 unit of `unit`)
ALTER TABLE food_items
  ADD COLUMN IF NOT EXISTS protein_g DECIMAL(8,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS carbs_g DECIMAL(8,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fat_g DECIMAL(8,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS calories DECIMAL(8,2) DEFAULT 0;

-- Daily macro targets on user settings
ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS macro_targets JSONB DEFAULT '{"protein_g":150,"carbs_g":200,"fat_g":65,"calories":2200}'::jsonb;
