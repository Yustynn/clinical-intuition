export const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || '/api';

export const STORAGE_KEYS = {
  ANONYMOUS_SESSION: 'anonymous_session_data',
  THEME: 'retro_theme_mode',
  USER_PREFERENCES: 'user_preferences',
  DECK_STATS: 'deck_stats',
  CARD_ANSWERS: 'card_answers',
  ANSWERED_CARD_IDS: 'answered_card_ids',
} as const;

export const HAPTIC_PATTERNS = {
  SUCCESS: 30,
  ERROR: [40, 60, 40],
  LIGHT_TAP: 10,
} as const;

import type { PredictionCard } from '../types';

// Fisher-Yates shuffle algorithm
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function getInitialDeck(allCards: PredictionCard[]): PredictionCard[] {
  return shuffleArray([...allCards]);
}

// Get all unique decks with counts
export function getDeckCounts(allCards: PredictionCard[]): { deck: string; count: number }[] {
  const deckMap = new Map<string, number>();

  allCards.forEach(card => {
    if (card.decks && Array.isArray(card.decks)) {
      card.decks.forEach(deck => {
        deckMap.set(deck, (deckMap.get(deck) || 0) + 1);
      });
    }
  });

  return Array.from(deckMap.entries())
    .map(([deck, count]) => ({ deck, count }))
    .sort((a, b) => a.deck.localeCompare(b.deck));
}

export function getFilteredDeck(allCards: PredictionCard[], deckName: string | null): PredictionCard[] {
  if (!deckName || deckName === 'All') {
    return shuffleArray([...allCards]);
  }

  const filtered = allCards.filter(card =>
    card.decks && Array.isArray(card.decks) && card.decks.includes(deckName)
  );

  return shuffleArray(filtered);
}

export function getDeckBaseRate(allCards: PredictionCard[], deckName: string | null): number {
  let cards: PredictionCard[];

  if (!deckName || deckName === 'All') {
    cards = allCards;
  } else {
    cards = allCards.filter(card =>
      card.decks && Array.isArray(card.decks) && card.decks.includes(deckName)
    );
  }

  if (cards.length === 0) return 0;

  const successCount = cards.filter(card => card.success).length;
  return Math.round((successCount / cards.length) * 100);
}