import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import type { Theme } from '../../utils/theme';
import type { PredictionCard } from '../../types';
import { getDeckBaseRate } from '../../constants';

interface DeckStats {
  totalCorrect: number;
  totalWrong: number;
  cardsPlayed: number;
}

interface DeckComparisonProps {
  deckStats: Record<string, DeckStats>;
  allCards: PredictionCard[];
  theme: Theme;
}

const DeckComparison: React.FC<DeckComparisonProps> = ({ deckStats, allCards, theme }) => {
  const chartData = useMemo(() => {
    return Object.entries(deckStats)
      .sort(([, a], [, b]) => b.cardsPlayed - a.cardsPlayed)
      .map(([deckName, stats]) => {
        const accuracy = stats.cardsPlayed > 0
          ? Math.round((stats.totalCorrect / stats.cardsPlayed) * 100)
          : 0;
        const baseline = getDeckBaseRate(allCards, deckName === 'All' ? null : deckName);
        const diff = accuracy - baseline;

        return {
          name: deckName,
          you: accuracy,
          scientists: baseline,
          diff,
          cardsPlayed: stats.cardsPlayed,
        };
      });
  }, [deckStats, allCards]);

  if (chartData.length === 0) {
    return (
      <div className={`p-8 ${theme.btnRadius} border border-amber-300 text-center opacity-70`}>
        No deck data yet. Play cards to see performance breakdown!
      </div>
    );
  }

  const isDark = theme.key === 'retroDark';
  const gridColor = isDark ? '#78350f' : '#fde68a';
  const textColor = isDark ? '#fbbf24' : '#78350f';
  const barColorScientists = isDark ? '#dc2626' : '#ef4444';

  // Custom bar colors based on performance
  const getBarColor = (diff: number) => {
    if (diff > 0) return isDark ? '#22c55e' : '#16a34a'; // Green - beating scientists
    if (diff < 0) return isDark ? '#ef4444' : '#dc2626'; // Red - trailing scientists
    return isDark ? '#fbbf24' : '#f59e0b'; // Amber - tied
  };

  return (
    <div className={`p-4 ${theme.btnRadius} border border-amber-300`}>
      <div className="mb-3">
        <h3 className="text-sm font-medium opacity-70">You vs Scientists by Deck</h3>
        <p className="text-xs opacity-50 mt-0.5">Your accuracy compared to baseline success rates</p>
      </div>
      <ResponsiveContainer width="100%" height={Math.max(200, chartData.length * 60)}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} opacity={0.3} />
          <XAxis
            type="number"
            domain={[0, 100]}
            stroke={textColor}
            tick={{ fontSize: 11, fill: textColor }}
            tickLine={{ stroke: gridColor }}
          />
          <YAxis
            dataKey="name"
            type="category"
            stroke={textColor}
            tick={{ fontSize: 11, fill: textColor }}
            tickLine={{ stroke: gridColor }}
            width={80}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: isDark ? '#292524' : '#fffbeb',
              border: `1px solid ${gridColor}`,
              borderRadius: '4px',
              fontSize: '12px',
            }}
            labelStyle={{ color: textColor, fontWeight: 'bold' }}
            formatter={(value: number | undefined, name: string | undefined) => {
              if (value === undefined) return ['N/A', name || 'Unknown'];
              if (name === 'you') return [`${value}%`, 'You'];
              if (name === 'scientists') return [`${value}%`, 'Scientists'];
              return [`${value}`, name || 'Unknown'];
            }}
          />
          <ReferenceLine x={50} stroke={gridColor} strokeDasharray="3 3" />
          <Bar dataKey="scientists" fill={barColorScientists} radius={[0, 4, 4, 0]} opacity={0.6} />
          <Bar dataKey="you" radius={[0, 4, 4, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getBarColor(entry.diff)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-3 flex gap-4 text-xs opacity-60 justify-center">
        <div className="flex items-center gap-1">
          <div className={`w-3 h-3 rounded ${isDark ? 'bg-green-500' : 'bg-green-600'}`} />
          <span>Beating baseline</span>
        </div>
        <div className="flex items-center gap-1">
          <div className={`w-3 h-3 rounded ${isDark ? 'bg-red-500' : 'bg-red-600'}`} />
          <span>Below baseline</span>
        </div>
        <div className="flex items-center gap-1">
          <div className={`w-3 h-3 rounded ${isDark ? 'bg-amber-400' : 'bg-amber-600'}`} />
          <span>Tied</span>
        </div>
      </div>
    </div>
  );
};

export default DeckComparison;
