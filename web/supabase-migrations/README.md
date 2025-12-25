# Supabase Database Migrations

This directory contains SQL migration scripts for the Clinical Intuition app.

## How to Run Migrations

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Create a new query
4. Copy and paste the contents of the migration file
5. Execute the query

## Migration Files

### 003_anonymous_answers.sql
**Purpose:** Track anonymous user card answers before they sign up

**What it does:**
- Creates `anonymous_card_answers` table to store answers from non-authenticated users
- Uses session ID (stored in localStorage) instead of IP addresses for privacy
- Includes RLS policies to allow anonymous users to insert/read
- Allows authenticated users to delete (for migration when they sign up)

**When to run:** Before deploying the anonymous tracking feature

**Tables created:**
- `anonymous_card_answers` - Stores card answers for anonymous users

**Indexes created:**
- `idx_anonymous_card_answers_session_id` - Fast lookups by session ID
- `idx_anonymous_card_answers_card_id` - Fast lookups by card ID

## How Anonymous Tracking Works

1. **Anonymous User Answers a Card:**
   - A unique session ID is generated and stored in localStorage
   - Answer is saved to both:
     - `anonymous_card_answers` table (Supabase, for analytics)
     - localStorage (for local state)

2. **User Signs Up:**
   - All anonymous answers are migrated to `card_answers` table
   - Anonymous answers are deleted from `anonymous_card_answers`
   - Session ID is removed from localStorage

3. **Privacy Considerations:**
   - No IP addresses are stored
   - Session ID is browser-specific and doesn't contain PII
   - Anonymous data is deleted after migration
   - RLS policies ensure data isolation

## Testing the Migration

After running the migration, test by:

1. Opening the app in incognito/private mode (not signed in)
2. Answer a few cards
3. Check Supabase `anonymous_card_answers` table - should see entries
4. Sign up for an account
5. Check `card_answers` table - should see your anonymous answers migrated
6. Check `anonymous_card_answers` - should be empty for your session

## Rollback

If you need to rollback this migration:

```sql
-- Drop the table and indexes
DROP TABLE IF EXISTS anonymous_card_answers CASCADE;
```

Note: This will permanently delete all anonymous answer data.
