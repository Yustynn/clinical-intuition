import { useState, useEffect, useRef } from 'react';
import { useHaptics } from './useHaptics';
import { useAuth } from './useAuth';
import { useSyncStats } from './useSyncStats';
import { getInitialDeck, getFilteredDeck, STORAGE_KEYS } from '../constants';
import { trackCardAnswered, trackCardCompleted, trackMilestone, trackCardTime, trackSessionDuration } from '../utils/analytics';
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

export function useCardDemo(allCards: PredictionCard[], selectedDeck: string | null = null) {
  const { user } = useAuth();
  const { syncedStats, syncedAnsweredCardIds } = useSyncStats(); // Sync stats when user signs in
  const deckKey = selectedDeck || 'All';

  // Store shared card ID in ref so it persists even after URL cleanup
  const sharedCardIdRef = useRef<string | null>(null);

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
    const finalDeck = filteredDeck.length > 0 ? filteredDeck : baseDeck;

    // Check if there's a card ID in the URL
    const urlParams = new URLSearchParams(window.location.search);
    const sharedCardId = urlParams.get('card');
    let initialIdx = 0;

    // Store shared card ID in ref for later use
    if (sharedCardId) {
      sharedCardIdRef.current = sharedCardId;
    }

    console.log('🔍 Initializing deck:', {
      url: window.location.href,
      search: window.location.search,
      sharedCardId,
      deckSize: finalDeck.length,
      selectedDeck: selectedDeck || 'All',
    });

    if (sharedCardId) {
      // Find the card in the deck
      const cardIndex = finalDeck.findIndex(card => card.card_id === sharedCardId);
      if (cardIndex !== -1) {
        initialIdx = cardIndex;
        console.log('✅ Found shared card:', sharedCardId, 'at index', cardIndex);
      } else {
        console.log('❌ Shared card NOT found in deck:', sharedCardId);
        console.log('Available cards:', finalDeck.map(c => c.card_id).slice(0, 10));
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
      deck: finalDeck,
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
        const newDeck = filteredDeck.length > 0 ? filteredDeck : baseDeck;

        // Preserve current card if possible
        const currentCard = s.deck[s.idx];
        let newIdx = 0;
        if (currentCard) {
          const foundIdx = newDeck.findIndex(card => card.card_id === currentCard.card_id);
          if (foundIdx !== -1) {
            newIdx = foundIdx;
            console.log('🔄 Sync: Preserving current card at new index', foundIdx);
          } else {
            console.log('⚠️ Sync: Current card not in new deck, resetting to 0');
          }
        }

        // Save synced answered card IDs to localStorage
        if (syncedAnsweredCardIds.size > 0) {
          saveAnsweredCardIds(syncedAnsweredCardIds);
        }

        return {
          ...s,
          deck: newDeck,
          deckStats: syncedStats,
          answeredCardIds: mergedAnsweredCardIds,
          totalCorrect: stats.totalCorrect,
          totalWrong: stats.totalWrong,
          cardsPlayed: stats.cardsPlayed,
          idx: newIdx,
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

    // Use ref instead of URL (persists after cleanup)
    const sharedCardId = sharedCardIdRef.current;

    console.log('🔄 Deck change effect:', {
      oldDeck: state.currentDeckKey,
      newDeck: newDeckKey,
      currentIdx: state.idx,
      sharedCardId,
    });

    setState((s) => {
      // Get stats for this deck, or initialize if not present
      const stats = s.deckStats[newDeckKey] || {
        totalCorrect: 0,
        totalWrong: 0,
        cardsPlayed: 0,
      };

      const newDeck = filteredDeck.length > 0 ? filteredDeck : baseDeck;
      let newIdx = 0;

      // If there's a shared card, preserve it instead of resetting to 0
      if (sharedCardId) {
        const cardIndex = newDeck.findIndex(card => card.card_id === sharedCardId);
        if (cardIndex !== -1) {
          newIdx = cardIndex;
          console.log('✅ Deck change: Preserving shared card at index', cardIndex);
        } else {
          console.log('⚠️ Deck change: Shared card not found, resetting to 0');
        }
      } else if (s.currentDeckKey === newDeckKey) {
        // Same deck, preserve current card
        const currentCard = s.deck[s.idx];
        if (currentCard) {
          const foundIdx = newDeck.findIndex(card => card.card_id === currentCard.card_id);
          if (foundIdx !== -1) {
            newIdx = foundIdx;
            console.log('✅ Deck change: Preserving current card at index', foundIdx);
          }
        }
      } else {
        console.log('🔄 Deck change: New deck selected, resetting to 0');
      }

      return {
        ...s,
        deck: newDeck,
        currentDeckKey: newDeckKey,
        idx: newIdx,
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

  // Time tracking
  const cardStartTimeRef = useRef<number>(Date.now());
  const sessionStartTimeRef = useRef<number>(Date.now());

  // Reset card timer when card changes
  useEffect(() => {
    cardStartTimeRef.current = Date.now();
  }, [state.idx, state.phase]);

  // Clean up URL after loading shared card
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('card')) {
      // Remove the card parameter from URL without reloading
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, []);

  const answer = async (choice: 'Yes' | 'No') => {
    const answerId = Math.random().toString(36).substring(7);
    console.log(`🎯 [${answerId}] answer() called:`, {
      cardId: sample.card_id,
      choice,
      phase: state.phase,
      authenticated: !!user,
    });

    const correctAnswer = sample.success ? 'Yes' : 'No';
    const isCorrect = choice === correctAnswer;
    const newCardsPlayed = state.cardsPlayed + 1;

    // Track time spent on this card
    const timeSpent = Date.now() - cardStartTimeRef.current;
    trackCardTime(timeSpent, 'question', true);

    // Track the answer
    trackCardAnswered(choice.toLowerCase() as 'yes' | 'no', isCorrect, newCardsPlayed);

    // Update state first (pure function, no side effects)
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

      // Track answered card ID
      const newAnsweredCardIds = new Set(s.answeredCardIds);
      newAnsweredCardIds.add(sample.card_id);
      saveAnsweredCardIds(newAnsweredCardIds);

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

    // AFTER state update, save to Supabase (side effects outside setState)
    if (user) {
      // For authenticated users, save directly to Supabase (skip localStorage to avoid duplicates)
      console.log(`🔵 [${answerId}] User authenticated, saving to Supabase:`, {
        userId: user.id,
        email: user.email,
        deck: state.currentDeckKey,
        cardId: sample.card_id,
      });

      const deckStats = {
        totalCorrect: isCorrect ? state.totalCorrect + 1 : state.totalCorrect,
        totalWrong: !isCorrect ? state.totalWrong + 1 : state.totalWrong,
        cardsPlayed: newCardsPlayed,
      };

      // Save deck stats
      upsertDeckStats(user.id, state.currentDeckKey, deckStats)
        .then(() => {
          console.log(`✅ [${answerId}] Deck stats saved successfully to Supabase`);
        })
        .catch((err) => {
          console.error(`❌ [${answerId}] Failed to sync deck stats to Supabase:`, err);
          console.error('Full error details:', JSON.stringify(err, null, 2));
        });

      // Save individual card answer
      saveCardAnswer(user.id, {
        card_id: sample.card_id,
        deck_name: state.currentDeckKey,
        answer: choice,
        correct: isCorrect,
      })
        .then(() => {
          console.log(`✅ [${answerId}] Card answer saved successfully to Supabase`);
        })
        .catch((err) => {
          console.error(`❌ [${answerId}] Failed to save card answer to Supabase:`, err);
          console.error('Full error details:', JSON.stringify(err, null, 2));
        });
    } else {
      // For anonymous users, save card answer to localStorage as fallback
      console.log(`⚪ [${answerId}] User not authenticated, saving card answer to localStorage`);
      saveCardAnswerToLocal({
        card_id: sample.card_id,
        deck_name: state.currentDeckKey,
        answer: choice,
        correct: isCorrect,
      });
    }

    haptics(isCorrect ? 30 : [40, 60, 40]);

    setTimeout(() => setState((s) => ({ ...s, pop: false })), 600);
    setTimeout(() => setState((s) => ({ ...s, celebrate: false })), 1100);
  };

  const next = () => {
    setState((s) => {
      // Track time spent in reveal phase
      const timeSpent = Date.now() - cardStartTimeRef.current;
      trackCardTime(timeSpent, 'reveal', s.guess !== null);

      // Track card completion
      trackCardCompleted(s.cardsPlayed, s.streak, s.totalCorrect, s.totalWrong);

      // Track milestones every 5 cards
      if (s.cardsPlayed > 0 && s.cardsPlayed % 5 === 0) {
        trackMilestone(s.cardsPlayed, s.totalCorrect, s.totalWrong);
      }

      // Track session duration every 10 cards
      if (s.cardsPlayed > 0 && s.cardsPlayed % 10 === 0) {
        const sessionDuration = Date.now() - sessionStartTimeRef.current;
        trackSessionDuration(sessionDuration, s.cardsPlayed);
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

  const addTrail = (e?: React.MouseEvent<HTMLButtonElement>) => {
    // Skip trail effect for keyboard events (when e is undefined or missing currentTarget)
    if (!e || !e.currentTarget) {
      return;
    }

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