export const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || '/api';

export const STORAGE_KEYS = {
  ANONYMOUS_SESSION: 'anonymous_session_data',
  THEME: 'retro_theme_mode',
  USER_PREFERENCES: 'user_preferences',
} as const;

export const HAPTIC_PATTERNS = {
  SUCCESS: 30,
  ERROR: [40, 60, 40],
  LIGHT_TAP: 10,
} as const;

import type { PredictionCard } from '../types';
import cardsData from '../../cards.json';

// Fisher-Yates shuffle algorithm
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export const ALL_CARDS: PredictionCard[] = cardsData as PredictionCard[];
export const DEMO_DECK: PredictionCard[] = shuffleArray([...ALL_CARDS]);

// Get all unique decks with counts
export function getDeckCounts(): { deck: string; count: number }[] {
  const deckMap = new Map<string, number>();

  ALL_CARDS.forEach(card => {
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

export function getFilteredDeck(deckName: string | null): PredictionCard[] {
  if (!deckName || deckName === 'All') {
    return shuffleArray([...ALL_CARDS]);
  }

  const filtered = ALL_CARDS.filter(card =>
    card.decks && Array.isArray(card.decks) && card.decks.includes(deckName)
  );

  return shuffleArray(filtered);
}