import React, { useState, useEffect } from 'react';
import { Sheet, Button } from '../../components/ui';
import { useAuth } from '../../hooks/useAuth';
import { updateUsername, isUsernameAvailable, deleteAllUserProgress } from '../../lib/supabaseService';
import { supabase } from '../../lib/supabase';
import { STORAGE_KEYS } from '../../constants';
import type { Theme } from '../../utils/theme';

// Helper to get total cards played from localStorage
function getTotalCardsPlayed(): number {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.DECK_STATS);
    if (!stored) return 0;

    const stats = JSON.parse(stored);
    return Object.values(stats).reduce((total: number, deck: any) => {
      return total + (deck.cardsPlayed || 0);
    }, 0);
  } catch {
    return 0;
  }
}

// Helper to clear all localStorage data
function clearAllProgress() {
  try {
    localStorage.removeItem(STORAGE_KEYS.DECK_STATS);
    localStorage.removeItem(STORAGE_KEYS.CARD_ANSWERS);
    localStorage.removeItem(STORAGE_KEYS.ANSWERED_CARD_IDS);
  } catch (error) {
    console.error('Failed to clear localStorage:', error);
  }
}

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  theme: Theme;
}

const AuthModal: React.FC<AuthModalProps> = ({ open, onClose, theme }) => {
  const { user, signInWithMagicLink, signInWithOAuth, signOut } = useAuth();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [needsUsername, setNeedsUsername] = useState(false);
  const [existingUsername, setExistingUsername] = useState<string | null>(null);

  // Merge confirmation state
  const [showMergeDialog, setShowMergeDialog] = useState(false);
  const [mergeChoice, setMergeChoice] = useState<'keep' | 'reset'>('keep');
  const [pendingAuth, setPendingAuth] = useState<'google' | 'email' | null>(null);
  const [localCardsCount, setLocalCardsCount] = useState(0);

  // Reset confirmation state
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');

  const handleGoogleSignIn = async () => {
    // Check for local progress first
    const cardsPlayed = getTotalCardsPlayed();
    if (cardsPlayed > 0) {
      setLocalCardsCount(cardsPlayed);
      setPendingAuth('google');
      setShowMergeDialog(true);
      return;
    }

    // No local progress, proceed directly
    proceedWithGoogleSignIn();
  };

  const proceedWithGoogleSignIn = async () => {
    setLoading(true);
    setError(null);

    const { error } = await signInWithOAuth('google');

    if (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  const handleMagicLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check for local progress first
    const cardsPlayed = getTotalCardsPlayed();
    if (cardsPlayed > 0) {
      setLocalCardsCount(cardsPlayed);
      setPendingAuth('email');
      setShowMergeDialog(true);
      return;
    }

    // No local progress, proceed directly
    proceedWithMagicLink();
  };

  const proceedWithMagicLink = async () => {
    setLoading(true);
    setError(null);

    const { error } = await signInWithMagicLink(email);

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setMagicLinkSent(true);
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    const { error } = await signOut();
    if (error) {
      setError(error.message);
    } else {
      onClose();
    }
    setLoading(false);
  };

  const handleMergeConfirm = () => {
    if (mergeChoice === 'reset') {
      clearAllProgress();
    }

    setShowMergeDialog(false);

    // Proceed with pending auth
    if (pendingAuth === 'google') {
      proceedWithGoogleSignIn();
    } else if (pendingAuth === 'email') {
      proceedWithMagicLink();
    }

    setPendingAuth(null);
  };

  const handleResetConfirm = async () => {
    if (resetConfirmText.toUpperCase() !== 'RESET') {
      setError('Please type RESET to confirm');
      return;
    }

    setLoading(true);

    try {
      // If user is signed in, delete from Supabase first
      if (user) {
        await deleteAllUserProgress(user.id);
      }

      // Clear localStorage
      clearAllProgress();

      // Set a flag to prevent sync on next page load
      // This ensures we start completely fresh
      localStorage.setItem('SKIP_NEXT_SYNC', 'true');

      setShowResetDialog(false);
      setResetConfirmText('');
      setError(null);

      // Wait a bit to ensure all operations complete before reloading
      // This prevents race conditions where sync happens before deletion completes
      await new Promise(resolve => setTimeout(resolve, 800));

      // Reload with cache busting to ensure clean slate
      window.location.href = window.location.href.split('?')[0] + '?t=' + Date.now();
    } catch (err) {
      console.error('Error resetting progress:', err);
      setError('Failed to reset progress. Please try again.');
      setLoading(false);
    }
  };

  const handleUsernameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !username.trim()) return;

    setLoading(true);
    setError(null);

    // Validate username format
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      setError('Username must be 3-20 characters, letters, numbers, and underscores only');
      setLoading(false);
      return;
    }

    // Check availability
    const available = await isUsernameAvailable(username);
    if (!available) {
      setError('Username already taken');
      setLoading(false);
      return;
    }

    // Update username
    try {
      await updateUsername(user.id, username);
      setNeedsUsername(false);
      setExistingUsername(username);
      setError(null);
    } catch (err) {
      setError('Failed to set username. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Check if user needs to set username
  useEffect(() => {
    if (!user) {
      setNeedsUsername(false);
      setExistingUsername(null);
      return;
    }

    const checkUsername = async () => {
      const { data } = await supabase
        .from('users')
        .select('username')
        .eq('id', user.id)
        .single();

      if (data?.username) {
        setExistingUsername(data.username);
        setNeedsUsername(false);
      } else {
        setNeedsUsername(true);
        setExistingUsername(null);
      }
    };

    checkUsername();
  }, [user]);

  // Merge confirmation dialog
  if (showMergeDialog) {
    return (
      <Sheet open={open} onClose={() => {}} title={`You've played ${localCardsCount} cards!`} theme={theme}>
        <div className="grid gap-4">
          <div className="text-sm opacity-80">
            What would you like to do with your progress?
          </div>

          <div className="grid gap-2">
            <label className={`flex items-start gap-3 p-3 ${theme.btnRadius} border cursor-pointer transition-all ${
              mergeChoice === 'keep' ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/30' : 'border-amber-300 hover:border-amber-400'
            }`}>
              <input
                type="radio"
                name="merge"
                checked={mergeChoice === 'keep'}
                onChange={() => setMergeChoice('keep')}
                className="mt-0.5"
              />
              <div className="flex-1">
                <div className="font-medium">✅ Keep my progress</div>
                <div className="text-xs opacity-70 mt-1">{localCardsCount} cards will be saved to your account</div>
              </div>
            </label>

            <label className={`flex items-start gap-3 p-3 ${theme.btnRadius} border cursor-pointer transition-all ${
              mergeChoice === 'reset' ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/30' : 'border-amber-300 hover:border-amber-400'
            }`}>
              <input
                type="radio"
                name="merge"
                checked={mergeChoice === 'reset'}
                onChange={() => setMergeChoice('reset')}
                className="mt-0.5"
              />
              <div className="flex-1">
                <div className="font-medium">🔄 Start fresh</div>
                <div className="text-xs opacity-70 mt-1">Begin with 0 cards (current progress will be deleted)</div>
              </div>
            </label>
          </div>

          <div className="flex gap-2">
            <Button
              theme={theme}
              variant="secondary"
              className="flex-1 justify-center"
              onClick={() => {
                setShowMergeDialog(false);
                setPendingAuth(null);
              }}
            >
              Cancel
            </Button>
            <Button
              theme={theme}
              className="flex-1 justify-center"
              onClick={handleMergeConfirm}
            >
              Continue
            </Button>
          </div>
        </div>
      </Sheet>
    );
  }

  // Reset confirmation dialog
  if (showResetDialog) {
    const cardsPlayed = getTotalCardsPlayed();
    return (
      <Sheet open={open} onClose={() => setShowResetDialog(false)} title="Reset all progress?" theme={theme}>
        <div className="grid gap-4">
          <div className="text-sm opacity-80">
            This will permanently delete your {cardsPlayed} cards of progress. This action cannot be undone.
          </div>

          <div className={`p-3 ${theme.btnRadius} bg-red-50 dark:bg-red-950/30 border border-red-300 dark:border-red-800`}>
            <div className="text-sm font-medium text-red-600 dark:text-red-400 mb-2">⚠️ Danger Zone</div>
            <div className="text-xs opacity-70">To confirm, type <strong>RESET</strong> below:</div>
            <input
              value={resetConfirmText}
              onChange={(e) => setResetConfirmText(e.target.value)}
              type="text"
              placeholder="Type RESET"
              className={`mt-2 h-10 px-3 w-full ${theme.btnRadius} border border-red-300 dark:border-red-800 ${
                theme.key === 'retroDark' ? 'bg-black text-red-400' : 'bg-white text-red-600'
              }`}
            />
          </div>

          {error && <div className="text-xs text-red-500">{error}</div>}

          <div className="flex gap-2">
            <Button
              theme={theme}
              variant="secondary"
              className="flex-1 justify-center"
              onClick={() => {
                setShowResetDialog(false);
                setResetConfirmText('');
                setError(null);
              }}
            >
              Cancel
            </Button>
            <Button
              theme={theme}
              className="flex-1 justify-center"
              onClick={handleResetConfirm}
              disabled={resetConfirmText.toUpperCase() !== 'RESET' || loading}
            >
              {loading ? 'Resetting...' : 'Reset Progress'}
            </Button>
          </div>
        </div>
      </Sheet>
    );
  }

  // If user needs to set username
  if (user && needsUsername) {
    return (
      <Sheet open={open} onClose={() => {}} title="Choose your username" theme={theme}>
        <div className="grid gap-3">
          <div className="text-sm opacity-80">
            Pick a username for the leaderboard. This will be visible to other players.
          </div>
          <form onSubmit={handleUsernameSubmit} className="grid gap-2">
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              type="text"
              required
              placeholder="username"
              pattern="[a-zA-Z0-9_]{3,20}"
              disabled={loading}
              className={`h-12 px-3 ${theme.btnRadius} border border-amber-300 ${
                theme.key === 'retroDark' ? 'bg-black text-amber-400' : 'bg-white text-black'
              } disabled:opacity-50`}
            />
            <div className="text-xs opacity-60">3-20 characters, letters, numbers, and underscores</div>
            <Button theme={theme} type="submit" className="w-full justify-center" disabled={loading}>
              {loading ? 'Setting username...' : 'Continue'}
            </Button>
          </form>
          {error && <div className="text-xs text-red-500 text-center">{error}</div>}
        </div>
      </Sheet>
    );
  }

  // If user is already signed in
  if (user && !needsUsername) {
    const cardsPlayed = getTotalCardsPlayed();
    return (
      <Sheet open={open} onClose={onClose} title="Account" theme={theme}>
        <div className="grid gap-3">
          <div className="text-sm">
            <div className="opacity-70">Username</div>
            <div className="font-medium">{existingUsername || 'Not set'}</div>
          </div>
          <div className="text-sm">
            <div className="opacity-70">Email</div>
            <div className="font-medium">{user.email}</div>
          </div>
          <Button
            theme={theme}
            variant="secondary"
            className="w-full justify-center"
            onClick={handleSignOut}
            disabled={loading}
          >
            {loading ? 'Signing out...' : 'Sign out'}
          </Button>

          {/* Reset button for signed-in users */}
          {cardsPlayed > 0 && (
            <div className="border-t border-amber-300 pt-3 mt-2">
              <div className="text-xs opacity-70 mb-2">Danger Zone</div>
              <button
                onClick={() => setShowResetDialog(true)}
                className="text-xs text-red-500 hover:text-red-600 underline"
              >
                Reset all progress ({cardsPlayed} cards)
              </button>
            </div>
          )}

          {error && <div className="text-xs text-red-500">{error}</div>}
        </div>
      </Sheet>
    );
  }

  // If magic link was sent
  if (magicLinkSent) {
    return (
      <Sheet open={open} onClose={onClose} title="Check your email" theme={theme}>
        <div className="grid gap-3">
          <div className="text-sm opacity-80">
            We've sent a magic link to <strong>{email}</strong>. Click the link in the email to sign in.
          </div>
          <Button
            theme={theme}
            variant="secondary"
            className="w-full justify-center"
            onClick={() => {
              setMagicLinkSent(false);
              setEmail('');
            }}
          >
            Try another email
          </Button>
        </div>
      </Sheet>
    );
  }

  // Sign in form
  const cardsPlayed = getTotalCardsPlayed();
  return (
    <Sheet open={open} onClose={onClose} title="Save your streak & compare with friends" theme={theme}>
      <div className="grid gap-3">
        <Button
          theme={theme}
          className="w-full justify-center"
          onClick={handleGoogleSignIn}
          disabled={loading}
        >
          Continue with Google
        </Button>
        <div className="text-center text-xs opacity-60">or</div>
        <form onSubmit={handleMagicLinkSubmit} className="grid gap-2">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            required
            placeholder="your@email.com"
            disabled={loading}
            className={`h-12 px-3 ${theme.btnRadius} border border-amber-300 ${
              theme.key === 'retroDark' ? 'bg-black text-amber-400' : 'bg-white text-black'
            } disabled:opacity-50`}
          />
          <Button theme={theme} type="submit" className="w-full justify-center" disabled={loading}>
            {loading ? 'Sending...' : 'Send magic link'}
          </Button>
        </form>
        {error && <div className="text-xs text-red-500 text-center">{error}</div>}
        <div className="text-xs opacity-60 text-center">No passwords. One-tap login.</div>

        {/* Reset button for anonymous users */}
        {cardsPlayed > 0 && (
          <div className="border-t border-amber-300 pt-3 mt-2 text-center">
            <div className="text-xs opacity-70 mb-2">Playing anonymously?</div>
            <button
              onClick={() => setShowResetDialog(true)}
              className="text-xs text-red-500 hover:text-red-600 underline"
            >
              Reset progress ({cardsPlayed} cards)
            </button>
          </div>
        )}
      </div>
    </Sheet>
  );
};

export default AuthModal;