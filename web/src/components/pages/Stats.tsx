import React, { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { fetchDeckStats, fetchCardAnswers } from '../../lib/supabaseService';
import { ArrowLeft, TrendingUp, Target, Zap } from 'lucide-react';
import type { Theme } from '../../utils/theme';

interface StatsProps {
  theme: Theme;
  onBack: () => void;
}

interface DeckStats {
  totalCorrect: number;
  totalWrong: number;
  cardsPlayed: number;
}

interface CardAnswer {
  card_id: string;
  deck_name: string;
  answer: string;
  correct: boolean;
  timestamp: string;
}

const Stats: React.FC<StatsProps> = ({ theme, onBack }) => {
  const { user } = useAuth();
  const [deckStats, setDeckStats] = useState<Record<string, DeckStats>>({});
  const [recentAnswers, setRecentAnswers] = useState<CardAnswer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const loadStats = async () => {
      try {
        const [stats, answers] = await Promise.all([
          fetchDeckStats(user.id),
          fetchCardAnswers(user.id, { limit: 20 }),
        ]);
        setDeckStats(stats);
        setRecentAnswers(answers);
      } catch (error) {
        console.error('Error loading stats:', error);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, [user]);

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto">
        <button
          onClick={onBack}
          className={`mb-6 px-3 py-1.5 ${theme.btnRadius} border ${theme.secondaryBtn} text-sm flex items-center gap-2`}
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <div className={`p-8 ${theme.btnRadius} border border-amber-300 text-center`}>
          <p className="opacity-70">Sign in to view your stats</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto">
        <button
          onClick={onBack}
          className={`mb-6 px-3 py-1.5 ${theme.btnRadius} border ${theme.secondaryBtn} text-sm flex items-center gap-2`}
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <div className={`p-8 ${theme.btnRadius} border border-amber-300 text-center`}>
          <p className="opacity-70">Loading stats...</p>
        </div>
      </div>
    );
  }

  // Calculate overall stats
  const overallStats = Object.values(deckStats).reduce(
    (acc, deck) => ({
      totalCorrect: acc.totalCorrect + deck.totalCorrect,
      totalWrong: acc.totalWrong + deck.totalWrong,
      cardsPlayed: acc.cardsPlayed + deck.cardsPlayed,
    }),
    { totalCorrect: 0, totalWrong: 0, cardsPlayed: 0 }
  );

  const accuracy = overallStats.cardsPlayed > 0
    ? Math.round((overallStats.totalCorrect / overallStats.cardsPlayed) * 100)
    : 0;

  // Calculate streak from recent answers
  let currentStreak = 0;
  for (const answer of recentAnswers) {
    if (answer.correct) {
      currentStreak++;
    } else {
      break;
    }
  }

  // Calculate improvement trend (compare first 10 vs last 10)
  const firstHalf = recentAnswers.slice(-20, -10);
  const secondHalf = recentAnswers.slice(-10);

  const firstHalfAccuracy = firstHalf.length > 0
    ? Math.round((firstHalf.filter(a => a.correct).length / firstHalf.length) * 100)
    : 0;
  const secondHalfAccuracy = secondHalf.length > 0
    ? Math.round((secondHalf.filter(a => a.correct).length / secondHalf.length) * 100)
    : 0;

  const trend = secondHalfAccuracy - firstHalfAccuracy;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <button
        onClick={onBack}
        className={`mb-6 px-3 py-1.5 ${theme.btnRadius} border ${theme.secondaryBtn} text-sm flex items-center gap-2 opacity-70 hover:opacity-100 transition-opacity`}
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <h1 className={`text-3xl font-semibold mb-6 ${theme.font}`}>Your Stats</h1>

      {/* Overall Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className={`p-4 ${theme.btnRadius} border border-amber-300`}>
          <div className="flex items-center gap-2 mb-2 opacity-70">
            <Target className="h-4 w-4" />
            <div className="text-sm">Accuracy</div>
          </div>
          <div className="text-3xl font-bold">{accuracy}%</div>
          <div className="text-xs opacity-60 mt-1">
            {overallStats.totalCorrect}/{overallStats.cardsPlayed} correct
          </div>
        </div>

        <div className={`p-4 ${theme.btnRadius} border border-amber-300`}>
          <div className="flex items-center gap-2 mb-2 opacity-70">
            <Zap className="h-4 w-4" />
            <div className="text-sm">Current Streak</div>
          </div>
          <div className="text-3xl font-bold">{currentStreak}</div>
          <div className="text-xs opacity-60 mt-1">cards in a row</div>
        </div>

        <div className={`p-4 ${theme.btnRadius} border border-amber-300`}>
          <div className="flex items-center gap-2 mb-2 opacity-70">
            <TrendingUp className="h-4 w-4" />
            <div className="text-sm">Trend</div>
          </div>
          <div className={`text-3xl font-bold ${trend > 0 ? 'text-green-500' : trend < 0 ? 'text-red-500' : ''}`}>
            {trend > 0 ? '+' : ''}{trend}%
          </div>
          <div className="text-xs opacity-60 mt-1">last 10 vs prev 10</div>
        </div>
      </div>

      {/* Performance by Deck */}
      {Object.keys(deckStats).length > 0 && (
        <div className="mb-6">
          <h2 className={`text-xl font-semibold mb-3 ${theme.font}`}>Performance by Deck</h2>
          <div className="space-y-2">
            {Object.entries(deckStats)
              .sort(([, a], [, b]) => b.cardsPlayed - a.cardsPlayed)
              .map(([deckName, stats]) => {
                const deckAccuracy = stats.cardsPlayed > 0
                  ? Math.round((stats.totalCorrect / stats.cardsPlayed) * 100)
                  : 0;

                return (
                  <div key={deckName} className={`p-3 ${theme.btnRadius} border border-amber-300`}>
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-medium">{deckName}</div>
                        <div className="text-xs opacity-60">
                          {stats.cardsPlayed} cards · {stats.totalCorrect} correct
                        </div>
                      </div>
                      <div className="text-2xl font-bold">{deckAccuracy}%</div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      {recentAnswers.length > 0 && (
        <div className="mb-6">
          <h2 className={`text-xl font-semibold mb-3 ${theme.font}`}>Recent Activity</h2>
          <div className={`${theme.btnRadius} border border-amber-300 divide-y divide-amber-300`}>
            {recentAnswers.slice(0, 10).map((answer, idx) => {
              const date = new Date(answer.timestamp);
              const timeAgo = getTimeAgo(date);

              return (
                <div key={idx} className="p-3 flex justify-between items-center">
                  <div className="flex-1">
                    <div className="text-sm opacity-70">{answer.deck_name}</div>
                    <div className="text-xs opacity-50">{timeAgo}</div>
                  </div>
                  <div className={`px-2 py-1 ${theme.btnRadius} text-xs font-medium ${
                    answer.correct
                      ? 'bg-green-500/20 text-green-500'
                      : 'bg-red-500/20 text-red-500'
                  }`}>
                    {answer.correct ? 'Correct' : 'Wrong'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* No data state */}
      {overallStats.cardsPlayed === 0 && (
        <div className={`p-8 ${theme.btnRadius} border border-amber-300 text-center`}>
          <p className="opacity-70">No stats yet. Start playing to see your progress!</p>
        </div>
      )}
    </div>
  );
};

function getTimeAgo(date: Date): string {
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
}

export default Stats;
