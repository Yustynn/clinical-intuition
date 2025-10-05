import { supabase } from './supabase';

export interface DeckStats {
  totalCorrect: number;
  totalWrong: number;
  cardsPlayed: number;
}

/**
 * Update user's username
 */
export async function updateUsername(userId: string, username: string) {
  const { error } = await supabase
    .from('users')
    .update({ username })
    .eq('id', userId);

  if (error) {
    console.error('Error updating username:', error);
    throw error;
  }
}

/**
 * Check if username is available
 */
export async function isUsernameAvailable(username: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('users')
    .select('username')
    .eq('username', username)
    .maybeSingle();

  if (error) {
    console.error('Error checking username:', error);
    return false;
  }

  return !data;
}

export interface CardAnswer {
  card_id: string;
  deck_name: string;
  answer: 'Yes' | 'No';
  correct: boolean;
}

/**
 * Upsert deck stats for a user
 */
export async function upsertDeckStats(
  userId: string,
  deckName: string,
  stats: DeckStats
) {
  const { error } = await supabase
    .from('deck_stats')
    .upsert({
      user_id: userId,
      deck_name: deckName,
      cards_played: stats.cardsPlayed,
      total_correct: stats.totalCorrect,
      total_wrong: stats.totalWrong,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id,deck_name',
    });

  if (error) {
    console.error('Error upserting deck stats:', error);
    throw error;
  }
}

/**
 * Save a card answer for a user
 */
export async function saveCardAnswer(
  userId: string,
  answer: CardAnswer
) {
  const { error } = await supabase
    .from('card_answers')
    .insert({
      user_id: userId,
      card_id: answer.card_id,
      deck_name: answer.deck_name,
      answer: answer.answer,
      correct: answer.correct,
      timestamp: new Date().toISOString(),
    });

  if (error) {
    console.error('Error saving card answer:', error);
    throw error;
  }
}

/**
 * Fetch all deck stats for a user
 */
export async function fetchDeckStats(userId: string): Promise<Record<string, DeckStats>> {
  const { data, error } = await supabase
    .from('deck_stats')
    .select('*')
    .eq('user_id', userId);

  if (error) {
    console.error('Error fetching deck stats:', error);
    throw error;
  }

  // Convert array to Record
  const statsRecord: Record<string, DeckStats> = {};
  data?.forEach((row) => {
    statsRecord[row.deck_name] = {
      cardsPlayed: row.cards_played,
      totalCorrect: row.total_correct,
      totalWrong: row.total_wrong,
    };
  });

  return statsRecord;
}

/**
 * Fetch card answers for a user
 */
export async function fetchCardAnswers(
  userId: string,
  options?: { limit?: number; deckName?: string }
) {
  let query = supabase
    .from('card_answers')
    .select('*')
    .eq('user_id', userId)
    .order('timestamp', { ascending: false });

  if (options?.deckName) {
    query = query.eq('deck_name', options.deckName);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching card answers:', error);
    throw error;
  }

  return data;
}
