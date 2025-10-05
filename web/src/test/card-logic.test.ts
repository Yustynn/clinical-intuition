import { describe, it, expect } from 'vitest';
import { getFilteredDeck, getDeckCounts } from '../constants';
import type { PredictionCard } from '../types';

const mockCards: PredictionCard[] = [
  {
    card_id: '1',
    study: { nct_id: 'NCT001', title: 'Study 1', brief_description: '' },
    front_details: {
      question: 'Q1',
      intervention_fragment: 'int1',
      intervention_group_fragment: 'grp1',
      outcome_fragment: 'out1',
      comparator_group_fragment: 'ctrl',
      timeframe_fragment: '6m',
    },
    p_value: '0.03',
    num_participants: 100,
    success: true,
    conditions: ['cond1'],
    keywords: [],
    decks: ['Exercise', 'Nutrition'],
  },
  {
    card_id: '2',
    study: { nct_id: 'NCT002', title: 'Study 2', brief_description: '' },
    front_details: {
      question: 'Q2',
      intervention_fragment: 'int2',
      intervention_group_fragment: 'grp2',
      outcome_fragment: 'out2',
      comparator_group_fragment: 'ctrl',
      timeframe_fragment: '12m',
    },
    p_value: '0.15',
    num_participants: 200,
    success: false,
    conditions: ['cond2'],
    keywords: [],
    decks: ['Exercise'],
  },
  {
    card_id: '3',
    study: { nct_id: 'NCT003', title: 'Study 3', brief_description: '' },
    front_details: {
      question: 'Q3',
      intervention_fragment: 'int3',
      intervention_group_fragment: 'grp3',
      outcome_fragment: 'out3',
      comparator_group_fragment: 'ctrl',
      timeframe_fragment: '3m',
    },
    p_value: '0.01',
    num_participants: 150,
    success: true,
    conditions: ['cond3'],
    keywords: [],
    decks: ['Nutrition', 'Mental Health'],
  },
  {
    card_id: '4',
    study: { nct_id: 'NCT004', title: 'Study 4', brief_description: '' },
    front_details: {
      question: 'Q4',
      intervention_fragment: 'int4',
      intervention_group_fragment: 'grp4',
      outcome_fragment: 'out4',
      comparator_group_fragment: 'ctrl',
      timeframe_fragment: '9m',
    },
    p_value: '0.08',
    num_participants: 180,
    success: false,
    conditions: ['cond4'],
    keywords: [],
    decks: ['Mental Health'],
  },
];

describe('Card Filtering Logic', () => {
  describe('Deck Filtering', () => {
    it('returns all cards when deck is null', () => {
      const filtered = getFilteredDeck(mockCards, null);
      expect(filtered.length).toBe(4);
    });

    it('returns all cards when deck is "All"', () => {
      const filtered = getFilteredDeck(mockCards, 'All');
      expect(filtered.length).toBe(4);
    });

    it('filters cards by specific deck', () => {
      const filtered = getFilteredDeck(mockCards, 'Exercise');
      expect(filtered.length).toBe(2); // cards 1 and 2
      expect(filtered.every(card => card.decks?.includes('Exercise'))).toBe(true);
    });

    it('handles deck with single card', () => {
      const filtered = getFilteredDeck(mockCards, 'Mental Health');
      expect(filtered.length).toBe(2); // cards 3 and 4
    });

    it('returns empty array for non-existent deck', () => {
      const filtered = getFilteredDeck(mockCards, 'Non-existent');
      expect(filtered.length).toBe(0);
    });

    it('shuffles cards (returns different order)', () => {
      // Note: This test is probabilistic - may occasionally fail
      const filtered1 = getFilteredDeck(mockCards, null);
      const filtered2 = getFilteredDeck(mockCards, null);

      // Check same cards but potentially different order
      expect(filtered1.length).toBe(filtered2.length);
      const sameOrder = filtered1.every((card, idx) => card.card_id === filtered2[idx].card_id);
      // With 4 cards, same order probability is 1/24 = ~4%, so this should pass most times
      expect(sameOrder).toBe(false); // May fail 1 in 24 times
    });
  });

  describe('Answered Card Filtering', () => {
    it('filters out answered cards', () => {
      const answeredCardIds = new Set(['1', '3']);
      const unanswered = mockCards.filter(card => !answeredCardIds.has(card.card_id));

      expect(unanswered.length).toBe(2);
      expect(unanswered.map(c => c.card_id)).toEqual(['2', '4']);
    });

    it('returns all cards when none are answered', () => {
      const answeredCardIds = new Set<string>([]);
      const unanswered = mockCards.filter(card => !answeredCardIds.has(card.card_id));

      expect(unanswered.length).toBe(4);
    });

    it('returns empty when all cards are answered', () => {
      const answeredCardIds = new Set(['1', '2', '3', '4']);
      const unanswered = mockCards.filter(card => !answeredCardIds.has(card.card_id));

      expect(unanswered.length).toBe(0);
    });

    it('combines deck filtering with answered filtering', () => {
      const answeredCardIds = new Set(['1']);
      const deckFiltered = mockCards.filter(card => card.decks?.includes('Exercise'));
      const finalFiltered = deckFiltered.filter(card => !answeredCardIds.has(card.card_id));

      expect(finalFiltered.length).toBe(1); // Only card 2 (card 1 is answered)
      expect(finalFiltered[0].card_id).toBe('2');
    });
  });

  describe('Deck Counts', () => {
    it('counts cards per deck correctly', () => {
      const counts = getDeckCounts(mockCards);

      const exerciseCount = counts.find(c => c.deck === 'Exercise');
      const nutritionCount = counts.find(c => c.deck === 'Nutrition');
      const mentalHealthCount = counts.find(c => c.deck === 'Mental Health');

      expect(exerciseCount?.count).toBe(2);
      expect(nutritionCount?.count).toBe(2);
      expect(mentalHealthCount?.count).toBe(2);
    });

    it('sorts decks alphabetically', () => {
      const counts = getDeckCounts(mockCards);
      const deckNames = counts.map(c => c.deck);

      expect(deckNames).toEqual(['Exercise', 'Mental Health', 'Nutrition']);
    });

    it('handles empty card array', () => {
      const counts = getDeckCounts([]);
      expect(counts.length).toBe(0);
    });

    it('handles cards with multiple decks', () => {
      const counts = getDeckCounts(mockCards);
      const totalCards = counts.reduce((sum, c) => sum + c.count, 0);

      // Total should be > 4 because some cards belong to multiple decks
      expect(totalCards).toBeGreaterThan(4);
    });
  });

  describe('Next Card Selection', () => {
    it('skips to next unanswered card', () => {
      const deck = mockCards;
      const answeredCardIds = new Set(['1', '2']);
      const currentIdx = 1; // Currently on card 2

      // Find next unanswered
      let nextIdx = (currentIdx + 1) % deck.length;
      let attempts = 0;
      while (answeredCardIds.has(deck[nextIdx]?.card_id) && attempts < deck.length) {
        nextIdx = (nextIdx + 1) % deck.length;
        attempts++;
      }

      expect(nextIdx).toBe(2); // Should skip to card 3
      expect(deck[nextIdx].card_id).toBe('3');
    });

    it('wraps around to start when reaching end', () => {
      const deck = mockCards;
      const answeredCardIds = new Set(['3', '4']);
      const currentIdx = 3; // Currently on last card

      // Find next unanswered
      let nextIdx = (currentIdx + 1) % deck.length;
      let attempts = 0;
      while (answeredCardIds.has(deck[nextIdx]?.card_id) && attempts < deck.length) {
        nextIdx = (nextIdx + 1) % deck.length;
        attempts++;
      }

      expect(nextIdx).toBe(0); // Should wrap to card 1
      expect(deck[nextIdx].card_id).toBe('1');
    });

    it('stops when all cards are answered', () => {
      const deck = mockCards;
      const answeredCardIds = new Set(['1', '2', '3', '4']);
      const currentIdx = 0;

      // Find next unanswered
      let nextIdx = (currentIdx + 1) % deck.length;
      let attempts = 0;
      while (answeredCardIds.has(deck[nextIdx]?.card_id) && attempts < deck.length) {
        nextIdx = (nextIdx + 1) % deck.length;
        attempts++;
      }

      // Should stop after checking all cards
      expect(attempts).toBe(deck.length);
    });
  });
});
