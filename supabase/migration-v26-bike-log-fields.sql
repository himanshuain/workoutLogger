-- Migration V26: Bike log title + odometer (km)

ALTER TABLE event_logs
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS odometer_km INTEGER;
