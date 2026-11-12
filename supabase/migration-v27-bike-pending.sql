-- Migration V27: Bike pending tasks (synced per user)

CREATE TABLE IF NOT EXISTS bike_pending_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE bike_pending_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own bike pending"
  ON bike_pending_items FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own bike pending"
  ON bike_pending_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bike pending"
  ON bike_pending_items FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own bike pending"
  ON bike_pending_items FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_bike_pending_user_created
  ON bike_pending_items (user_id, created_at DESC);
