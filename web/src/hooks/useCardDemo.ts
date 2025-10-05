import { useState, useEffect } from 'react';
import { useHaptics } from './useHaptics';
import { useAuth } from './useAuth';
import { useSyncStats } from './useSyncStats';
import { getInitialDeck, getFilteredDeck, STORAGE_KEYS } from '../constants';
import { trackCardAnswered, trackCardCompleted, trackMilestone } from '../utils/analytics';
import { upsertDeckStats, saveCardAnswer } from '../lib/supabaseService';
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

// Load card answers from localStorage
function loadCardAnswers(): Array<{
  card_id: string;
  deck_name: string;
  answer: 'Yes' | 'No';
  correct: boolean;
  timestamp: string;
}> {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.CARD_ANSWERS);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

// Save card answer to localStorage
function saveCardAnswerToLocal(answer: {
  card_id: string;
  deck_name: string;
  answer: 'Yes' | 'No';
  correct: boolean;
}) {
  try {
    const answers = loadCardAnswers();
    answers.push({
      ...answer,
      timestamp: new Date().toISOString(),
    });
    localStorage.setItem(STORAGE_KEYS.CARD_ANSWERS, JSON.stringify(answers));
  } catch {
    // Silently fail if localStorage is not available
  }
}

// Load answered card IDs from localStorage
function loadAnsweredCardIds(): Set<string> {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.ANSWERED_CARD_IDS);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch {
    return new Set();
  }
}

// Save answered card IDs to localStorage
function saveAnsweredCardIds(ids: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEYS.ANSWERED_CARD_IDS, JSON.stringify(Array.from(ids)));
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
  answeredCardIds: Set<string>;
}

export function useCardDemo(allCards: PredictionCard[], selectedDeck: string | null = null, selectedCardId: string | null = null) {
  const { user } = useAuth();
  const { syncedStats, syncedAnsweredCardIds } = useSyncStats(); // Sync stats when user signs in
  const deckKey = selectedDeck || 'All';

  const [state, setState] = useState<CardDemoState>(() => {
    const savedStats = loadDeckStats();
    const currentStats = savedStats[deckKey] || {
      totalCorrect: 0,
      totalWrong: 0,
      cardsPlayed: 0,
    };
    const answeredCardIds = loadAnsweredCardIds();

    // Filter deck to exclude answered cards
    const baseDeck = selectedDeck ? getFilteredDeck(allCards, selectedDeck) : getInitialDeck(allCards);
    const filteredDeck = baseDeck.filter(card => !answeredCardIds.has(card.card_id));

    // If a specific card is selected, find its index
    let initialIdx = 0;
    if (selectedCardId) {
      const cardIdx = baseDeck.findIndex(card => card.card_id === selectedCardId);
      if (cardIdx !== -1) {
        initialIdx = cardIdx;
      }
    }

    return {
      idx: initialIdx,
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
      deck: filteredDeck.length > 0 ? filteredDeck : baseDeck,
      deckStats: savedStats,
      currentDeckKey: deckKey,
      answeredCardIds,
    };
  });

  // Update state when sync completes
  useEffect(() => {
    if (syncedStats) {
      setState((s) => {
        const stats = syncedStats[s.currentDeckKey] || {
          totalCorrect: 0,
          totalWrong: 0,
          cardsPlayed: 0,
        };

        // Merge answered card IDs (use synced if available, otherwise keep local)
        const mergedAnsweredCardIds = syncedAnsweredCardIds.size > 0
          ? syncedAnsweredCardIds
          : s.answeredCardIds;

        // Filter deck to exclude answered cards
        const baseDeck = selectedDeck ? getFilteredDeck(allCards, selectedDeck) : getInitialDeck(allCards);
        const filteredDeck = baseDeck.filter(card => !mergedAnsweredCardIds.has(card.card_id));

        // Save synced answered card IDs to localStorage
        if (syncedAnsweredCardIds.size > 0) {
          saveAnsweredCardIds(syncedAnsweredCardIds);
        }

        return {
          ...s,
          deck: filteredDeck.length > 0 ? filteredDeck : baseDeck,
          deckStats: syncedStats,
          answeredCardIds: mergedAnsweredCardIds,
          totalCorrect: stats.totalCorrect,
          totalWrong: stats.totalWrong,
          cardsPlayed: stats.cardsPlayed,
          idx: 0,
          phase: 'question',
          guess: null,
          correct: null,
        };
      });
    }
  }, [syncedStats, syncedAnsweredCardIds, selectedDeck, allCards]);

  // Update deck when selectedDeck changes
  useEffect(() => {
    const newDeckKey = selectedDeck || 'All';
    const baseDeck = selectedDeck ? getFilteredDeck(allCards, selectedDeck) : getInitialDeck(allCards);
    const filteredDeck = baseDeck.filter(card => !state.answeredCardIds.has(card.card_id));

    setState((s) => {
      // Get stats for this deck, or initialize if not present
      const stats = s.deckStats[newDeckKey] || {
        totalCorrect: 0,
        totalWrong: 0,
        cardsPlayed: 0,
      };

      return {
        ...s,
        deck: filteredDeck.length > 0 ? filteredDeck : baseDeck,
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

  const answer = async (choice: 'Yes' | 'No') => {
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

      // Save to localStorage (always)
      saveDeckStats(updatedDeckStats);

      // Save card answer to localStorage (always, even for anonymous users)
      saveCardAnswerToLocal({
        card_id: sample.card_id,
        deck_name: s.currentDeckKey,
        answer: choice,
        correct: isCorrect,
      });

      // Track answered card ID
      const newAnsweredCardIds = new Set(s.answeredCardIds);
      newAnsweredCardIds.add(sample.card_id);
      saveAnsweredCardIds(newAnsweredCardIds);

      // Save to Supabase if user is signed in (async, don't block UI)
      if (user) {
        const deckStats = updatedDeckStats[s.currentDeckKey];

        // Save deck stats
        upsertDeckStats(user.id, s.currentDeckKey, deckStats).catch((err) => {
          console.error('Failed to sync deck stats to Supabase:', err);
        });

        // Save individual card answer
        saveCardAnswer(user.id, {
          card_id: sample.card_id,
          deck_name: s.currentDeckKey,
          answer: choice,
          correct: isCorrect,
        }).catch((err) => {
          console.error('Failed to save card answer to Supabase:', err);
        });
      }

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
        answeredCardIds: newAnsweredCardIds,
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

      // Find next unanswered card index
      let nextIdx = (s.idx + 1) % s.deck.length;
      let attempts = 0;
      while (s.answeredCardIds.has(s.deck[nextIdx]?.card_id) && attempts < s.deck.length) {
        nextIdx = (nextIdx + 1) % s.deck.length;
        attempts++;
      }

      return {
        ...s,
        idx: nextIdx,
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