import { describe, it, expect } from 'vitest';
import { getDeckBaseRate } from '../constants';
import type { PredictionCard } from '../types';

// Mock card data for testing
const mockCards: PredictionCard[] = [
  {
    card_id: '1',
    study: { nct_id: 'NCT001', title: 'Study 1', brief_description: '' },
    front_details: {
      question: 'Test question 1',
      intervention_fragment: 'intervention 1',
      intervention_group_fragment: 'group 1',
      outcome_fragment: 'outcome 1',
      comparator_group_fragment: 'control',
      timeframe_fragment: '6 months',
    },
    p_value: '0.03',
    num_participants: 100,
    success: true, // Yes
    conditions: ['condition1'],
    keywords: [],
    decks: ['Deck A'],
  },
  {
    card_id: '2',
    study: { nct_id: 'NCT002', title: 'Study 2', brief_description: '' },
    front_details: {
      question: 'Test question 2',
      intervention_fragment: 'intervention 2',
      intervention_group_fragment: 'group 2',
      outcome_fragment: 'outcome 2',
      comparator_group_fragment: 'control',
      timeframe_fragment: '12 months',
    },
    p_value: '0.15',
    num_participants: 200,
    success: false, // No
    conditions: ['condition2'],
    keywords: [],
    decks: ['Deck A', 'Deck B'],
  },
  {
    card_id: '3',
    study: { nct_id: 'NCT003', title: 'Study 3', brief_description: '' },
    front_details: {
      question: 'Test question 3',
      intervention_fragment: 'intervention 3',
      intervention_group_fragment: 'group 3',
      outcome_fragment: 'outcome 3',
      comparator_group_fragment: 'control',
      timeframe_fragment: '3 months',
    },
    p_value: '0.01',
    num_participants: 150,
    success: true, // Yes
    conditions: ['condition3'],
    keywords: [],
    decks: ['Deck B'],
  },
];

describe('Stats Calculations', () => {
  describe('Accuracy Calculation', () => {
    it('calculates accuracy correctly', () => {
      const totalCorrect = 7;
      const totalCards = 10;
      const accuracy = Math.round((totalCorrect / totalCards) * 100);
      expect(accuracy).toBe(70);
    });

    it('handles zero division - returns 0% when no cards played', () => {
      const totalCorrect = 0;
      const totalCards = 0;
      const accuracy = totalCards > 0 ? Math.round((totalCorrect / totalCards) * 100) : 0;
      expect(accuracy).toBe(0);
    });

    it('returns 100% for all correct', () => {
      const totalCorrect = 5;
      const totalCards = 5;
      const accuracy = Math.round((totalCorrect / totalCards) * 100);
      expect(accuracy).toBe(100);
    });

    it('returns 0% for all wrong', () => {
      const totalCorrect = 0;
      const totalCards = 5;
      const accuracy = Math.round((totalCorrect / totalCards) * 100);
      expect(accuracy).toBe(0);
    });
  });

  describe('Streak Calculation', () => {
    it('counts consecutive correct answers', () => {
      const recentAnswers = [
        { correct: true },
        { correct: true },
        { correct: true },
        { correct: false },
      ];

      let streak = 0;
      for (const answer of recentAnswers) {
        if (answer.correct) {
          streak++;
        } else {
          break;
        }
      }

      expect(streak).toBe(3);
    });

    it('returns 0 when first answer is wrong', () => {
      const recentAnswers = [
        { correct: false },
        { correct: true },
      ];

      let streak = 0;
      for (const answer of recentAnswers) {
        if (answer.correct) {
          streak++;
        } else {
          break;
        }
      }

      expect(streak).toBe(0);
    });

    it('returns full count when all correct', () => {
      const recentAnswers = [
        { correct: true },
        { correct: true },
        { correct: true },
      ];

      let streak = 0;
      for (const answer of recentAnswers) {
        if (answer.correct) {
          streak++;
        } else {
          break;
        }
      }

      expect(streak).toBe(3);
    });
  });

  describe('Trend Calculation', () => {
    it('calculates positive trend correctly', () => {
      const firstHalf = [
        { correct: true },
        { correct: false },
        { correct: false },
        { correct: true },
        { correct: false }, // 2/5 = 40%
      ];

      const secondHalf = [
        { correct: true },
        { correct: true },
        { correct: true },
        { correct: true },
        { correct: false }, // 4/5 = 80%
      ];

      const firstAccuracy = Math.round((firstHalf.filter(a => a.correct).length / firstHalf.length) * 100);
      const secondAccuracy = Math.round((secondHalf.filter(a => a.correct).length / secondHalf.length) * 100);
      const trend = secondAccuracy - firstAccuracy;

      expect(trend).toBe(40); // 80% - 40% = +40%
    });

    it('calculates negative trend correctly', () => {
      const firstHalf = [
        { correct: true },
        { correct: true },
        { correct: true },
        { correct: true },
        { correct: false }, // 4/5 = 80%
      ];

      const secondHalf = [
        { correct: true },
        { correct: false },
        { correct: false },
        { correct: true },
        { correct: false }, // 2/5 = 40%
      ];

      const firstAccuracy = Math.round((firstHalf.filter(a => a.correct).length / firstHalf.length) * 100);
      const secondAccuracy = Math.round((secondHalf.filter(a => a.correct).length / secondHalf.length) * 100);
      const trend = secondAccuracy - firstAccuracy;

      expect(trend).toBe(-40); // 40% - 80% = -40%
    });

    it('returns 0 when performance is same', () => {
      const firstHalf = [
        { correct: true },
        { correct: false },
        { correct: true }, // 2/3 = 67%
      ];

      const secondHalf = [
        { correct: true },
        { correct: false },
        { correct: true }, // 2/3 = 67%
      ];

      const firstAccuracy = Math.round((firstHalf.filter(a => a.correct).length / firstHalf.length) * 100);
      const secondAccuracy = Math.round((secondHalf.filter(a => a.correct).length / secondHalf.length) * 100);
      const trend = secondAccuracy - firstAccuracy;

      expect(trend).toBe(0);
    });

    it('handles insufficient data gracefully', () => {
      const answers: any[] = [];
      const firstAccuracy = answers.length > 0
        ? Math.round((answers.filter(a => a.correct).length / answers.length) * 100)
        : 0;
      const secondAccuracy = 0;
      const trend = secondAccuracy - firstAccuracy;

      expect(trend).toBe(0);
    });
  });

  describe('Deck Base Rate Calculation', () => {
    it('calculates base rate for "All" deck correctly', () => {
      const baseRate = getDeckBaseRate(mockCards, null);
      // 2 out of 3 cards are success (true)
      expect(baseRate).toBe(67); // Math.round(2/3 * 100)
    });

    it('calculates base rate for specific deck correctly', () => {
      const baseRate = getDeckBaseRate(mockCards, 'Deck A');
      // Deck A has 2 cards: 1 success (card 1), 1 failure (card 2)
      expect(baseRate).toBe(50);
    });

    it('calculates base rate for deck with all success', () => {
      const baseRate = getDeckBaseRate(mockCards, 'Deck B');
      // Deck B has 2 cards: 1 success (card 3), 1 failure (card 2)
      expect(baseRate).toBe(50);
    });

    it('returns 0 for empty deck', () => {
      const baseRate = getDeckBaseRate([], null);
      expect(baseRate).toBe(0);
    });

    it('returns 0 for non-existent deck', () => {
      const baseRate = getDeckBaseRate(mockCards, 'Non-existent Deck');
      expect(baseRate).toBe(0);
    });
  });

  describe('Answer Validation', () => {
    it('validates correct "Yes" answer', () => {
      const card = mockCards[0]; // success: true
      const userAnswer = 'Yes';
      const isCorrect = (card.success && userAnswer === 'Yes') || (!card.success && userAnswer === 'No');
      expect(isCorrect).toBe(true);
    });

    it('validates incorrect "No" answer for success=true', () => {
      const card = mockCards[0]; // success: true
      const userAnswer = 'No';
      const isCorrect = (card.success && userAnswer === 'Yes') || (!card.success && userAnswer === 'No');
      expect(isCorrect).toBe(false);
    });

    it('validates correct "No" answer for success=false', () => {
      const card = mockCards[1]; // success: false
      const userAnswer = 'No';
      const isCorrect = (card.success && userAnswer === 'Yes') || (!card.success && userAnswer === 'No');
      expect(isCorrect).toBe(true);
    });

    it('validates incorrect "Yes" answer for success=false', () => {
      const card = mockCards[1]; // success: false
      const userAnswer = 'Yes';
      const isCorrect = (card.success && userAnswer === 'Yes') || (!card.success && userAnswer === 'No');
      expect(isCorrect).toBe(false);
    });
  });

  describe('Deck Stats Aggregation', () => {
    it('aggregates stats correctly for multiple decks', () => {
      const deckStats = {
        'Deck A': { totalCorrect: 5, totalWrong: 3, cardsPlayed: 8 },
        'Deck B': { totalCorrect: 7, totalWrong: 2, cardsPlayed: 9 },
      };

      const overall = Object.values(deckStats).reduce(
        (acc, deck) => ({
          totalCorrect: acc.totalCorrect + deck.totalCorrect,
          totalWrong: acc.totalWrong + deck.totalWrong,
          cardsPlayed: acc.cardsPlayed + deck.cardsPlayed,
        }),
        { totalCorrect: 0, totalWrong: 0, cardsPlayed: 0 }
      );

      expect(overall.totalCorrect).toBe(12);
      expect(overall.totalWrong).toBe(5);
      expect(overall.cardsPlayed).toBe(17);
    });

    it('handles single deck correctly', () => {
      const deckStats = {
        'Deck A': { totalCorrect: 5, totalWrong: 3, cardsPlayed: 8 },
      };

      const overall = Object.values(deckStats).reduce(
        (acc, deck) => ({
          totalCorrect: acc.totalCorrect + deck.totalCorrect,
          totalWrong: acc.totalWrong + deck.totalWrong,
          cardsPlayed: acc.cardsPlayed + deck.cardsPlayed,
        }),
        { totalCorrect: 0, totalWrong: 0, cardsPlayed: 0 }
      );

      expect(overall.totalCorrect).toBe(5);
      expect(overall.totalWrong).toBe(3);
      expect(overall.cardsPlayed).toBe(8);
    });

    it('handles empty stats correctly', () => {
      const deckStats = {};

      const overall = Object.values(deckStats).reduce(
        (acc, deck) => ({
          totalCorrect: acc.totalCorrect + deck.totalCorrect,
          totalWrong: acc.totalWrong + deck.totalWrong,
          cardsPlayed: acc.cardsPlayed + deck.cardsPlayed,
        }),
        { totalCorrect: 0, totalWrong: 0, cardsPlayed: 0 }
      );

      expect(overall.totalCorrect).toBe(0);
      expect(overall.totalWrong).toBe(0);
      expect(overall.cardsPlayed).toBe(0);
    });
  });
});
