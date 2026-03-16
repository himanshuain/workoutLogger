-- Migration V5: Steps / Checklists Feature
-- Reusable checklist cards (e.g., Gym Ready, Morning Routine, Shake Recipe)

-- ============================================
-- STEP CARDS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS step_cards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  icon TEXT DEFAULT '📋',
  color TEXT DEFAULT '#3b82f6',
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE step_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own step cards"
  ON step_cards FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own step cards"
  ON step_cards FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own step cards"
  ON step_cards FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own step cards"
  ON step_cards FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_step_cards_user_id ON step_cards(user_id);

-- ============================================
-- STEP ITEMS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS step_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  card_id UUID REFERENCES step_cards(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  text TEXT NOT NULL,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE step_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own step items"
  ON step_items FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own step items"
  ON step_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own step items"
  ON step_items FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own step items"
  ON step_items FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_step_items_card_id ON step_items(card_id);
CREATE INDEX IF NOT EXISTS idx_step_items_user_id ON step_items(user_id);
