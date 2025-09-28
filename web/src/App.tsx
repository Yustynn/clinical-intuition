import React, { useState, useMemo } from 'react';
import { getTheme } from './utils/theme';
import Landing from './components/layout/Landing';
import type { ThemeMode } from './utils/theme';

function App() {
  const [mode, setMode] = useState<ThemeMode>('dark');
  const theme = useMemo(() => getTheme(mode), [mode]);

  return (
    <div className={`${theme.root} min-h-screen w-full p-4 sm:p-8`}>
      <div className="mx-auto max-w-6xl">
        <Landing theme={theme} mode={mode} onModeChange={setMode} />
      </div>
    </div>
  );
}

export default App;