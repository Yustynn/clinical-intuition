-- Fix Row Level Security (RLS) Policies to Allow Users to Delete Their Own Data
-- Run this in your Supabase SQL Editor

-- ========================================
-- 1. Check current policies
-- ========================================
-- This shows what policies exist and what they allow
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('deck_stats', 'card_answers', 'users')
ORDER BY tablename, policyname;

-- ========================================
-- 2. Enable RLS (if not already enabled)
-- ========================================
ALTER TABLE public.deck_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.card_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- ========================================
-- 3. Create DELETE policies for deck_stats
-- ========================================
-- Drop existing delete policy if it exists
DROP POLICY IF EXISTS "Users can delete their own deck stats" ON public.deck_stats;

-- Create new delete policy
CREATE POLICY "Users can delete their own deck stats"
ON public.deck_stats
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- ========================================
-- 4. Create DELETE policies for card_answers
-- ========================================
-- Drop existing delete policy if it exists
DROP POLICY IF EXISTS "Users can delete their own card answers" ON public.card_answers;

-- Create new delete policy
CREATE POLICY "Users can delete their own card answers"
ON public.card_answers
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- ========================================
-- 5. Create UPDATE policies for users table
-- ========================================
-- Drop existing update policy if it exists
DROP POLICY IF EXISTS "Users can update their own data" ON public.users;

-- Create new update policy
CREATE POLICY "Users can update their own data"
ON public.users
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- ========================================
-- 6. Verify policies were created
-- ========================================
SELECT
  tablename,
  policyname,
  cmd,
  roles,
  CASE
    WHEN cmd = 'DELETE' THEN '✅ DELETE enabled'
    WHEN cmd = 'UPDATE' THEN '✅ UPDATE enabled'
    WHEN cmd = 'INSERT' THEN '✅ INSERT enabled'
    WHEN cmd = 'SELECT' THEN '✅ SELECT enabled'
    ELSE cmd
  END as status
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('deck_stats', 'card_answers', 'users')
ORDER BY tablename, cmd;

-- ========================================
-- 7. Test deletion (optional)
-- ========================================
-- This will show you if deletion is now working
-- Uncomment to test (won't actually delete, just shows what would be deleted)
-- SELECT COUNT(*) as "Records that would be deleted from deck_stats"
-- FROM public.deck_stats
-- WHERE user_id = auth.uid();
--
-- SELECT COUNT(*) as "Records that would be deleted from card_answers"
-- FROM public.card_answers
-- WHERE user_id = auth.uid();
