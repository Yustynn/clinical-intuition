import { useState, useEffect } from 'react';
import { useHaptics } from './useHaptics';
import { getInitialDeck, getFilteredDeck, STORAGE_KEYS } from '../constants';
import { trackCardAnswered, trackCardCompleted, trackMilestone } from '../utils/analytics';
import type { PredictionCard, GamePhase } from '../types';

// Load deck stats from localStorage
function loadDeckStats(): Record<string, DeckStats> {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.DECK_STATS);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

// Save deck stats to localStorage
function saveDeckStats(stats: Record<string, DeckStats>) {
  try {
    localStorage.setItem(STORAGE_KEYS.DECK_STATS, JSON.stringify(stats));
  } catch {
    // Silently fail if localStorage is not available
  }
}

interface ParticlePoint {
  id: number;
  x: number;
  y: number;
}

interface DeckStats {
  totalCorrect: number;
  totalWrong: number;
  cardsPlayed: number;
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
  deck: PredictionCard[];
  deckStats: Record<string, DeckStats>;
  currentDeckKey: string;
}

export function useCardDemo(allCards: PredictionCard[], selectedDeck: string | null = null) {
  const deckKey = selectedDeck || 'All';

  const [state, setState] = useState<CardDemoState>(() => {
    const savedStats = loadDeckStats();
    const currentStats = savedStats[deckKey] || {
      totalCorrect: 0,
      totalWrong: 0,
      cardsPlayed: 0,
    };

    return {
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
      totalCorrect: currentStats.totalCorrect,
      totalWrong: currentStats.totalWrong,
      cardsPlayed: currentStats.cardsPlayed,
      deck: selectedDeck ? getFilteredDeck(allCards, selectedDeck) : getInitialDeck(allCards),
      deckStats: savedStats,
      currentDeckKey: deckKey,
    };
  });

  // Update deck when selectedDeck changes
  useEffect(() => {
    const newDeckKey = selectedDeck || 'All';
    const newDeck = selectedDeck ? getFilteredDeck(allCards, selectedDeck) : getInitialDeck(allCards);

    setState((s) => {
      // Get stats for this deck, or initialize if not present
      const stats = s.deckStats[newDeckKey] || {
        totalCorrect: 0,
        totalWrong: 0,
        cardsPlayed: 0,
      };

      return {
        ...s,
        deck: newDeck,
        currentDeckKey: newDeckKey,
        idx: 0,
        phase: 'question',
        guess: null,
        correct: null,
        flash: null,
        pop: false,
        celebrate: false,
        trail: [],
        totalCorrect: stats.totalCorrect,
        totalWrong: stats.totalWrong,
        cardsPlayed: stats.cardsPlayed,
      };
    });
  }, [selectedDeck, allCards]);

  const sample: PredictionCard = state.deck[state.idx] || allCards[0];
  const haptics = useHaptics();

  const answer = (choice: 'Yes' | 'No') => {
    const correctAnswer = sample.success ? 'Yes' : 'No';
    const isCorrect = choice === correctAnswer;
    const newCardsPlayed = state.cardsPlayed + 1;

    // Track the answer
    trackCardAnswered(choice.toLowerCase() as 'yes' | 'no', isCorrect, newCardsPlayed);

    setState((s) => {
      const newTotalCorrect = isCorrect ? s.totalCorrect + 1 : s.totalCorrect;
      const newTotalWrong = !isCorrect ? s.totalWrong + 1 : s.totalWrong;

      // Update stats for current deck
      const updatedDeckStats = {
        ...s.deckStats,
        [s.currentDeckKey]: {
          totalCorrect: newTotalCorrect,
          totalWrong: newTotalWrong,
          cardsPlayed: newCardsPlayed,
        },
      };

      // Save to localStorage
      saveDeckStats(updatedDeckStats);

      return {
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
        totalCorrect: newTotalCorrect,
        totalWrong: newTotalWrong,
        cardsPlayed: newCardsPlayed,
        deckStats: updatedDeckStats,
      };
    });

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
        idx: (s.idx + 1) % s.deck.length,
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