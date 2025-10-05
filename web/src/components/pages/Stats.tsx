import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { fetchDeckStats, fetchCardAnswers } from '../../lib/supabaseService';
import { getDeckBaseRate } from '../../constants';
import { Sheet } from '../../components/ui';
import QuestionStyles from '../../components/ui/QuestionStyles';
import { ArrowLeft, TrendingUp, Target, Zap, ExternalLink } from 'lucide-react';
import type { Theme } from '../../utils/theme';
import type { PredictionCard } from '../../types';

interface StatsProps {
  theme: Theme;
  onBack: () => void;
  allCards: PredictionCard[];
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

const Stats: React.FC<StatsProps> = ({ theme, onBack, allCards }) => {
  const { user } = useAuth();
  const [deckStats, setDeckStats] = useState<Record<string, DeckStats>>({});
  const [recentAnswers, setRecentAnswers] = useState<CardAnswer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAnswer, setSelectedAnswer] = useState<CardAnswer | null>(null);

  // Create card lookup map
  const cardMap = useMemo(() => {
    const map = new Map<string, PredictionCard>();
    allCards.forEach(card => map.set(card.card_id, card));
    return map;
  }, [allCards]);

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
                const baseline = getDeckBaseRate(allCards, deckName === 'All' ? null : deckName);
                const diff = deckAccuracy - baseline;

                return (
                  <div key={deckName} className={`p-3 ${theme.btnRadius} border border-amber-300`}>
                    <div className="flex justify-between items-center">
                      <div className="flex-1">
                        <div className="font-medium">{deckName}</div>
                        <div className="text-xs opacity-60">
                          {stats.cardsPlayed} cards · {stats.totalCorrect} correct
                        </div>
                        <div className="text-xs opacity-50 mt-0.5">
                          Scientists: {baseline}% · You: {diff > 0 ? '+' : ''}{diff}%
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
              const card = cardMap.get(answer.card_id);
              const interventionName = card?.front_details?.intervention_fragment || 'Unknown intervention';
              const capitalizedIntervention = interventionName.charAt(0).toUpperCase() + interventionName.slice(1);
              const decks = card?.decks || [];

              return (
                <button
                  key={idx}
                  onClick={() => setSelectedAnswer(answer)}
                  className="p-3 w-full text-left hover:bg-amber-50 dark:hover:bg-amber-950/20 transition-colors"
                >
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{capitalizedIntervention}</div>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {decks.map((deck, i) => (
                          <span
                            key={i}
                            className={`px-2 py-0.5 ${theme.btnRadius} text-xs bg-amber-100 text-amber-800 ${
                              theme.key === 'retroDark' ? 'bg-amber-900/30 text-amber-400' : ''
                            }`}
                          >
                            {deck}
                          </span>
                        ))}
                      </div>
                      <div className="text-xs opacity-50 mt-1">{timeAgo}</div>
                    </div>
                    <div className={`px-2 py-1 ${theme.btnRadius} text-xs font-medium flex-shrink-0 ${
                      answer.correct
                        ? 'bg-green-500/20 text-green-500'
                        : 'bg-red-500/20 text-red-500'
                    }`}>
                      {answer.correct ? 'Correct' : 'Wrong'}
                    </div>
                  </div>
                </button>
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

      {/* Card Review Modal */}
      {selectedAnswer && (
        <Sheet
          open={!!selectedAnswer}
          onClose={() => setSelectedAnswer(null)}
          title="Card Review"
          theme={theme}
        >
          {(() => {
            const card = cardMap.get(selectedAnswer.card_id);
            if (!card) return <div>Card not found</div>;

            return (
              <div className="space-y-4">
                {/* Question with highlighted fragments */}
                <div>
                  <div className="text-sm opacity-70 mb-2">Question</div>
                  <QuestionStyles theme={theme} fragments={card.front_details} />
                </div>

                {/* Your Answer */}
                <div>
                  <div className="text-sm opacity-70 mb-1">Your Answer</div>
                  <div className={`inline-flex items-center gap-2 px-3 py-1.5 ${theme.btnRadius} ${
                    selectedAnswer.correct
                      ? 'bg-green-500/20 text-green-600'
                      : 'bg-red-500/20 text-red-600'
                  }`}>
                    <span className="font-medium">{selectedAnswer.answer}</span>
                    <span className="text-xs">
                      {selectedAnswer.correct ? '✓ Correct' : '✗ Wrong'}
                    </span>
                  </div>
                </div>

                {/* Correct Answer */}
                <div>
                  <div className="text-sm opacity-70 mb-1">Correct Answer</div>
                  <div className="font-medium">{card.success ? 'Yes' : 'No'}</div>
                  <div className="text-xs opacity-60 mt-1">P-value: {card.p_value}</div>
                </div>

                {/* Decks */}
                {card.decks && card.decks.length > 0 && (
                  <div>
                    <div className="text-sm opacity-70 mb-1">Categories</div>
                    <div className="flex flex-wrap gap-1">
                      {card.decks.map((deck, i) => (
                        <span
                          key={i}
                          className={`px-2 py-0.5 ${theme.btnRadius} text-xs bg-amber-100 text-amber-800 ${
                            theme.key === 'retroDark' ? 'bg-amber-900/30 text-amber-400' : ''
                          }`}
                        >
                          {deck}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Link to study */}
                <a
                  href={`https://clinicaltrials.gov/study/${card.study.nct_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center gap-2 px-3 py-1.5 ${theme.btnRadius} border ${theme.secondaryBtn} text-xs opacity-70 hover:opacity-100 transition-opacity`}
                >
                  <ExternalLink className="h-3 w-3" />
                  View on ClinicalTrials.gov
                </a>
              </div>
            );
          })()}
        </Sheet>
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
