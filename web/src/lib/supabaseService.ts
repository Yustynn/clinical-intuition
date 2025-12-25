import { supabase } from './supabase';

export interface DeckStats {
  totalCorrect: number;
  totalWrong: number;
  cardsPlayed: number;
}

/**
 * Ensure user exists in users table
 * This handles cases where auth.users has the record but public.users doesn't
 */
export async function ensureUserExists(userId: string, email?: string) {
  // Check if user already exists
  const { data: existingUser, error: checkError } = await supabase
    .from('users')
    .select('id')
    .eq('id', userId)
    .maybeSingle();

  if (checkError) {
    console.error('Error checking if user exists:', checkError);
    throw checkError;
  }

  // If user exists, we're good
  if (existingUser) {
    return;
  }

  // User doesn't exist, create them
  const { error: insertError } = await supabase
    .from('users')
    .insert({
      id: userId,
      email: email || null,
      created_at: new Date().toISOString(),
    });

  if (insertError) {
    console.error('❌ Failed to create user record:', insertError);
    throw insertError;
  }
}

/**
 * Update user's username
 */
export async function updateUsername(userId: string, username: string) {
  // Ensure user exists first
  await ensureUserExists(userId);

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
  // Ensure user exists first to avoid foreign key constraint errors
  await ensureUserExists(userId);

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
  // Ensure user exists first to avoid foreign key constraint errors
  await ensureUserExists(userId);

  const timestamp = new Date().toISOString();

  const { error } = await supabase
    .from('card_answers')
    .insert({
      user_id: userId,
      card_id: answer.card_id,
      deck_name: answer.deck_name,
      answer: answer.answer,
      correct: answer.correct,
      timestamp,
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
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

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

/**
 * Delete all progress for a user (deck stats and card answers)
 */
export async function deleteAllUserProgress(userId: string) {
  // Delete all deck stats
  const { error: deckStatsError } = await supabase
    .from('deck_stats')
    .delete({ count: 'exact' })
    .eq('user_id', userId);

  if (deckStatsError) {
    console.error('❌ Error deleting deck stats:', deckStatsError);
    throw deckStatsError;
  }

  // Delete all card answers
  const { error: cardAnswersError } = await supabase
    .from('card_answers')
    .delete({ count: 'exact' })
    .eq('user_id', userId);

  if (cardAnswersError) {
    console.error('❌ Error deleting card answers:', cardAnswersError);
    throw cardAnswersError;
  }

  // Verify deletion
  const { count: remainingDeckCount } = await supabase
    .from('deck_stats')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  const { count: remainingAnswerCount } = await supabase
    .from('card_answers')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  if ((remainingDeckCount || 0) > 0 || (remainingAnswerCount || 0) > 0) {
    console.error(`⚠️ WARNING: Deletion incomplete! Remaining: ${remainingDeckCount || 0} deck stats, ${remainingAnswerCount || 0} answers`);
    throw new Error('Deletion verification failed - some records remain');
  }
}
