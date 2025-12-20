-- Workout Logger Database Schema
-- Run this in your Supabase SQL Editor

-- ============================================
-- TABLES
-- ============================================

-- Exercises table (predefined + custom)
CREATE TABLE IF NOT EXISTS exercises (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT DEFAULT 'other',
  is_predefined BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User settings
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  unit TEXT DEFAULT 'kg' CHECK (unit IN ('kg', 'lb')),
  dark_mode BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Custom trackable items (habits/health metrics)
CREATE TABLE IF NOT EXISTS trackables (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT CHECK (type IN ('habit', 'health')) DEFAULT 'habit',
  icon TEXT,
  color TEXT DEFAULT '#22c55e',
  has_value BOOLEAN DEFAULT false,
  value_unit TEXT,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Daily tracking entries for habits/health
CREATE TABLE IF NOT EXISTS tracking_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  trackable_id UUID REFERENCES trackables(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  is_completed BOOLEAN DEFAULT false,
  value DECIMAL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, trackable_id, date)
);

-- Simplified exercise logs (no workout sessions)
CREATE TABLE IF NOT EXISTS exercise_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  exercise_id UUID REFERENCES exercises(id),
  exercise_name TEXT NOT NULL,
  date DATE NOT NULL,
  weight DECIMAL(6,2) DEFAULT 0,
  reps INTEGER DEFAULT 0,
  sets INTEGER DEFAULT 1,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Exercise history (for auto-fill and presets)
CREATE TABLE IF NOT EXISTS exercise_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  exercise_id UUID REFERENCES exercises(id),
  exercise_name TEXT NOT NULL,
  last_weight DECIMAL(6,2),
  last_reps INTEGER,
  last_sets INTEGER,
  personal_record_weight DECIMAL(6,2),
  times_performed INTEGER DEFAULT 1,
  last_performed_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_exercises_user_id ON exercises(user_id);
CREATE INDEX IF NOT EXISTS idx_trackables_user_id ON trackables(user_id);
CREATE INDEX IF NOT EXISTS idx_tracking_entries_user_date ON tracking_entries(user_id, date);
CREATE INDEX IF NOT EXISTS idx_tracking_entries_trackable ON tracking_entries(trackable_id);
CREATE INDEX IF NOT EXISTS idx_exercise_logs_user_date ON exercise_logs(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_exercise_logs_exercise ON exercise_logs(exercise_id);
CREATE INDEX IF NOT EXISTS idx_exercise_history_user_id ON exercise_history(user_id);
CREATE INDEX IF NOT EXISTS idx_exercise_history_exercise ON exercise_history(exercise_id);

-- ============================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE trackables ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracking_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_history ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES
-- ============================================

-- EXERCISES POLICIES
CREATE POLICY "Predefined exercises are viewable by everyone"
  ON exercises FOR SELECT
  USING (is_predefined = true);

CREATE POLICY "Users can view their own custom exercises"
  ON exercises FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create custom exercises"
  ON exercises FOR INSERT
  WITH CHECK (auth.uid() = user_id AND is_predefined = false);

CREATE POLICY "Users can update their own custom exercises"
  ON exercises FOR UPDATE
  USING (auth.uid() = user_id AND is_predefined = false);

CREATE POLICY "Users can delete their own custom exercises"
  ON exercises FOR DELETE
  USING (auth.uid() = user_id AND is_predefined = false);

-- USER_SETTINGS POLICIES
CREATE POLICY "Users can view their own settings"
  ON user_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own settings"
  ON user_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings"
  ON user_settings FOR UPDATE
  USING (auth.uid() = user_id);

-- TRACKABLES POLICIES
CREATE POLICY "Users can view their own trackables"
  ON trackables FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own trackables"
  ON trackables FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own trackables"
  ON trackables FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own trackables"
  ON trackables FOR DELETE
  USING (auth.uid() = user_id);

-- TRACKING_ENTRIES POLICIES
CREATE POLICY "Users can view their own tracking entries"
  ON tracking_entries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own tracking entries"
  ON tracking_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tracking entries"
  ON tracking_entries FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tracking entries"
  ON tracking_entries FOR DELETE
  USING (auth.uid() = user_id);

-- EXERCISE_LOGS POLICIES
CREATE POLICY "Users can view their own exercise logs"
  ON exercise_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own exercise logs"
  ON exercise_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own exercise logs"
  ON exercise_logs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own exercise logs"
  ON exercise_logs FOR DELETE
  USING (auth.uid() = user_id);

-- EXERCISE_HISTORY POLICIES
CREATE POLICY "Users can view their own exercise history"
  ON exercise_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own exercise history"
  ON exercise_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own exercise history"
  ON exercise_history FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own exercise history"
  ON exercise_history FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- SEED PREDEFINED EXERCISES
-- ============================================

INSERT INTO exercises (name, category, is_predefined, user_id) VALUES
  ('Bench Press', 'chest', true, NULL),
  ('Incline Bench Press', 'chest', true, NULL),
  ('Dumbbell Fly', 'chest', true, NULL),
  ('Push Up', 'chest', true, NULL),
  ('Cable Crossover', 'chest', true, NULL),
  ('Squat', 'legs', true, NULL),
  ('Leg Press', 'legs', true, NULL),
  ('Romanian Deadlift', 'legs', true, NULL),
  ('Leg Curl', 'legs', true, NULL),
  ('Leg Extension', 'legs', true, NULL),
  ('Calf Raise', 'legs', true, NULL),
  ('Lunges', 'legs', true, NULL),
  ('Bulgarian Split Squat', 'legs', true, NULL),
  ('Deadlift', 'back', true, NULL),
  ('Barbell Row', 'back', true, NULL),
  ('Lat Pulldown', 'back', true, NULL),
  ('Pull Up', 'back', true, NULL),
  ('Cable Row', 'back', true, NULL),
  ('T-Bar Row', 'back', true, NULL),
  ('Chin Up', 'back', true, NULL),
  ('Shoulder Press', 'shoulders', true, NULL),
  ('Lateral Raise', 'shoulders', true, NULL),
  ('Face Pull', 'shoulders', true, NULL),
  ('Rear Delt Fly', 'shoulders', true, NULL),
  ('Front Raise', 'shoulders', true, NULL),
  ('Shrugs', 'shoulders', true, NULL),
  ('Bicep Curl', 'arms', true, NULL),
  ('Hammer Curl', 'arms', true, NULL),
  ('Preacher Curl', 'arms', true, NULL),
  ('Tricep Pushdown', 'arms', true, NULL),
  ('Tricep Extension', 'arms', true, NULL),
  ('Skull Crusher', 'arms', true, NULL),
  ('Tricep Dips', 'arms', true, NULL),
  ('Plank', 'core', true, NULL),
  ('Cable Crunch', 'core', true, NULL),
  ('Hanging Leg Raise', 'core', true, NULL),
  ('Russian Twist', 'core', true, NULL),
  ('Ab Wheel Rollout', 'core', true, NULL)
ON CONFLICT DO NOTHING;

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to create default settings and sample trackables for new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create default settings
  INSERT INTO public.user_settings (user_id, unit, dark_mode)
  VALUES (NEW.id, 'kg', true);
  
  -- Create sample trackables
  INSERT INTO public.trackables (user_id, name, type, icon, color, has_value, value_unit, order_index) VALUES
    (NEW.id, 'Water', 'habit', '💧', '#3b82f6', false, NULL, 0),
    (NEW.id, 'Creatine', 'habit', '💊', '#8b5cf6', false, NULL, 1),
    (NEW.id, 'Protein', 'habit', '🥩', '#ef4444', false, NULL, 2),
    (NEW.id, 'Sleep', 'health', '😴', '#6366f1', true, 'hours', 3),
    (NEW.id, 'Stretch', 'habit', '🧘', '#14b8a6', false, NULL, 4);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create settings when user signs up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
