import React from 'react';
import type { Theme } from '../../utils/theme';
import type { PredictionCard } from '../../types';

interface QuestionStylesProps {
  theme: Theme;
  fragments: PredictionCard['front_details'];
}

const QuestionStyles: React.FC<QuestionStylesProps> = ({ fragments }) => {
  const { 
    intervention_fragment, 
    intervention_group_fragment, 
    outcome_fragment, 
    comparator_group_fragment, 
    timeframe_fragment 
  } = fragments;

  return (
    <div className="mt-4">
      <div className="text-base leading-relaxed">
        Did{' '}
        <span className="px-1 bg-amber-500/15 ring-1 ring-amber-500/20">
          {intervention_fragment}
        </span>{' '}
        improve{' '}
        <span className="px-1 bg-teal-500/15 ring-1 ring-teal-500/20">
          {outcome_fragment}
        </span>{' '}
        in{' '}
        <span className="px-1 bg-violet-500/15 ring-1 ring-violet-500/20">
          {intervention_group_fragment}
        </span>{' '}
        compared to{' '}
        <span className="px-1 bg-zinc-500/15 ring-1 ring-zinc-500/20">
          {comparator_group_fragment}
        </span>{' '}
        after{' '}
        <span className="px-1 bg-sky-500/15 ring-1 ring-sky-500/20">
          {timeframe_fragment}
        </span>
        ?
      </div>
    </div>
  );
};

export default QuestionStyles;