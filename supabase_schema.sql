-- Clinical Intuition Database Schema
-- Run this in Supabase Dashboard → SQL Editor

-- =====================================================
-- 1. Create cards table (clinical trial prediction cards)
-- =====================================================
CREATE TABLE cards (
  card_id TEXT PRIMARY KEY,
  nct_id TEXT NOT NULL,
  study_title TEXT NOT NULL,
  study_brief_description TEXT,
  question TEXT NOT NULL,
  intervention_fragment TEXT NOT NULL,
  intervention_group_fragment TEXT NOT NULL,
  outcome_fragment TEXT NOT NULL,
  comparator_group_fragment TEXT NOT NULL,
  timeframe_fragment TEXT NOT NULL,
  p_value TEXT NOT NULL,
  num_participants INTEGER NOT NULL,
  success BOOLEAN NOT NULL,
  conditions TEXT[] DEFAULT '{}',
  keywords TEXT[] DEFAULT '{}',
  decks TEXT[] DEFAULT '{}',
  understandability_score INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX cards_nct_id_idx ON cards(nct_id);
CREATE INDEX cards_success_idx ON cards(success);
CREATE INDEX cards_decks_idx ON cards USING GIN(decks);

-- Cards are public data - no RLS needed, everyone can read
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cards are publicly readable" ON cards
  FOR SELECT USING (true);


-- =====================================================
-- 2. Create users table (extends auth.users)
-- =====================================================
CREATE TABLE users (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT,
  username TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users can only read/update their own data
CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Everyone can view usernames (for leaderboard)
CREATE POLICY "Usernames are publicly readable" ON users
  FOR SELECT USING (true);


-- =====================================================
-- 3. Create deck_stats table (per-user, per-deck stats)
-- =====================================================
CREATE TABLE deck_stats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  deck_name TEXT NOT NULL,
  cards_played INTEGER DEFAULT 0,
  total_correct INTEGER DEFAULT 0,
  total_wrong INTEGER DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, deck_name)
);

-- Enable Row Level Security
ALTER TABLE deck_stats ENABLE ROW LEVEL SECURITY;

-- Users can only access their own stats
CREATE POLICY "Users can view own deck stats" ON deck_stats
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own deck stats" ON deck_stats
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own deck stats" ON deck_stats
  FOR UPDATE USING (auth.uid() = user_id);


-- =====================================================
-- 4. Create card_answers table (individual card history)
-- =====================================================
CREATE TABLE card_answers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  card_id TEXT NOT NULL,
  deck_name TEXT NOT NULL,
  answer TEXT NOT NULL CHECK (answer IN ('Yes', 'No')),
  correct BOOLEAN NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX card_answers_user_id_idx ON card_answers(user_id);
CREATE INDEX card_answers_timestamp_idx ON card_answers(timestamp);

-- Enable Row Level Security
ALTER TABLE card_answers ENABLE ROW LEVEL SECURITY;

-- Users can only access their own answers
CREATE POLICY "Users can view own card answers" ON card_answers
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own card answers" ON card_answers
  FOR INSERT WITH CHECK (auth.uid() = user_id);


-- =====================================================
-- 5. Auto-create user record trigger
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, username, created_at)
  VALUES (NEW.id, NEW.email, NULL, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
