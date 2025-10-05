import { useEffect, useState } from 'react';
import { useAuth } from './useAuth';
import { fetchDeckStats, upsertDeckStats, saveCardAnswer, fetchCardAnswers, type DeckStats } from '../lib/supabaseService';
import { STORAGE_KEYS } from '../constants';

/**
 * Hook to sync deck stats and card answers between localStorage and Supabase
 * - On mount: if user is signed in, fetch from Supabase and merge with localStorage
 * - On sign in: sync localStorage stats and card answers to Supabase
 */
export function useSyncStats() {
  const { user } = useAuth();
  const [syncing, setSyncing] = useState(false);
  const [synced, setSynced] = useState(false);
  const [syncedStats, setSyncedStats] = useState<Record<string, DeckStats> | null>(null);
  const [syncedAnsweredCardIds, setSyncedAnsweredCardIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user || synced) return;

    const syncStats = async () => {
      setSyncing(true);
      try {
        // Load localStorage stats
        const localStatsStr = localStorage.getItem(STORAGE_KEYS.DECK_STATS);
        const localStats: Record<string, DeckStats> = localStatsStr
          ? JSON.parse(localStatsStr)
          : {};

        // Fetch Supabase stats
        const supabaseStats = await fetchDeckStats(user.id);

        // Merge: Supabase takes precedence if it has more cards played
        const mergedStats: Record<string, DeckStats> = { ...localStats };

        Object.keys(supabaseStats).forEach((deckName) => {
          const supabaseDeck = supabaseStats[deckName];
          const localDeck = localStats[deckName];

          if (!localDeck || supabaseDeck.cardsPlayed > localDeck.cardsPlayed) {
            mergedStats[deckName] = supabaseDeck;
          }
        });

        // Upload any local stats that are newer/missing from Supabase
        const uploadPromises = Object.keys(localStats).map(async (deckName) => {
          const localDeck = localStats[deckName];
          const supabaseDeck = supabaseStats[deckName];

          // Upload if Supabase doesn't have this deck or local has more progress
          if (!supabaseDeck || localDeck.cardsPlayed > supabaseDeck.cardsPlayed) {
            await upsertDeckStats(user.id, deckName, localDeck);
          }
        });

        await Promise.all(uploadPromises);

        // Save merged stats back to localStorage
        localStorage.setItem(STORAGE_KEYS.DECK_STATS, JSON.stringify(mergedStats));

        // Sync card answers from localStorage to Supabase
        const localAnswersStr = localStorage.getItem(STORAGE_KEYS.CARD_ANSWERS);
        if (localAnswersStr) {
          const localAnswers: Array<{
            card_id: string;
            deck_name: string;
            answer: 'Yes' | 'No';
            correct: boolean;
            timestamp: string;
          }> = JSON.parse(localAnswersStr);

          // Upload all local card answers to Supabase
          const answerPromises = localAnswers.map(async (answer) => {
            await saveCardAnswer(user.id, {
              card_id: answer.card_id,
              deck_name: answer.deck_name,
              answer: answer.answer,
              correct: answer.correct,
            });
          });

          await Promise.all(answerPromises);

          // Clear localStorage card answers after successful sync
          localStorage.removeItem(STORAGE_KEYS.CARD_ANSWERS);
        }

        // Fetch all answered cards from Supabase to build exclusion set
        const answeredCards = await fetchCardAnswers(user.id);
        const answeredCardIds = new Set(answeredCards.map(a => a.card_id));

        // Return synced data to trigger UI update
        setSyncedStats(mergedStats);
        setSyncedAnsweredCardIds(answeredCardIds);
        setSynced(true);
      } catch (error) {
        console.error('Error syncing stats:', error);
      } finally {
        setSyncing(false);
      }
    };

    syncStats();
  }, [user, synced]);

  return { syncing, synced, syncedStats, syncedAnsweredCardIds };
}
