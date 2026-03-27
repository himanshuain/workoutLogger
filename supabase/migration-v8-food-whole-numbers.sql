-- Whole-number-only quantities (e.g. eggs, pills) — no 0.5 / 1.5 when enabled
ALTER TABLE food_items ADD COLUMN IF NOT EXISTS quantity_whole_numbers BOOLEAN DEFAULT false;
