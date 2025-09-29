import { useState } from 'react';
import { useHaptics } from './useHaptics';
import { DEMO_DECK } from '../constants';
import { trackCardAnswered, trackCardCompleted, trackMilestone } from '../utils/analytics';
import type { PredictionCard, GamePhase } from '../types';

interface ParticlePoint {
  id: number;
  x: number;
  y: number;
}

interface CardDemoState {
  idx: number;
  phase: GamePhase;
  guess: 'Yes' | 'No' | null;
  correct: boolean | null;
  openDetails: boolean;
  openShare: boolean;
  openReport: boolean;
  toast: string;
  flash: { a: string; b: string } | null;
  streak: number;
  pop: boolean;
  celebrate: boolean;
  trail: ParticlePoint[];
  totalCorrect: number;
  totalWrong: number;
  cardsPlayed: number;
}

export function useCardDemo() {
  const [state, setState] = useState<CardDemoState>({
    idx: 0,
    phase: 'question',
    guess: null,
    correct: null,
    openDetails: false,
    openShare: false,
    openReport: false,
    toast: '',
    flash: null,
    streak: 0,
    pop: false,
    celebrate: false,
    trail: [],
    totalCorrect: 0,
    totalWrong: 0,
    cardsPlayed: 0,
  });

  const sample: PredictionCard = DEMO_DECK[state.idx];
  const haptics = useHaptics();

  const answer = (choice: 'Yes' | 'No') => {
    const correctAnswer = sample.success ? 'Yes' : 'No';
    const isCorrect = choice === correctAnswer;
    const newCardsPlayed = state.cardsPlayed + 1;
    
    // Track the answer
    trackCardAnswered(choice.toLowerCase() as 'yes' | 'no', isCorrect, newCardsPlayed);
    
    setState((s) => ({
      ...s,
      phase: 'reveal',
      guess: choice,
      correct: isCorrect,
      flash: isCorrect 
        ? { a: '#FBBF24', b: '#F59E0B' } 
        : { a: '#FB7185', b: '#E11D48' },
      streak: isCorrect ? s.streak + 1 : 0,
      pop: isCorrect,
      celebrate: isCorrect,
      totalCorrect: isCorrect ? s.totalCorrect + 1 : s.totalCorrect,
      totalWrong: !isCorrect ? s.totalWrong + 1 : s.totalWrong,
      cardsPlayed: newCardsPlayed,
    }));
    
    haptics(isCorrect ? 30 : [40, 60, 40]);
    
    setTimeout(() => setState((s) => ({ ...s, pop: false })), 600);
    setTimeout(() => setState((s) => ({ ...s, celebrate: false })), 1100);
  };

  const next = () => {
    setState((s) => {
      // Track card completion
      trackCardCompleted(s.cardsPlayed, s.streak, s.totalCorrect, s.totalWrong);
      
      // Track milestones every 5 cards
      if (s.cardsPlayed > 0 && s.cardsPlayed % 5 === 0) {
        trackMilestone(s.cardsPlayed, s.totalCorrect, s.totalWrong);
      }
      
      return {
        ...s,
        idx: (s.idx + 1) % DEMO_DECK.length,
        phase: 'question',
        guess: null,
        correct: null,
        flash: null,
        pop: false,
        celebrate: false,
        trail: [],
      };
    });
  };

  const share = (mode: 'card' | 'stack' | 'image') => {
    setState((s) => ({ 
      ...s, 
      openShare: false, 
      toast: mode === 'image' ? 'Image saved' : 'Link copied' 
    }));
    setTimeout(() => setState((s) => ({ ...s, toast: '' })), 1400);
  };

  const addTrail = (e: React.MouseEvent<HTMLButtonElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    const id = Math.random();
    setState((s) => ({ ...s, trail: [...s.trail, { id, x, y }] }));
    setTimeout(() => setState((s) => ({ 
      ...s, 
      trail: s.trail.filter((t) => t.id !== id) 
    })), 500);
  };

  return { 
    state, 
    setState, 
    sample, 
    answer, 
    next, 
    share, 
    addTrail 
  };
}