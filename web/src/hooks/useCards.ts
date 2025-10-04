import { useState, useEffect } from 'react';
import type { PredictionCard } from '../types';

export function useCards() {
  const [cards, setCards] = useState<PredictionCard[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadCards = async () => {
      try {
        setLoading(true);
        const cardsModule = await import('../../cards.json');

        if (isMounted) {
          setCards(cardsModule.default as PredictionCard[]);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error('Failed to load cards'));
          setLoading(false);
        }
      }
    };

    loadCards();

    return () => {
      isMounted = false;
    };
  }, []);

  return { cards, loading, error };
}
