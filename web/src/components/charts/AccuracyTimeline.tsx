import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import type { Theme } from '../../utils/theme';

interface CardAnswer {
  card_id: string;
  deck_name: string;
  answer: string;
  correct: boolean;
  timestamp: string;
}

interface AccuracyTimelineProps {
  answers: CardAnswer[];
  theme: Theme;
  baseline?: number;
}

const AccuracyTimeline: React.FC<AccuracyTimelineProps> = ({ answers, theme, baseline = 50 }) => {
  const chartData = useMemo(() => {
    if (answers.length === 0) return [];

    // Reverse to get chronological order (oldest first)
    const chronological = [...answers].reverse();

    // Calculate rolling accuracy (5-card window)
    const data: Array<{ index: number; accuracy: number; label: string }> = [];
    const windowSize = 5;

    for (let i = 0; i < chronological.length; i++) {
      const start = Math.max(0, i - windowSize + 1);
      const window = chronological.slice(start, i + 1);
      const correct = window.filter(a => a.correct).length;
      const accuracy = Math.round((correct / window.length) * 100);

      data.push({
        index: i + 1,
        accuracy,
        label: `Card ${i + 1}`,
      });
    }

    return data;
  }, [answers]);

  if (chartData.length === 0) {
    return (
      <div className={`p-8 ${theme.btnRadius} border border-amber-300 text-center opacity-70`}>
        No data yet. Play more cards to see your accuracy trend!
      </div>
    );
  }

  const isDark = theme.key === 'retroDark';
  const gridColor = isDark ? '#78350f' : '#fde68a';
  const lineColor = isDark ? '#fbbf24' : '#f59e0b';
  const textColor = isDark ? '#fbbf24' : '#78350f';

  return (
    <div className={`p-4 ${theme.btnRadius} border border-amber-300`}>
      <div className="mb-3">
        <h3 className="text-sm font-medium opacity-70">Accuracy Over Time</h3>
        <p className="text-xs opacity-50 mt-0.5">Rolling 5-card average</p>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} opacity={0.3} />
          <XAxis
            dataKey="index"
            stroke={textColor}
            tick={{ fontSize: 11, fill: textColor }}
            tickLine={{ stroke: gridColor }}
          />
          <YAxis
            domain={[0, 100]}
            stroke={textColor}
            tick={{ fontSize: 11, fill: textColor }}
            tickLine={{ stroke: gridColor }}
            ticks={[0, 25, 50, 75, 100]}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: isDark ? '#292524' : '#fffbeb',
              border: `1px solid ${gridColor}`,
              borderRadius: '4px',
              fontSize: '12px',
            }}
            labelStyle={{ color: textColor }}
          />
          <ReferenceLine
            y={baseline}
            stroke={isDark ? '#dc2626' : '#ef4444'}
            strokeDasharray="5 5"
            label={{
              value: `Scientists (${baseline}%)`,
              position: 'right',
              fill: textColor,
              fontSize: 10,
            }}
          />
          <Line
            type="monotone"
            dataKey="accuracy"
            stroke={lineColor}
            strokeWidth={2}
            dot={{ fill: lineColor, r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default AccuracyTimeline;
