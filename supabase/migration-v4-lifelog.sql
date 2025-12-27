-- Migration V4: Life Log Feature
-- Track occasional events like haircuts, doctor visits, car service, etc.

-- ============================================
-- EVENT TYPES TABLE
-- ============================================
-- Stores custom event types that users want to track

CREATE TABLE IF NOT EXISTS event_types (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  icon TEXT DEFAULT '📝',
  color TEXT DEFAULT '#6366f1',
  description TEXT,
  reminder_days INTEGER, -- Optional: remind after X days
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE event_types ENABLE ROW LEVEL SECURITY;

-- RLS Policies for event_types
CREATE POLICY "Users can view own event types"
  ON event_types FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own event types"
  ON event_types FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own event types"
  ON event_types FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own event types"
  ON event_types FOR DELETE
  USING (auth.uid() = user_id);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_event_types_user_id ON event_types(user_id);

-- ============================================
-- EVENT LOGS TABLE
-- ============================================
-- Stores when each event occurred

CREATE TABLE IF NOT EXISTS event_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  event_type_id UUID REFERENCES event_types(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  cost DECIMAL(10,2), -- Optional: track cost (e.g., haircut $30)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE event_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for event_logs
CREATE POLICY "Users can view own event logs"
  ON event_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own event logs"
  ON event_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own event logs"
  ON event_logs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own event logs"
  ON event_logs FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_event_logs_user_id ON event_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_event_logs_event_type_id ON event_logs(event_type_id);
CREATE INDEX IF NOT EXISTS idx_event_logs_date ON event_logs(date DESC);

-- ============================================
-- HELPFUL VIEWS (Optional)
-- ============================================
-- View to get event types with their last occurrence

-- Note: Run this in Supabase SQL Editor after creating the tables

