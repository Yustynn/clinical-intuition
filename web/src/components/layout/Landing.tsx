import React, { useRef, useState, useEffect } from 'react';
import ModeToggle from './ModeToggle';
import PredictionCard from '../../features/cards/PredictionCard';
import AuthModal from '../../features/auth/AuthModal';
import { Sheet } from '../../components/ui';
import { getDeckCounts } from '../../constants';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { User, BarChart3 } from 'lucide-react';
import type { Theme, ThemeMode } from '../../utils/theme';
import type { PredictionCard as PredictionCardType } from '../../types';

interface LandingProps {
  theme: Theme;
  mode: ThemeMode;
  onModeChange: (mode: ThemeMode) => void;
  allCards: PredictionCardType[];
  onNavigateToStats: () => void;
}

const Landing: React.FC<LandingProps> = ({ theme, mode, onModeChange, allCards, onNavigateToStats }) => {
  const { user } = useAuth();
  const playsRef = useRef(0);
  const [authOpen, setAuthOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [selectedDeck, setSelectedDeck] = useState<string | null>('Depression');
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

  return (
    <div className="flex flex-col items-center gap-6">
      <header className="w-full max-w-[480px] sm:max-w-xl md:max-w-2xl lg:max-w-4xl xl:max-w-6xl flex items-start justify-between">
        <div>
          <h1 className={`text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-semibold ${theme.font}`}>
            Can you beat scientists' intuitions?
          </h1>
          <p className={`opacity-70 mt-1 text-sm sm:text-base md:text-lg ${theme.font}`}>
            See if you can predict which behavioral interventions worked and which didn't. Based on real trials!{' '}
            <button
              onClick={() => setInfoOpen(true)}
              className="underline underline-offset-2 hover:opacity-100"
            >
              More info
            </button>
          </p>
        </div>
        <div className="flex items-center gap-2">
          {user && (
            <button
              onClick={onNavigateToStats}
              className={`px-3 py-1.5 ${theme.btnRadius} border ${theme.secondaryBtn} text-xs flex items-center gap-1.5 opacity-70 hover:opacity-100 transition-opacity`}
              title="View Stats"
            >
              <BarChart3 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Stats</span>
            </button>
          )}
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

      {/* Deck filter + Card area - side-by-side on desktop */}
      <div className="w-full max-w-[420px] sm:max-w-xl md:max-w-2xl lg:max-w-6xl flex flex-col lg:flex-row lg:items-start gap-6">
        {/* Deck filter */}
        <div className="w-full lg:w-64 lg:flex-shrink-0">
          <div className="flex flex-wrap lg:flex-col gap-2 text-sm">
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
        <div className="flex-1 flex justify-center">
          <PredictionCard theme={theme} allCards={allCards} selectedDeck={selectedDeck} onAnswered={onPlayed} />
        </div>
      </div>

      {/* Info sheet */}
      <Sheet open={infoOpen} onClose={() => setInfoOpen(false)} title="More info" theme={theme}>
        <div className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">Why bother with this?</h4>
            <p className="leading-relaxed">
              Here's the thing—even experts are pretty bad at predicting what works in psychology and medicine.
              There was this big study where psychologists tried to replicate 100 experiments. They predicted 85% would work.
              Actual success rate? 39%. Yikes.
            </p>
            <p className="leading-relaxed mt-2">
              I think most of us walk around with overconfident intuitions about what "should" work. Meditation apps,
              therapy techniques, lifestyle interventions—we assume the science backs them up more than it does.
            </p>
            <p className="leading-relaxed mt-2">
              Playing these cards is a way to recalibrate. You start noticing patterns. Which conditions have treatments
              that actually work? Where do you keep getting surprised? It's weirdly humbling and kinda fun.
            </p>
          </div>

          <div>
            <h4 className="font-medium mb-2">Where do these come from?</h4>
            <p className="leading-relaxed">
              Real trials from ClinicalTrials.gov (the official US government database). I filtered for:
            </p>
            <ul className="list-disc list-inside opacity-90 mt-2 space-y-1">
              <li>Completed studies with published results</li>
              <li>Studies that reported a p-value</li>
              <li>Mostly behavioral interventions (not drugs or devices for now)</li>
            </ul>
            <p className="leading-relaxed mt-2">
              Then I used an LLM to turn the dense medical jargon into readable questions. About 448 cards made the cut.
            </p>
          </div>

          <div>
            <h4 className="font-medium mb-2">What counts as "success"?</h4>
            <p className="leading-relaxed">
              Simple: if the p-value is under 0.05, that's a "yes" (the intervention worked). If it's 0.05 or higher,
              that's a "no" (no significant effect found).
            </p>
            <p className="leading-relaxed mt-2">
              Is this perfect? Nah. P-values have issues. But it's the standard bar scientists use, so I'm using it too.
            </p>
          </div>

          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <h4 className="font-medium mb-2">Help me out? 🙏</h4>
            <p className="leading-relaxed">
              I'm collecting data on predictions. If enough people play, I might find interesting stuff like:
            </p>
            <ul className="list-disc list-inside opacity-90 mt-2 space-y-1">
              <li>Are depression interventions more predictable than anxiety ones?</li>
              <li>Do people get better at this over time?</li>
              <li>What trips everyone up?</li>
            </ul>
            <p className="leading-relaxed mt-2">
              If I see cool patterns, I'll share them.
            </p>
            <p className="leading-relaxed mt-2 font-medium">
              So if you're into it: try the Depression deck (it's the biggest), get friends to sign up and play too,
              and just keep going—more data = more interesting findings.
            </p>
            <p className="leading-relaxed mt-2 opacity-70">
              No pressure though. Have fun with it.
            </p>
          </div>

          <div>
            <h4 className="font-medium mb-2">Still curious?</h4>
            <p className="leading-relaxed">
              Each card has a "Details" button with the full study info + link to ClinicalTrials.gov if you want to dig deeper.
            </p>
          </div>
        </div>
      </Sheet>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} theme={theme} />
    </div>
  );
};

export default Landing;