import React from 'react';
import type { Theme } from '../../utils/theme';
import type { PredictionCard } from '../../types';

interface QuestionStylesProps {
  theme: Theme;
  parts: PredictionCard['parts'];
}

const QuestionStyles: React.FC<QuestionStylesProps> = ({ theme, parts }) => {
  const { intervention, verb, outcome, timeframe, population, comparator } = parts;

  return (
    <div className="mt-4">
      <div className="text-base leading-relaxed">
        Did{' '}
        <span className="px-1 bg-amber-500/15 ring-1 ring-amber-500/20">
          {intervention}
        </span>{' '}
        <span className="px-1 bg-emerald-500/15 ring-1 ring-emerald-500/20 text-emerald-300 font-semibold">
          {verb}
        </span>{' '}
        <span className="px-1 bg-teal-500/15 ring-1 ring-teal-500/20">
          {outcome}
        </span>{' '}
        at{' '}
        <span className="px-1 bg-sky-500/15 ring-1 ring-sky-500/20">
          {timeframe}
        </span>{' '}
        in{' '}
        <span className="px-1 bg-violet-500/15 ring-1 ring-violet-500/20">
          {population}
        </span>{' '}
        vs{' '}
        <span className="px-1 bg-zinc-500/15 ring-1 ring-zinc-500/20">
          {comparator}
        </span>
        ?
      </div>
    </div>
  );
};

export default QuestionStyles;