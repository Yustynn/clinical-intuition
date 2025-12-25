# Fix for Supabase Foreign Key Constraint Errors

## The Problem

You were experiencing errors like:
```
Error code: 23503
Message: "insert or update on table 'deck_stats' violates foreign key constraint 'deck_stats_user_id_fkey'"
Details: "Key is not present in table 'users'"
```

**Root Cause**: Users exist in `auth.users` (authentication table) but not in `public.users` (your application table). This happens when the automatic trigger that should create user records fails or doesn't exist.

## The Fix

I've implemented a **two-layer fix**:

### 1. Code-Level Fix (Automatic) ✅

The application now automatically ensures user records exist before saving data:

**Changes Made:**
- Added `ensureUserExists()` function in `supabaseService.ts`
- Updated all save functions to check/create user records:
  - `upsertDeckStats()`
  - `saveCardAnswer()`
  - `updateUsername()`
- Enhanced `useSyncStats` to ensure user exists during sync

**What This Means:**
- The app will now automatically create missing user records when needed
- You'll see console logs: `🔧 User record missing, creating entry in users table`
- Followed by: `✅ User record created successfully`

### 2. Database Fix (Manual) 📝

To fix your **existing account** and ensure the trigger works for future users:

#### Quick Fix (Run this now):

1. Go to your Supabase dashboard
2. Navigate to **SQL Editor**
3. Copy and paste this command:

```sql
INSERT INTO public.users (id, email, created_at)
SELECT
  au.id,
  au.email,
  au.created_at
FROM auth.users au
LEFT JOIN public.users u ON au.id = u.id
WHERE u.id IS NULL
ON CONFLICT (id) DO NOTHING;
```

4. Click **Run**

This creates user records for all authenticated users who don't have entries in the `users` table.

#### Full Fix (Optional but recommended):

Run the complete SQL script from `fix_missing_users.sql`. This will:
- Create missing user records
- Verify the trigger exists
- Create/recreate the trigger if needed
- Show you stats on all users

## Verification

After running the fix, you can verify it worked:

```sql
SELECT
  u.id,
  u.email,
  u.username,
  COUNT(ds.deck_name) as deck_count,
  COUNT(ca.id) as answer_count
FROM public.users u
LEFT JOIN public.deck_stats ds ON u.id = ds.user_id
LEFT JOIN public.card_answers ca ON u.id = ca.user_id
GROUP BY u.id, u.email, u.username
ORDER BY u.created_at DESC;
```

You should see your user account with counts for decks and answers.

## Testing

1. **Sign out** of the app
2. **Clear your browser's local storage** (or use incognito mode)
3. **Sign in** again
4. **Answer a few cards**
5. **Check console logs** - you should see:
   - `🔵 User authenticated, saving to Supabase`
   - `🔧 User record missing, creating entry` (if this is first time after fix)
   - `✅ User record created successfully`
   - `✅ Deck stats saved successfully to Supabase`
   - `✅ Card answer saved successfully to Supabase`

No more ❌ errors!

## What Happened?

The original database schema should have included a trigger that automatically creates a `public.users` record whenever someone signs up (`auth.users` insert). This trigger either:
1. Was never created
2. Was accidentally deleted
3. Failed silently during user creation

The code fix ensures this never causes problems again by proactively creating user records when needed.

## Future Prevention

With both fixes in place:
- **New users**: The trigger creates their record automatically
- **Fallback**: If trigger fails, the app code creates the record
- **Existing users**: The SQL migration fixed their accounts

You should never see this error again! 🎉
