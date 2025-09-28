import React, { useState } from 'react';
import { Sheet, Button } from '../../components/ui';
import type { Theme } from '../../utils/theme';

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  theme: Theme;
}

const AuthModal: React.FC<AuthModalProps> = ({ open, onClose, theme }) => {
  const [email, setEmail] = useState('');

  return (
    <Sheet open={open} onClose={onClose} title="Save your streak & compare with friends" theme={theme}>
      <div className="grid gap-3">
        <Button theme={theme} className="w-full justify-center">
          Continue with Apple
        </Button>
        <Button theme={theme} variant="secondary" className="w-full justify-center">
          Continue with Google
        </Button>
        <div className="text-center text-xs opacity-60">or</div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onClose();
          }}
          className="grid gap-2"
        >
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            required
            placeholder="your@email.com"
            className={`h-12 px-3 ${theme.btnRadius} border border-amber-300 ${
              theme.key === 'retroDark' ? 'bg-black text-amber-400' : 'bg-white text-black'
            }`}
          />
          <Button theme={theme} type="submit" className="w-full justify-center">
            Send magic link
          </Button>
        </form>
        <div className="text-xs opacity-60 text-center">No passwords. One-tap login.</div>
      </div>
    </Sheet>
  );
};

export default AuthModal;