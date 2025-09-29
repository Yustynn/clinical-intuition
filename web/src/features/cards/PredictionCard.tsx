import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Share2, ChevronDown, X, Check, Flag, ExternalLink, Flame, Sparkles } from 'lucide-react';
import { Button, Sheet, Toast } from '../../components/ui';
import { GradientFlash, ScorePop, EmojiBurst, ParticleTrail } from '../../components/ui/Effects';
import QuestionStyles from '../../components/ui/QuestionStyles';
import { useCardDemo } from '../../hooks/useCardDemo';
import type { Theme } from '../../utils/theme';

interface PredictionCardProps {
  theme: Theme;
  onAnswered?: () => void;
  onNext?: () => void;
}

const PredictionCard: React.FC<PredictionCardProps> = ({ theme, onAnswered, onNext }) => {
  const { state, setState, sample, answer, next, share, addTrail } = useCardDemo();
  
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

  return (
    <div className={`w-[390px] max-w-full mx-auto ${theme.font}`}>
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
        <div className="flex items-center justify-between text-xs opacity-70">
          <div className="inline-flex items-center gap-2">
            <span className="inline-flex items-center gap-1">
              PLAY {streakHot && <Flame className={`h-4 w-4 ${theme.accent}`} />}
            </span>
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
          <div>{state.cardsPlayed} played</div>
        </div>

        {/* Question */}
        <div className="mt-3">
          <h1 className={`text-xl font-semibold leading-snug ${theme.question}`}>
            {sample.front_details.intervention_fragment}
          </h1>
          <div className="mt-1 text-sm opacity-70">
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
              Yes
            </Button>
            <Button size="lg" variant="secondary" theme={theme} onClick={onNo}>
              No
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
              className={`flex items-center gap-2 text-base font-semibold ${
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
            
            <div className="text-[15px] opacity-90">
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
            
            <div className="text-sm opacity-70">
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
                  onClick={() => setState((s) => ({ ...s, openShare: true }))}
                  className="animate-[pulse_1.2s_ease-in-out_1]"
                >
                  <Share2 className="mr-2 h-5 w-5" /> Share
                </Button>
              </motion.div>
              <Button theme={theme} onClick={handleNext}>
                Next
              </Button>
            </div>
            
            <div className="text-xs opacity-60 pt-1">
              <button
                className="inline-flex items-center gap-1 hover:opacity-90"
                onClick={() => setState((s) => ({ ...s, openReport: true }))}
              >
                <Flag className="h-3.5 w-3.5" /> Report an issue
              </button>
            </div>
          </motion.div>
        )}

        {/* Footer */}
        <div className="mt-4 flex items-center justify-between text-xs opacity-70">
          <button
            onClick={() => setState((s) => ({ ...s, openDetails: true }))}
            className="hover:opacity-100 inline-flex items-center gap-1"
          >
            Details <ChevronDown className="h-3.5 w-3.5" />
          </button>
          <button className="hover:opacity-100" onClick={handleNext}>
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
        title="Challenge a friend"
        theme={theme}
      >
        <div className="grid gap-3">
          <Button onClick={() => share('card')} theme={theme} className="w-full justify-start">
            Share **this card**
          </Button>
          <Button onClick={() => share('stack')} variant="secondary" theme={theme} className="w-full justify-start">
            Share a **3-card stack**
          </Button>
          <Button onClick={() => share('image')} variant="secondary" theme={theme} className="w-full justify-start">
            Share as **image**
          </Button>
        </div>
      </Sheet>

      <Sheet
        open={state.openReport}
        onClose={() => setState((s) => ({ ...s, openReport: false }))}
        title="Report an issue"
        theme={theme}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setState((s) => ({ ...s, openReport: false, toast: "Thanks — we'll review." }));
            setTimeout(() => setState((s) => ({ ...s, toast: '' })), 1400);
          }}
          className="grid gap-3"
        >
          <fieldset className="grid gap-2 text-sm">
            <label className="inline-flex items-center gap-2">
              <input type="radio" name="reason" defaultChecked /> Answer seems wrong
            </label>
            <label className="inline-flex items-center gap-2">
              <input type="radio" name="reason" /> Unclear question
            </label>
            <label className="inline-flex items-center gap-2">
              <input type="radio" name="reason" /> Formatting issue
            </label>
            <label className="inline-flex items-center gap-2">
              <input type="radio" name="reason" /> Sensitive topic
            </label>
          </fieldset>
          <textarea
            placeholder="What looks off? (e.g., wrong timepoint)"
            className={`w-full min-h-[96px] ${theme.btnRadius} border border-amber-300 p-3`}
          />
          <div className="flex items-center justify-between">
            <div className="text-xs opacity-70">Auto-attaches card ID {sample.card_id}</div>
            <Button type="submit" theme={theme}>
              Submit
            </Button>
          </div>
        </form>
      </Sheet>

      <Toast show={!!state.toast} message={state.toast} theme={theme} />
    </div>
  );
};

export default PredictionCard;