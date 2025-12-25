import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Share2, ChevronDown, X, Check, Flag, ExternalLink, Flame, Sparkles } from 'lucide-react';
import { Button, Sheet, Toast } from '../../components/ui';
import { GradientFlash, ScorePop, EmojiBurst, ParticleTrail } from '../../components/ui/Effects';
import QuestionStyles from '../../components/ui/QuestionStyles';
import { useCardDemo } from '../../hooks/useCardDemo';
import { getDeckBaseRate } from '../../constants';
import { trackModalOpen, trackSkip, trackDeckComplete } from '../../utils/analytics';
import type { Theme } from '../../utils/theme';
import type { PredictionCard as PredictionCardType } from '../../types';

// Deck completion view component
interface DeckCompletionViewProps {
  theme: Theme;
  deckName: string;
  stats: {
    totalCards: number;
    correctCount: number;
    wrongCount: number;
    accuracy: number;
  };
  baselineAccuracy: number;
  onSwitchDeck: () => void;
}

const DeckCompletionView: React.FC<DeckCompletionViewProps> = ({
  theme,
  deckName,
  stats,
  baselineAccuracy,
  onSwitchDeck,
}) => {
  const delta = stats.accuracy - baselineAccuracy;
  const beatBaseline = delta > 0;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-6 text-center"
    >
      {/* Celebration header */}
      <div>
        <h2 className="text-3xl font-bold mb-2">
          🎉 Deck Complete!
        </h2>
        <p className="text-lg opacity-80">
          You've answered all {stats.totalCards} cards in {deckName}
        </p>
      </div>

      {/* Stats summary */}
      <div className={`${theme.btnRadius} border border-amber-300 dark:border-amber-700 p-6 space-y-4`}>
        <h3 className="font-semibold text-lg">Your Performance</h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-3xl font-bold text-green-600 dark:text-green-400">
              {stats.correctCount}
            </div>
            <div className="text-sm opacity-70">Correct</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-red-600 dark:text-red-400">
              {stats.wrongCount}
            </div>
            <div className="text-sm opacity-70">Incorrect</div>
          </div>
        </div>

        <div className="pt-4 border-t border-amber-300 dark:border-amber-700 space-y-2">
          <div className="text-2xl font-bold">
            {stats.accuracy}% accuracy
          </div>
          <div className="text-sm opacity-70">
            Scientists: {baselineAccuracy}%
          </div>

          {beatBaseline ? (
            <div className={`mt-3 p-3 rounded ${theme.key === 'retroDark' ? 'bg-amber-900/30' : 'bg-amber-100'}`}>
              <div className="text-lg font-semibold">
                🔥 You beat the baseline by {Math.abs(delta)}%!
              </div>
            </div>
          ) : delta < 0 ? (
            <div className="text-sm opacity-70 mt-2">
              Scientists were {Math.abs(delta)}% more accurate
            </div>
          ) : (
            <div className="text-sm opacity-70 mt-2">
              Tied with scientists!
            </div>
          )}
        </div>
      </div>

      {/* Action button */}
      <Button theme={theme} onClick={onSwitchDeck} className="w-full">
        Switch Deck
      </Button>
    </motion.div>
  );
};

interface PredictionCardProps {
  theme: Theme;
  allCards: PredictionCardType[];
  selectedDeck?: string | null;
  deckCounts?: { deck: string; count: number }[];
  onAnswered?: () => void;
  onNext?: () => void;
  onSwitchDeck?: (deck: string) => void;
}

const PredictionCard: React.FC<PredictionCardProps> = ({ theme, allCards, selectedDeck = null, deckCounts = [], onAnswered, onNext, onSwitchDeck }) => {
  const { state, setState, sample, answer, next, share, addTrail } = useCardDemo(allCards, selectedDeck);

  const baseRate = getDeckBaseRate(allCards, selectedDeck);
  const playerAccuracy = state.cardsPlayed > 0
    ? Math.round((state.totalCorrect / state.cardsPlayed) * 100)
    : 0;
  
  const onYes = (e: React.MouseEvent<HTMLButtonElement>) => {
    addTrail(e);
    answer('Yes');
    onAnswered?.();
  };
  
  const onNo = (e: React.MouseEvent<HTMLButtonElement>) => {
    addTrail(e);
    answer('No');
    onAnswered?.();
  };
  
  const handleNext = () => {
    next();
    onNext?.();
  };

  const streakHot = state.streak >= 3;

  // Helper to compute deck completion stats
  const getCompletionStats = () => {
    // Get base deck (all cards in selected deck)
    const baseDeck = selectedDeck
      ? allCards.filter(card => card.decks?.includes(selectedDeck))
      : allCards;

    // Use current state stats (works for both authenticated and anonymous users)
    const correctCount = state.totalCorrect;
    const wrongCount = state.totalWrong;
    const totalAnswered = state.cardsPlayed;
    const accuracy = totalAnswered > 0
      ? Math.round((correctCount / totalAnswered) * 100)
      : 0;

    return {
      totalCards: baseDeck.length,
      answeredCount: totalAnswered,
      correctCount,
      wrongCount,
      accuracy,
    };
  };

  // Keyboard shortcuts for desktop users
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      // Question phase: Y/N shortcuts
      if (state.phase === 'question') {
        if (e.key === 'y' || e.key === 'Y' || e.key === 'ArrowLeft') {
          e.preventDefault();
          answer('Yes');
          onAnswered?.();
        } else if (e.key === 'n' || e.key === 'N' || e.key === 'ArrowRight') {
          e.preventDefault();
          answer('No');
          onAnswered?.();
        }
      }

      // Reveal phase: Space to continue
      if (state.phase === 'reveal') {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          handleNext();
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [state.phase, answer, onAnswered, handleNext]);

  // Track deck completion analytics
  useEffect(() => {
    if (state.phase === 'complete') {
      const stats = getCompletionStats();
      trackDeckComplete(
        selectedDeck || 'All',
        stats.totalCards,
        stats.correctCount,
        stats.wrongCount,
        stats.accuracy,
        baseRate
      );
    }
  }, [state.phase]);

  return (
    <div className={`w-full max-w-[390px] sm:max-w-md md:max-w-lg lg:max-w-2xl xl:max-w-4xl mx-auto ${theme.font}`}>
      <div className={`relative ${theme.radius} border ${theme.card} ${streakHot ? theme.glow + ' ring-4' : ''} shadow-lg p-5 overflow-hidden`}>
        {/* Retro CRT scanlines + soft phosphor glow */}
        <div className={`pointer-events-none absolute inset-0 ${theme.scanlines}`} />
        <div className={`pointer-events-none absolute inset-0 ${theme.phosphor}`} />

        {/* Gradient flash / emoji burst / score pop */}
        <AnimatePresence>
          {state.flash && <GradientFlash colorA={state.flash.a} colorB={state.flash.b} />}
        </AnimatePresence>
        <EmojiBurst trigger={state.celebrate} />
        <ScorePop 
          show={state.pop} 
          text={state.streak > 1 ? `+1  x${state.streak}` : '+1'} 
          theme={theme} 
        />

        {/* Streak bar */}
        <div className="absolute left-0 top-0 h-1 w-full overflow-hidden">
          <motion.div
            className={`h-full ${theme.key === 'retroDark' ? 'bg-amber-400' : 'bg-amber-500'}`}
            initial={false}
            animate={{ width: `${Math.min(state.streak, 10) * 10}%` }}
            transition={{ type: 'spring', stiffness: 120, damping: 18 }}
          />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between text-xs sm:text-sm opacity-70">
          <div className="inline-flex items-center gap-2">
            <span>Scientist: {baseRate}%</span>
            <span>
              {state.cardsPlayed >= 10
                ? `You: ${playerAccuracy}%`
                : `You: (do ${10 - state.cardsPlayed} cards)%`
              }
            </span>
          </div>
          <div className="inline-flex items-center gap-2">
            {streakHot && <Flame className={`h-4 w-4 ${theme.accent}`} />}
            {state.cardsPlayed > 0 && (
              <div className="inline-flex items-center gap-3">
                <span className="inline-flex items-center gap-1">
                  <Check className="h-3 w-3 text-green-500" />
                  {state.totalCorrect}
                </span>
                <span className="inline-flex items-center gap-1">
                  <X className="h-3 w-3 text-red-500" />
                  {state.totalWrong}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Question */}
        <div className="mt-3">
          <h1 className={`text-xl sm:text-2xl md:text-3xl lg:text-4xl font-semibold leading-snug ${theme.question}`}>
            {sample.front_details.intervention_fragment}
          </h1>
          <div className="mt-1 text-sm sm:text-base opacity-70">
            {sample.conditions.join(' • ')} • {sample.num_participants} participants
          </div>
          {sample.front_details && <QuestionStyles theme={theme} fragments={sample.front_details} />}
        </div>

        {/* Particle trail container */}
        <div className="relative pointer-events-none">
          <ParticleTrail points={state.trail} />
        </div>

        {/* Answer buttons */}
        {state.phase === 'question' && (
          <div className="mt-5 grid grid-cols-2 gap-3">
            <Button size="lg" theme={theme} onClick={onYes}>
              <span className="inline-flex items-center gap-2">
                Yes
                <kbd className="hidden lg:inline text-xs opacity-60 font-mono">[Y]</kbd>
              </span>
            </Button>
            <Button size="lg" variant="secondary" theme={theme} onClick={onNo}>
              <span className="inline-flex items-center gap-2">
                No
                <kbd className="hidden lg:inline text-xs opacity-60 font-mono">[N]</kbd>
              </span>
            </Button>
          </div>
        )}

        {/* Reveal */}
        {state.phase === 'reveal' && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-5 space-y-3 relative z-10"
          >
            <motion.div
              initial={state.correct ? { scale: 0.9, opacity: 0 } : { x: 0 }}
              animate={state.correct ? { scale: 1, opacity: 1 } : { x: 0 }}
              transition={
                state.correct 
                  ? { type: 'spring', stiffness: 260, damping: 18, duration: 0.4 }
                  : { duration: 0.4 }
              }
              className={`flex items-center gap-2 text-base sm:text-lg font-semibold ${
                state.correct 
                  ? (theme.key === 'retroDark' ? 'text-amber-300' : 'text-amber-600')
                  : 'text-rose-500'
              }`}
            >
              {state.correct ? <Check className="h-5 w-5" /> : <X className="h-5 w-5" />}
              {state.correct ? 'Correct' : 'Incorrect'}
            </motion.div>
            
            {state.correct && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={`inline-flex items-center gap-1 ${
                  theme.key === 'retroDark' ? 'text-amber-300' : 'text-amber-600'
                } font-medium`}
              >
                <Sparkles className="h-4 w-4" /> Sharp call!
              </motion.div>
            )}
            
            <div className="text-[15px] sm:text-base opacity-90">
              The study {sample.success ? 'found' : 'did not find'} a significant effect (p={sample.p_value}).{' '}
              <a
                className="inline-flex items-center gap-1 opacity-70 hover:opacity-90 underline underline-offset-2"
                href={`https://clinicaltrials.gov/study/${sample.study.nct_id}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                NCT link <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            
            <div className="text-sm sm:text-base opacity-70">
              {sample.num_participants} participants in this study.
            </div>
            
            <div className="grid grid-cols-2 gap-3 pt-1">
              <motion.div
                initial={{ scale: 0.96 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.05, duration: 0.2 }}
              >
                <Button
                  variant="secondary"
                  theme={theme}
                  onClick={() => {
                    trackModalOpen('share', sample.card_id);
                    setState((s) => ({ ...s, openShare: true }));
                  }}
                  className="animate-[pulse_1.2s_ease-in-out_1]"
                >
                  <Share2 className="mr-2 h-5 w-5" /> Share
                </Button>
              </motion.div>
              <Button theme={theme} onClick={handleNext}>
                <span className="inline-flex items-center gap-2">
                  Next
                  <kbd className="hidden lg:inline text-xs opacity-60 font-mono">[Space]</kbd>
                </span>
              </Button>
            </div>
            
            <div className="text-xs opacity-60 pt-1">
              <button
                className="inline-flex items-center gap-1 hover:opacity-90"
                onClick={() => {
                  trackModalOpen('report', sample.card_id);
                  setState((s) => ({ ...s, openReport: true }));
                }}
              >
                <Flag className="h-3.5 w-3.5" /> Report an issue
              </button>
            </div>
          </motion.div>
        )}

        {/* Deck Complete */}
        {state.phase === 'complete' && (
          <div className="mt-5 relative z-10">
            <DeckCompletionView
              theme={theme}
              deckName={selectedDeck || 'All'}
              stats={getCompletionStats()}
              baselineAccuracy={baseRate}
              onSwitchDeck={() => setState((s) => ({ ...s, openDeckSelector: true }))}
            />
          </div>
        )}

        {/* Footer */}
        <div className="mt-4 flex items-center justify-between text-xs sm:text-sm opacity-70">
          <button
            onClick={() => {
              trackModalOpen('details', sample.card_id);
              setState((s) => ({ ...s, openDetails: true }));
            }}
            className="hover:opacity-100 inline-flex items-center gap-1"
          >
            Details <ChevronDown className="h-3.5 w-3.5" />
          </button>
          <button className="hover:opacity-100" onClick={() => {
            trackSkip(state.phase, state.cardsPlayed, state.streak);
            handleNext();
          }}>
            Skip
          </button>
        </div>
      </div>

      {/* Sheets */}
      <Sheet
        open={state.openDetails}
        onClose={() => setState((s) => ({ ...s, openDetails: false }))}
        title="Study details"
        theme={theme}
      >
        <div>
          <div className="font-medium">Study Title</div>
          <div className="opacity-80">{sample.study.title}</div>
        </div>
        {sample.study.brief_description && (
          <div>
            <div className="font-medium">Study Description</div>
            <div className="opacity-80 text-sm leading-relaxed">{sample.study.brief_description}</div>
          </div>
        )}
        <div>
          <div className="font-medium">Participants</div>
          <div className="opacity-80">{sample.front_details.intervention_group_fragment} (n={sample.num_participants})</div>
        </div>
        <div>
          <div className="font-medium">Intervention & Comparator</div>
          <div className="opacity-80">{sample.front_details.intervention_fragment} vs {sample.front_details.comparator_group_fragment}</div>
        </div>
        <div>
          <div className="font-medium">Statistical measure</div>
          <div className="opacity-80">
            {state.phase === 'reveal' 
              ? `p-value = ${sample.p_value}, n=${sample.num_participants}`
              : `n=${sample.num_participants} (statistical results shown after answering)`
            }
          </div>
        </div>
        <div>
          <div className="font-medium">Conditions</div>
          <div className="opacity-80">{sample.conditions.join(', ')}</div>
        </div>
        {sample.keywords && sample.keywords.length > 0 && (
          <div>
            <div className="font-medium">Keywords</div>
            <div className="opacity-80">{sample.keywords.join(', ')}</div>
          </div>
        )}
        <div className="pt-2 text-xs opacity-70">
          Source:{' '}
          <a className="underline" href={`https://clinicaltrials.gov/study/${sample.study.nct_id}`} target="_blank" rel="noopener noreferrer">
            {sample.study.nct_id}
          </a>
        </div>
      </Sheet>

      <Sheet
        open={state.openShare}
        onClose={() => setState((s) => ({ ...s, openShare: false }))}
        title="Share this card"
        theme={theme}
      >
        <div className="grid gap-4">
          <div>
            <div className="text-sm opacity-70 mb-2">Share this specific card:</div>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={`${window.location.origin}${window.location.pathname}?card=${sample.card_id}`}
                className={`flex-1 h-10 px-3 ${theme.btnRadius} border border-amber-300 bg-amber-50 dark:bg-amber-950/30 text-sm font-mono`}
                onClick={(e) => e.currentTarget.select()}
              />
              <Button
                theme={theme}
                onClick={() => {
                  const url = `${window.location.origin}${window.location.pathname}?card=${sample.card_id}`;
                  navigator.clipboard.writeText(url);
                  share('card');
                }}
                className="px-4"
              >
                Copy
              </Button>
            </div>
            <div className="text-xs opacity-60 mt-2">
              Your friend will see this exact card and can try to predict the outcome!
            </div>
          </div>
        </div>
      </Sheet>

      <Sheet
        open={state.openReport}
        onClose={() => setState((s) => ({ ...s, openReport: false }))}
        title="Report an issue"
        theme={theme}
      >
        {/* Under Construction Banner */}
        <div className="mb-4 p-3 bg-amber-100 border border-amber-300 rounded text-amber-800 text-sm">
          🚧 <strong>Under Construction</strong> - Issue reporting system coming soon!
        </div>
        
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setState((s) => ({ ...s, openReport: false, toast: "Thanks — we'll review." }));
            setTimeout(() => setState((s) => ({ ...s, toast: '' })), 1400);
          }}
          className="grid gap-3 opacity-50"
        >
          <fieldset className="grid gap-2 text-sm">
            <label className="inline-flex items-center gap-2">
              <input type="radio" name="reason" defaultChecked disabled /> Answer seems wrong
            </label>
            <label className="inline-flex items-center gap-2">
              <input type="radio" name="reason" disabled /> Unclear question
            </label>
            <label className="inline-flex items-center gap-2">
              <input type="radio" name="reason" disabled /> Formatting issue
            </label>
            <label className="inline-flex items-center gap-2">
              <input type="radio" name="reason" disabled /> Sensitive topic
            </label>
          </fieldset>
          <textarea
            placeholder="What looks off? (e.g., wrong timepoint)"
            className={`w-full min-h-[96px] ${theme.btnRadius} border border-amber-300 p-3`}
            disabled
          />
          <div className="flex items-center justify-between">
            <div className="text-xs opacity-70">Auto-attaches card ID {sample.card_id}</div>
            <Button type="submit" theme={theme} disabled>
              Submit
            </Button>
          </div>
        </form>
      </Sheet>

      {/* Deck selector modal */}
      <Sheet
        open={state.openDeckSelector}
        onClose={() => setState((s) => ({ ...s, openDeckSelector: false }))}
        title="Choose a deck"
        theme={theme}
      >
        <div className="space-y-3">
          {deckCounts.map(({ deck, count }) => {
            const isCurrentDeck = deck === selectedDeck;

            return (
              <button
                key={deck}
                onClick={() => {
                  onSwitchDeck?.(deck);
                  setState((s) => ({ ...s, openDeckSelector: false }));
                }}
                className={`w-full p-4 ${theme.btnRadius} border transition-all text-left ${
                  isCurrentDeck
                    ? `${theme.primaryBtn} font-semibold`
                    : `border-amber-300 dark:border-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/20`
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold">{deck}</div>
                    <div className="text-sm opacity-70">{count} cards</div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </Sheet>

      <Toast show={!!state.toast} message={state.toast} theme={theme} />
    </div>
  );
};

export default PredictionCard;