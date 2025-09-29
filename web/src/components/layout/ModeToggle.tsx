import React from 'react';
import { Sun, Moon } from 'lucide-react';
import type { ThemeMode } from '../../utils/theme';

interface ModeToggleProps {
  mode: ThemeMode;
  onModeChange: (mode: ThemeMode) => void;
}

const ModeToggle: React.FC<ModeToggleProps> = ({ mode, onModeChange }) => {
  return (
    <button
      onClick={() => onModeChange(mode === 'dark' ? 'light' : 'dark')}
      className="p-2 border border-amber-300/50 hover:bg-white/5"
    >
      {mode === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );
};

export default ModeToggle;