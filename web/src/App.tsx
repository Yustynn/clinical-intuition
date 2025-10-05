import { useState, useMemo, useEffect } from 'react';
import { getTheme } from './utils/theme';
import Landing from './components/layout/Landing';
import Stats from './components/pages/Stats';
import Loading from './components/layout/Loading';
import { useCards } from './hooks/useCards';
import { AuthProvider } from './contexts/AuthContext';
import type { ThemeMode } from './utils/theme';

type Page = 'landing' | 'stats';

function App() {
  const [mode, setMode] = useState<ThemeMode>('light');
  const [currentPage, setCurrentPage] = useState<Page>('landing');
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const theme = useMemo(() => getTheme(mode), [mode]);
  const { cards, loading, error } = useCards();

  // Handle URL changes (hash-based routing)
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#/card/')) {
        const cardId = hash.replace('#/card/', '');
        setSelectedCardId(cardId);
        setCurrentPage('landing');
      } else if (hash === '#/stats') {
        setCurrentPage('stats');
      } else {
        setCurrentPage('landing');
      }
    };

    // Handle initial load
    handleHashChange();

    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigateToCard = (cardId: string) => {
    window.location.hash = `/card/${cardId}`;
  };

  const navigateToStats = () => {
    window.location.hash = '/stats';
  };

  const navigateToLanding = () => {
    window.location.hash = '';
  };

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
    <AuthProvider>
      <div className={`${theme.root} min-h-screen w-full p-4 sm:p-8`}>
        <div className="mx-auto max-w-6xl">
          {currentPage === 'landing' && (
            <Landing
              theme={theme}
              mode={mode}
              onModeChange={setMode}
              allCards={cards}
              selectedCardId={selectedCardId}
              onNavigateToStats={navigateToStats}
            />
          )}
          {currentPage === 'stats' && (
            <Stats
              theme={theme}
              onBack={navigateToLanding}
              allCards={cards}
              onCardClick={navigateToCard}
            />
          )}
        </div>
      </div>
    </AuthProvider>
  );
}

export default App;