-- Create table for anonymous card answers
CREATE TABLE IF NOT EXISTS anonymous_card_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  card_id TEXT NOT NULL,
  deck_name TEXT NOT NULL,
  answer TEXT NOT NULL CHECK (answer IN ('Yes', 'No')),
  correct BOOLEAN NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for faster lookups by session_id
CREATE INDEX IF NOT EXISTS idx_anonymous_card_answers_session_id
  ON anonymous_card_answers(session_id);

-- Create index for faster lookups by card_id
CREATE INDEX IF NOT EXISTS idx_anonymous_card_answers_card_id
  ON anonymous_card_answers(card_id);

-- RLS Policies: Allow anonymous users to insert and read their own answers
ALTER TABLE anonymous_card_answers ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (anonymous users)
CREATE POLICY "Allow anonymous inserts"
  ON anonymous_card_answers
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Allow anyone to read their own answers by session_id
-- Note: This is intentionally permissive since we can't authenticate anon users
CREATE POLICY "Allow read own anonymous answers"
  ON anonymous_card_answers
  FOR SELECT
  TO anon
  USING (true);

-- Allow authenticated users to delete anonymous answers (for migration)
CREATE POLICY "Allow authenticated users to delete anonymous answers"
  ON anonymous_card_answers
  FOR DELETE
  TO authenticated
  USING (true);

-- Add comment
COMMENT ON TABLE anonymous_card_answers IS 'Stores card answers from anonymous users before they sign up. Migrated to card_answers table upon signup.';
