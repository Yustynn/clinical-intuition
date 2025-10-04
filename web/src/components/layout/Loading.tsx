import React from 'react';
import type { Theme } from '../../utils/theme';

interface LoadingProps {
  theme: Theme;
}

const Loading: React.FC<LoadingProps> = ({ theme }) => {
  return (
    <div className={`min-h-screen w-full flex items-center justify-center ${theme.root}`}>
      <div className={`text-center ${theme.font}`}>
        <div className="relative">
          <div className={`w-16 h-16 border-4 border-amber-500 rounded-full border-t-transparent animate-spin mx-auto`}></div>
        </div>
        <p className={`mt-4 text-lg opacity-70`}>Loading cards...</p>
      </div>
    </div>
  );
};

export default Loading;
