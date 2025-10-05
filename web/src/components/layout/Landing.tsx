import React, { useRef, useState, useEffect } from 'react';
import ModeToggle from './ModeToggle';
import PredictionCard from '../../features/cards/PredictionCard';
import AuthModal from '../../features/auth/AuthModal';
import { getDeckCounts } from '../../constants';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { User } from 'lucide-react';
import type { Theme, ThemeMode } from '../../utils/theme';
import type { PredictionCard as PredictionCardType } from '../../types';

interface LandingProps {
  theme: Theme;
  mode: ThemeMode;
  onModeChange: (mode: ThemeMode) => void;
  allCards: PredictionCardType[];
}

const Landing: React.FC<LandingProps> = ({ theme, mode, onModeChange, allCards }) => {
  const { user } = useAuth();
  const playsRef = useRef(0);
  const [authOpen, setAuthOpen] = useState(false);
  const [selectedDeck, setSelectedDeck] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);

  const onPlayed = () => {
    playsRef.current += 1;
    // TODO: Re-enable signup modal after auth system is ready
    // if (playsRef.current === 3) {
    //   setAuthOpen(true);
    // }
  };

  // Fetch username when user changes
  useEffect(() => {
    if (!user) {
      setUsername(null);
      return;
    }

    const fetchUsername = async () => {
      const { data } = await supabase
        .from('users')
        .select('username')
        .eq('id', user.id)
        .single();

      setUsername(data?.username || null);
    };

    fetchUsername();
  }, [user]);

  const deckCounts = getDeckCounts(allCards);
  const allDecksOption = { deck: 'All', count: allCards.length };

  return (
    <div className="flex flex-col items-center gap-6">
      <header className="w-full max-w-[480px] flex items-start justify-between">
        <div>
          <h1 className={`text-3xl md:text-3xl font-semibold ${theme.font}`}>
            Can you beat scientists' intuitions?
          </h1>
          <p className={`opacity-70 mt-1 ${theme.font}`}>
            See if you can predict which behavioral interventions worked and which didn't. Based on real trials!
          </p>
        </div>
        <div className="flex items-center gap-2">
          {user ? (
            <button
              onClick={() => setAuthOpen(true)}
              className={`px-3 py-1.5 ${theme.btnRadius} border ${theme.secondaryBtn} text-xs flex items-center gap-1.5 opacity-70 hover:opacity-100 transition-opacity`}
              title={username || user.email || 'Account'}
            >
              <User className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{username || 'Account'}</span>
            </button>
          ) : (
            <button
              onClick={() => setAuthOpen(true)}
              className={`px-3 py-1.5 ${theme.btnRadius} border ${theme.primaryBtn} text-xs font-medium transition-opacity`}
            >
              Sign up
            </button>
          )}
          <ModeToggle mode={mode} onModeChange={onModeChange} />
        </div>
      </header>

      {/* Deck filter */}
      <div className="w-full max-w-[420px]">
        <div className="flex flex-wrap gap-2 text-sm">
          <button
            onClick={() => setSelectedDeck(null)}
            className={`px-3 py-1.5 ${theme.btnRadius} border transition-all ${
              selectedDeck === null
                ? `${theme.primaryBtn} font-medium`
                : `${theme.secondaryBtn} opacity-70 hover:opacity-100`
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
                  ? `${theme.primaryBtn} font-medium`
                  : `${theme.secondaryBtn} opacity-70 hover:opacity-100`
              }`}
            >
              {deck} ({count})
            </button>
          ))}
        </div>
      </div>

      {/* Card area */}
      <div className="w-full max-w-[420px]">
        <PredictionCard theme={theme} allCards={allCards} selectedDeck={selectedDeck} onAnswered={onPlayed} />
      </div>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} theme={theme} />
    </div>
  );
};

export default Landing;