-- Skip quantity drawer — log with default quantity on tap.
ALTER TABLE food_items ADD COLUMN IF NOT EXISTS log_directly BOOLEAN DEFAULT false;
