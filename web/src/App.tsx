import { useState, useMemo } from 'react';
import { getTheme } from './utils/theme';
import Landing from './components/layout/Landing';
import Loading from './components/layout/Loading';
import { useCards } from './hooks/useCards';
import type { ThemeMode } from './utils/theme';

function App() {
  const [mode, setMode] = useState<ThemeMode>('light');
  const theme = useMemo(() => getTheme(mode), [mode]);
  const { cards, loading, error } = useCards();

  if (loading) {
    return <Loading theme={theme} />;
  }

  if (error || !cards) {
    return (
      <div className={`${theme.root} min-h-screen w-full p-4 sm:p-8`}>
        <div className="mx-auto max-w-6xl">
          <div className={`text-center ${theme.font}`}>
            <h1 className="text-2xl font-semibold mb-4">Error loading cards</h1>
            <p className="opacity-70">Please refresh the page to try again.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${theme.root} min-h-screen w-full p-4 sm:p-8`}>
      <div className="mx-auto max-w-6xl">
        <Landing theme={theme} mode={mode} onModeChange={setMode} allCards={cards} />
      </div>
    </div>
  );
}

export default App;