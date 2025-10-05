import React, { useState, useEffect } from 'react';
import { Sheet, Button } from '../../components/ui';
import { useAuth } from '../../hooks/useAuth';
import { updateUsername, isUsernameAvailable } from '../../lib/supabaseService';
import { supabase } from '../../lib/supabase';
import type { Theme } from '../../utils/theme';

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

  const handleGoogleSignIn = async () => {
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
      </div>
    </Sheet>
  );
};

export default AuthModal;