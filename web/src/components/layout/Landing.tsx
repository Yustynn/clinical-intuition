import React, { useRef, useState } from 'react';
import ModeToggle from './ModeToggle';
import PredictionCard from '../../features/cards/PredictionCard';
import AuthModal from '../../features/auth/AuthModal';
import { getDeckCounts, ALL_CARDS } from '../../constants';
import type { Theme, ThemeMode } from '../../utils/theme';

interface LandingProps {
  theme: Theme;
  mode: ThemeMode;
  onModeChange: (mode: ThemeMode) => void;
}

const Landing: React.FC<LandingProps> = ({ theme, mode, onModeChange }) => {
  const playsRef = useRef(0);
  const [authOpen, setAuthOpen] = useState(false);
  const [selectedDeck, setSelectedDeck] = useState<string | null>(null);

  const onPlayed = () => {
    playsRef.current += 1;
    // TODO: Re-enable signup modal after auth system is ready
    // if (playsRef.current === 3) {
    //   setAuthOpen(true);
    // }
  };

  const deckCounts = getDeckCounts();
  const allDecksOption = { deck: 'All', count: ALL_CARDS.length };

  return (
    <div className="flex flex-col items-center gap-6">
      <header className="w-full max-w-[420px] flex items-start justify-between">
        <div>
          <h1 className={`text-2xl md:text-3xl font-semibold ${theme.font}`}>
            How sharp is your clinical intuition?
          </h1>
          <p className={`opacity-70 mt-1 ${theme.font}`}>
            Real results. Real trials. Guess yes/no — build intuition fast.
          </p>
        </div>
        <ModeToggle mode={mode} onModeChange={onModeChange} />
      </header>

      {/* Deck filter */}
      <div className="w-full max-w-[420px]">
        <div className="flex flex-wrap gap-2 text-sm">
          <button
            onClick={() => setSelectedDeck(null)}
            className={`px-3 py-1.5 ${theme.btnRadius} border transition-all ${
              selectedDeck === null
                ? `${theme.btnPrimary} ${theme.btnBorder} font-medium`
                : `${theme.btnSecondary} ${theme.btnBorder} opacity-70 hover:opacity-100`
            }`}
          >
            {allDecksOption.deck} ({allDecksOption.count})
          </button>
          {deckCounts.map(({ deck, count }) => (
            <button
              key={deck}
              onClick={() => setSelectedDeck(deck)}
              className={`px-3 py-1.5 ${theme.btnRadius} border transition-all ${
                selectedDeck === deck
                  ? `${theme.btnPrimary} ${theme.btnBorder} font-medium`
                  : `${theme.btnSecondary} ${theme.btnBorder} opacity-70 hover:opacity-100`
              }`}
            >
              {deck} ({count})
            </button>
          ))}
        </div>
      </div>

      {/* Card area */}
      <div className="w-full max-w-[420px]">
        <PredictionCard theme={theme} selectedDeck={selectedDeck} onAnswered={onPlayed} />
      </div>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} theme={theme} />
    </div>
  );
};

export default Landing;