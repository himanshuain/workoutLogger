-- ============================================
-- WORKOUT ROUTINES MIGRATION v3
-- Run this in your Supabase SQL Editor
-- ============================================

-- Workout Routines (e.g., "Upper Body Strength", "Leg Day")
CREATE TABLE IF NOT EXISTS workout_routines (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Sunday, 1=Monday, etc. NULL = any day
  color TEXT DEFAULT '#3b82f6',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Exercises within a routine
CREATE TABLE IF NOT EXISTS routine_exercises (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  routine_id UUID REFERENCES workout_routines(id) ON DELETE CASCADE NOT NULL,
  exercise_id UUID REFERENCES exercises(id),
  exercise_name TEXT NOT NULL,
  category TEXT DEFAULT 'other',
  target_sets INTEGER DEFAULT 3,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Active/completed workout sessions
CREATE TABLE IF NOT EXISTS workout_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  routine_id UUID REFERENCES workout_routines(id) ON DELETE SET NULL,
  routine_name TEXT NOT NULL,
  date DATE NOT NULL,
  status TEXT CHECK (status IN ('active', 'completed')) DEFAULT 'active',
  current_exercise_index INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Individual set logs within a session
CREATE TABLE IF NOT EXISTS set_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES workout_sessions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  exercise_name TEXT NOT NULL,
  category TEXT DEFAULT 'other',
  set_number INTEGER NOT NULL,
  weight DECIMAL(6,2) DEFAULT 0,
  reps INTEGER DEFAULT 0,
  is_completed BOOLEAN DEFAULT false,
  previous_weight DECIMAL(6,2),
  previous_reps INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_workout_routines_user_id ON workout_routines(user_id);
CREATE INDEX IF NOT EXISTS idx_workout_routines_day ON workout_routines(user_id, day_of_week);
CREATE INDEX IF NOT EXISTS idx_routine_exercises_routine ON routine_exercises(routine_id);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_user_date ON workout_sessions(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_status ON workout_sessions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_set_logs_session ON set_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_set_logs_user_exercise ON set_logs(user_id, exercise_name);

-- ============================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE workout_routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE routine_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE set_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES
-- ============================================

-- WORKOUT_ROUTINES POLICIES
CREATE POLICY "Users can view their own routines"
  ON workout_routines FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own routines"
  ON workout_routines FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own routines"
  ON workout_routines FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own routines"
  ON workout_routines FOR DELETE
  USING (auth.uid() = user_id);

-- ROUTINE_EXERCISES POLICIES
CREATE POLICY "Users can view exercises in their routines"
  ON routine_exercises FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workout_routines 
      WHERE workout_routines.id = routine_exercises.routine_id 
      AND workout_routines.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can add exercises to their routines"
  ON routine_exercises FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workout_routines 
      WHERE workout_routines.id = routine_exercises.routine_id 
      AND workout_routines.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update exercises in their routines"
  ON routine_exercises FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM workout_routines 
      WHERE workout_routines.id = routine_exercises.routine_id 
      AND workout_routines.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete exercises from their routines"
  ON routine_exercises FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM workout_routines 
      WHERE workout_routines.id = routine_exercises.routine_id 
      AND workout_routines.user_id = auth.uid()
    )
  );

-- WORKOUT_SESSIONS POLICIES
CREATE POLICY "Users can view their own sessions"
  ON workout_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own sessions"
  ON workout_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions"
  ON workout_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sessions"
  ON workout_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- SET_LOGS POLICIES
CREATE POLICY "Users can view their own set logs"
  ON set_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own set logs"
  ON set_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own set logs"
  ON set_logs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own set logs"
  ON set_logs FOR DELETE
  USING (auth.uid() = user_id);

