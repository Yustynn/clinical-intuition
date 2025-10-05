-- Migration: Add username column to users table
-- Run this in Supabase Dashboard → SQL Editor

-- Add username column
ALTER TABLE users ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;

-- Drop existing "Usernames are publicly readable" policy if it exists
DROP POLICY IF EXISTS "Usernames are publicly readable" ON users;

-- Create new policy for public username viewing
CREATE POLICY "Usernames are publicly readable" ON users
  FOR SELECT USING (true);
