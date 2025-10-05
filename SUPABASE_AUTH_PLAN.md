# Supabase Auth Implementation Plan

## Overview
Adding Supabase authentication to Clinical Intuition with optional signup, anonymous user support, and automatic sync of localStorage stats to Supabase when users authenticate.

## Prerequisites
From Supabase Dashboard (Project Settings → API):
- **Project URL**: `https://xxxxx.supabase.co`
- **Anon/Public Key**: The `anon` `public` key (NOT `service_role`)

---

## Phase 1: Setup & Dependencies
1. Install `@supabase/supabase-js` package
2. Create `web/.env.local` with Supabase credentials:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Add `.env.local` to `.gitignore` if not already present

---

## Phase 2: Database Schema
Create Supabase tables via SQL in Supabase Dashboard (SQL Editor):

### Table: `users`
Extends auth.users with app-specific data
```sql
CREATE TABLE users (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users can only read/update their own data
CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (auth.uid() = id);
```

### Table: `deck_stats`
Per-user, per-deck statistics
```sql
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

-- Enable RLS
ALTER TABLE deck_stats ENABLE ROW LEVEL SECURITY;

-- Users can only access their own stats
CREATE POLICY "Users can view own deck stats" ON deck_stats
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own deck stats" ON deck_stats
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own deck stats" ON deck_stats
  FOR UPDATE USING (auth.uid() = user_id);
```

### Table: `card_answers`
Individual card answer history
```sql
CREATE TABLE card_answers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  card_id TEXT NOT NULL,
  deck_name TEXT NOT NULL,
  answer TEXT NOT NULL CHECK (answer IN ('Yes', 'No')),
  correct BOOLEAN NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX card_answers_user_id_idx ON card_answers(user_id);
CREATE INDEX card_answers_timestamp_idx ON card_answers(timestamp);

-- Enable RLS
ALTER TABLE card_answers ENABLE ROW LEVEL SECURITY;

-- Users can only access their own answers
CREATE POLICY "Users can view own card answers" ON card_answers
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own card answers" ON card_answers
  FOR INSERT WITH CHECK (auth.uid() = user_id);
```

### Trigger: Auto-create user record
```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, created_at)
  VALUES (NEW.id, NEW.email, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

---

## Phase 3: Supabase Client & Auth Context
1. **Create `web/src/lib/supabase.ts`** - Initialize Supabase client
2. **Create `web/src/contexts/AuthContext.tsx`** - Auth provider with:
   - Current user state (from Supabase auth)
   - Session state
   - `signInWithMagicLink(email)` method
   - `signInWithOAuth(provider)` method (Google, Apple)
   - `signOut()` method
   - Loading state
3. **Create `web/src/hooks/useAuth.ts`** - Hook to consume auth context
4. **Wrap App.tsx with `<AuthProvider>`**

---

## Phase 4: Configure Auth Providers in Supabase
In Supabase Dashboard (Authentication → Providers):

### Email (Magic Link)
- Enable "Email" provider
- Enable "Confirm email" = OFF (for passwordless magic link)
- Configure Site URL and Redirect URLs

### Google OAuth
- Enable "Google" provider
- Get OAuth credentials from Google Cloud Console
- Add Client ID and Client Secret to Supabase

### Apple OAuth
- Enable "Apple" provider
- Get credentials from Apple Developer
- Add Service ID, Team ID, Key ID, and Private Key to Supabase

**Note:** OAuth setup can be done incrementally. Start with Magic Link, then add OAuth later.

---

## Phase 5: Update AuthModal
Update `web/src/features/auth/AuthModal.tsx`:
- Integrate magic link auth with Supabase (`signInWithMagicLink`)
- Add Google OAuth button handler (`signInWithOAuth('google')`)
- Add Apple OAuth button handler (`signInWithOAuth('apple')`)
- Show loading states during auth
- Show success message after magic link sent
- Handle errors gracefully
- Disable form when already authenticated

---

## Phase 6: Data Sync Logic

### Create `web/src/hooks/useSyncStats.ts`
Hook that:
- Reads localStorage deck stats on mount
- If user is authenticated:
  - Syncs localStorage → Supabase on first load
  - Fetches Supabase stats on subsequent loads
- Provides `syncToSupabase()` function

### Update `web/src/hooks/useCardDemo.ts`
Modify answer recording:
```typescript
const answer = (choice: 'Yes' | 'No') => {
  // ... existing logic ...

  // Save to localStorage (always)
  saveDeckStats(updatedDeckStats);

  // If authenticated, also save to Supabase
  if (user) {
    await saveToSupabase(deckName, stats, cardAnswer);
  }
}
```

### Create Supabase service functions
Create `web/src/lib/supabaseService.ts`:
- `upsertDeckStats(userId, deckName, stats)` - Upsert deck stats
- `saveCardAnswer(userId, cardAnswer)` - Insert card answer
- `fetchDeckStats(userId)` - Fetch all user deck stats
- `fetchCardAnswers(userId, options)` - Fetch card history

---

## Phase 7: Session Persistence
- Supabase client uses localStorage by default (automatic)
- On app mount, check for existing session
- Restore user state from session
- Auto-refresh tokens (Supabase handles this)

---

## Phase 8: UI Updates

### Add Sign Out Button
- Add user profile indicator in header (near ModeToggle)
- Show user email when signed in
- Add "Sign Out" button

### Update AuthModal Behavior
- When already signed in, show "Already signed in as {email}" with Sign Out option
- Or hide the modal trigger entirely when authenticated

### Add Email Confirmation UI
- After magic link sent, show "Check your email" message
- Handle email confirmation callback

---

## Phase 9: Testing & Error Handling
- Test magic link flow (send email → click link → redirected)
- Test OAuth flows (Google, Apple) once configured
- Test anonymous → authenticated transition:
  - Play cards anonymously
  - Sign up
  - Verify stats synced to Supabase
- Add error handling:
  - Network failures
  - Auth errors (invalid email, etc.)
  - Supabase RLS violations
- Add loading states throughout auth flows
- Test session persistence (close tab → reopen → still signed in)

---

## Implementation Order
1. Phase 1: Setup & Dependencies ✓
2. Phase 2: Database Schema ✓
3. Phase 3: Supabase Client & Auth Context ✓
4. Phase 5: Update AuthModal (Magic Link only first) ✓
5. Phase 7: Session Persistence ✓
6. Phase 8: UI Updates (basic) ✓
7. Phase 6: Data Sync Logic ✓
8. Phase 4: Configure OAuth (Google, Apple) - Optional, can do later
9. Phase 9: Testing & Polish ✓

---

## Notes
- OAuth providers (Google/Apple) require additional setup - can be added after magic link works
- Keep localStorage as fallback for anonymous users
- Authenticated users get dual-write (localStorage + Supabase) for performance
- RLS policies ensure users can only access their own data
