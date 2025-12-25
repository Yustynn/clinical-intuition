-- Fix for Missing User Records in public.users Table
-- This script addresses the issue where users exist in auth.users but not in public.users
-- causing foreign key constraint violations when saving deck_stats and card_answers

-- ========================================
-- IMMEDIATE FIX: Create missing user records
-- ========================================
-- This creates user records for any authenticated users that don't exist in public.users

INSERT INTO public.users (id, email, created_at)
SELECT
  au.id,
  au.email,
  au.created_at
FROM auth.users au
LEFT JOIN public.users u ON au.id = u.id
WHERE u.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- ========================================
-- VERIFY: Check if trigger exists
-- ========================================
-- The handle_new_user trigger should automatically create user records on sign-up
-- If this returns no rows, the trigger needs to be created

SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- ========================================
-- FIX: Create trigger if missing
-- ========================================
-- This trigger automatically creates a user record in public.users when someone signs up

-- First, create the function that the trigger will call
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, created_at)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.created_at
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Then create the trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ========================================
-- VERIFY: Check users table
-- ========================================
-- This should show all users who now have records

SELECT
  u.id,
  u.email,
  u.username,
  u.created_at,
  COUNT(ds.deck_name) as deck_count,
  COUNT(ca.id) as answer_count
FROM public.users u
LEFT JOIN public.deck_stats ds ON u.id = ds.user_id
LEFT JOIN public.card_answers ca ON u.id = ca.user_id
GROUP BY u.id, u.email, u.username, u.created_at
ORDER BY u.created_at DESC;

-- ========================================
-- CLEANUP: Optional - Remove orphaned data
-- ========================================
-- CAUTION: Only run this if you want to delete deck_stats and card_answers
-- for users that don't exist in auth.users (shouldn't happen in normal circumstances)

-- Uncomment to run:
-- DELETE FROM public.deck_stats
-- WHERE user_id NOT IN (SELECT id FROM public.users);

-- DELETE FROM public.card_answers
-- WHERE user_id NOT IN (SELECT id FROM public.users);
