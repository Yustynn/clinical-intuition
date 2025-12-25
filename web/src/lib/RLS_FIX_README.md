# RLS Policy Fix - Enable User Data Deletion

## The Problem

The error shows:
```
⚠️ WARNING: Deletion incomplete! Remaining: 8 deck stats, 49 answers
Error: Deletion verification failed - some records remain
```

**Root Cause**: Row Level Security (RLS) policies on your Supabase tables are blocking DELETE operations. You can INSERT and SELECT your data, but can't DELETE it.

## Why This Happens

Supabase uses PostgreSQL's RLS to control data access. Your tables likely have:
- ✅ **SELECT policy**: "Users can view their own data"
- ✅ **INSERT policy**: "Users can insert their own data"
- ❌ **DELETE policy**: Missing or misconfigured

Without a DELETE policy, the `DELETE` SQL command runs but **silently deletes 0 rows** because RLS blocks it.

## The Fix

### Quick Fix (2 minutes):

1. Open **Supabase Dashboard** → **SQL Editor**
2. Copy and paste the **entire** `fix_rls_policies.sql` file
3. Click **Run**

This will:
- Enable RLS on all tables (if not already enabled)
- Create DELETE policies for `deck_stats` and `card_answers`
- Create UPDATE policies for `users` table
- Verify the policies were created successfully

### Manual Fix (if you prefer):

If you want to do it manually, just run these key commands:

```sql
-- Allow users to delete their deck stats
CREATE POLICY "Users can delete their own deck stats"
ON public.deck_stats
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Allow users to delete their card answers
CREATE POLICY "Users can delete their own card answers"
ON public.card_answers
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
```

## Verification

After running the fix, check if it worked:

```sql
SELECT
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('deck_stats', 'card_answers')
  AND cmd = 'DELETE';
```

You should see 2 rows showing DELETE policies for both tables.

## Testing

After fixing RLS policies:

1. **Refresh your app** (the page should have reloaded after the error)
2. **Go to Account** → **Reset Progress** again
3. **Type RESET** and confirm

You should now see:
```
🗑️ Deleting all progress from Supabase for user: [id]
📊 Found 8 deck stats and 49 card answers to delete
✅ Deleted 8 deck stats records
✅ Deleted 49 card answers records
✅ Verified: All data successfully deleted (0 records remaining)
```

## Why We Need This

Users need the ability to:
- **Reset their progress** completely
- **Delete their account data** (privacy/GDPR compliance)
- **Start fresh** if they want to retake the cards

Without DELETE permissions, the reset button doesn't work for authenticated users!

## Security Note

These policies are safe because:
- Users can **only** delete their **own** data (`auth.uid() = user_id`)
- Anonymous users can't delete anything (policy requires `authenticated` role)
- No user can delete another user's data

This is standard practice for user-owned data in Supabase.
