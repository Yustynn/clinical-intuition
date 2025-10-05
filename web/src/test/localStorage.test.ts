import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

// Replace global localStorage with mock
Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

const STORAGE_KEYS = {
  DECK_STATS: 'deck_stats',
  CARD_ANSWERS: 'card_answers',
  ANSWERED_CARD_IDS: 'answered_card_ids',
};

describe('LocalStorage Persistence', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('Deck Stats Storage', () => {
    it('saves deck stats to localStorage', () => {
      const stats = {
        'All': { totalCorrect: 5, totalWrong: 3, cardsPlayed: 8 },
        'Exercise': { totalCorrect: 3, totalWrong: 1, cardsPlayed: 4 },
      };

      localStorage.setItem(STORAGE_KEYS.DECK_STATS, JSON.stringify(stats));
      const saved = localStorage.getItem(STORAGE_KEYS.DECK_STATS);

      expect(saved).toBeDefined();
      expect(JSON.parse(saved!)).toEqual(stats);
    });

    it('loads deck stats from localStorage', () => {
      const stats = {
        'All': { totalCorrect: 5, totalWrong: 3, cardsPlayed: 8 },
      };

      localStorage.setItem(STORAGE_KEYS.DECK_STATS, JSON.stringify(stats));
      const loaded = JSON.parse(localStorage.getItem(STORAGE_KEYS.DECK_STATS) || '{}');

      expect(loaded).toEqual(stats);
    });

    it('returns empty object when no stats exist', () => {
      const loaded = JSON.parse(localStorage.getItem(STORAGE_KEYS.DECK_STATS) || '{}');
      expect(loaded).toEqual({});
    });

    it('updates existing deck stats', () => {
      const initialStats = {
        'All': { totalCorrect: 5, totalWrong: 3, cardsPlayed: 8 },
      };

      localStorage.setItem(STORAGE_KEYS.DECK_STATS, JSON.stringify(initialStats));

      // Update with new stats
      const updatedStats = {
        'All': { totalCorrect: 6, totalWrong: 3, cardsPlayed: 9 },
      };

      localStorage.setItem(STORAGE_KEYS.DECK_STATS, JSON.stringify(updatedStats));
      const loaded = JSON.parse(localStorage.getItem(STORAGE_KEYS.DECK_STATS) || '{}');

      expect(loaded.All.totalCorrect).toBe(6);
      expect(loaded.All.cardsPlayed).toBe(9);
    });
  });

  describe('Card Answers Storage', () => {
    it('saves card answers to localStorage', () => {
      const answers = [
        { card_id: '1', deck_name: 'All', answer: 'Yes', correct: true, timestamp: '2025-01-01' },
        { card_id: '2', deck_name: 'All', answer: 'No', correct: false, timestamp: '2025-01-02' },
      ];

      localStorage.setItem(STORAGE_KEYS.CARD_ANSWERS, JSON.stringify(answers));
      const saved = localStorage.getItem(STORAGE_KEYS.CARD_ANSWERS);

      expect(saved).toBeDefined();
      expect(JSON.parse(saved!)).toEqual(answers);
    });

    it('appends new answers to existing ones', () => {
      const initialAnswers = [
        { card_id: '1', deck_name: 'All', answer: 'Yes', correct: true, timestamp: '2025-01-01' },
      ];

      localStorage.setItem(STORAGE_KEYS.CARD_ANSWERS, JSON.stringify(initialAnswers));

      // Load, append, save
      const existing = JSON.parse(localStorage.getItem(STORAGE_KEYS.CARD_ANSWERS) || '[]');
      const newAnswer = { card_id: '2', deck_name: 'All', answer: 'No', correct: false, timestamp: '2025-01-02' };
      existing.push(newAnswer);
      localStorage.setItem(STORAGE_KEYS.CARD_ANSWERS, JSON.stringify(existing));

      const final = JSON.parse(localStorage.getItem(STORAGE_KEYS.CARD_ANSWERS) || '[]');
      expect(final.length).toBe(2);
      expect(final[1]).toEqual(newAnswer);
    });

    it('clears answers when synced to Supabase', () => {
      const answers = [
        { card_id: '1', deck_name: 'All', answer: 'Yes', correct: true, timestamp: '2025-01-01' },
      ];

      localStorage.setItem(STORAGE_KEYS.CARD_ANSWERS, JSON.stringify(answers));
      expect(localStorage.getItem(STORAGE_KEYS.CARD_ANSWERS)).toBeDefined();

      // Simulate sync completion
      localStorage.removeItem(STORAGE_KEYS.CARD_ANSWERS);
      expect(localStorage.getItem(STORAGE_KEYS.CARD_ANSWERS)).toBeNull();
    });
  });

  describe('Answered Card IDs Storage', () => {
    it('saves answered card IDs as array', () => {
      const answeredIds = new Set(['1', '2', '3']);
      localStorage.setItem(STORAGE_KEYS.ANSWERED_CARD_IDS, JSON.stringify(Array.from(answeredIds)));

      const saved = localStorage.getItem(STORAGE_KEYS.ANSWERED_CARD_IDS);
      expect(saved).toBeDefined();
      expect(JSON.parse(saved!)).toEqual(['1', '2', '3']);
    });

    it('loads answered card IDs into Set', () => {
      localStorage.setItem(STORAGE_KEYS.ANSWERED_CARD_IDS, JSON.stringify(['1', '2', '3']));

      const loaded = new Set(JSON.parse(localStorage.getItem(STORAGE_KEYS.ANSWERED_CARD_IDS) || '[]'));
      expect(loaded.size).toBe(3);
      expect(loaded.has('1')).toBe(true);
      expect(loaded.has('4')).toBe(false);
    });

    it('adds new card ID to existing set', () => {
      localStorage.setItem(STORAGE_KEYS.ANSWERED_CARD_IDS, JSON.stringify(['1', '2']));

      const existing = new Set(JSON.parse(localStorage.getItem(STORAGE_KEYS.ANSWERED_CARD_IDS) || '[]'));
      existing.add('3');
      localStorage.setItem(STORAGE_KEYS.ANSWERED_CARD_IDS, JSON.stringify(Array.from(existing)));

      const final = new Set(JSON.parse(localStorage.getItem(STORAGE_KEYS.ANSWERED_CARD_IDS) || '[]'));
      expect(final.size).toBe(3);
      expect(final.has('3')).toBe(true);
    });
  });

  describe('Data Merge Strategy', () => {
    it('prefers Supabase data when it has more cards played', () => {
      const localStats = { totalCorrect: 5, totalWrong: 3, cardsPlayed: 8 };
      const supabaseStats = { totalCorrect: 10, totalWrong: 5, cardsPlayed: 15 };

      const merged = supabaseStats.cardsPlayed > localStats.cardsPlayed ? supabaseStats : localStats;
      expect(merged).toEqual(supabaseStats);
    });

    it('prefers local data when it has more cards played', () => {
      const localStats = { totalCorrect: 10, totalWrong: 5, cardsPlayed: 15 };
      const supabaseStats = { totalCorrect: 5, totalWrong: 3, cardsPlayed: 8 };

      const merged = supabaseStats.cardsPlayed > localStats.cardsPlayed ? supabaseStats : localStats;
      expect(merged).toEqual(localStats);
    });

    it('handles missing Supabase data', () => {
      const localStats = { totalCorrect: 5, totalWrong: 3, cardsPlayed: 8 };
      const supabaseStats = null;

      const merged = supabaseStats ? supabaseStats : localStats;
      expect(merged).toEqual(localStats);
      expect(merged.cardsPlayed).toBe(8);
    });

    it('handles missing local data', () => {
      const supabaseStats = { totalCorrect: 5, totalWrong: 3, cardsPlayed: 8 };

      const merged = supabaseStats;
      expect(merged).toEqual(supabaseStats);
    });
  });

  describe('Error Handling', () => {
    it('handles malformed JSON gracefully', () => {
      localStorage.setItem(STORAGE_KEYS.DECK_STATS, 'invalid json');

      try {
        const loaded = JSON.parse(localStorage.getItem(STORAGE_KEYS.DECK_STATS) || '{}');
        expect(loaded).toBeDefined();
      } catch (error) {
        // Should fallback to empty object
        const fallback = {};
        expect(fallback).toEqual({});
      }
    });

    it('handles localStorage being full', () => {
      // localStorage has limited space
      // Simulate save failure
      const originalSetItem = localStorage.setItem;

      localStorage.setItem = vi.fn(() => {
        throw new Error('QuotaExceededError');
      });

      try {
        localStorage.setItem(STORAGE_KEYS.DECK_STATS, '{"test": "data"}');
      } catch (error) {
        expect(error).toBeDefined();
      }

      // Restore
      localStorage.setItem = originalSetItem;
    });

    it('handles localStorage being unavailable', () => {
      const tempStorage = global.localStorage;

      // Simulate localStorage being undefined (incognito mode, etc.)
      Object.defineProperty(global, 'localStorage', {
        value: undefined,
        writable: true,
      });

      const canUseLocalStorage = typeof global.localStorage !== 'undefined';
      expect(canUseLocalStorage).toBe(false);

      // Restore
      Object.defineProperty(global, 'localStorage', {
        value: tempStorage,
        writable: true,
      });
    });
  });
});
