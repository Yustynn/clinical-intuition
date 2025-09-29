// Simple Google Analytics 4 tracking utilities

declare global {
  interface Window {
    gtag: (command: string, ...args: any[]) => void;
  }
}

// Track when user answers a card
export const trackCardAnswered = (prediction: 'yes' | 'no', isCorrect: boolean, cardsPlayed: number) => {
  if (typeof window.gtag === 'function') {
    window.gtag('event', 'card_answered', {
      prediction,
      correct: isCorrect,
      cards_played: cardsPlayed,
    });
  }
};

// Track when user completes a card (sees results and clicks next)
export const trackCardCompleted = (cardsPlayed: number, streak: number, totalCorrect: number, totalWrong: number) => {
  if (typeof window.gtag === 'function') {
    window.gtag('event', 'card_completed', {
      cards_played: cardsPlayed,
      streak,
      total_correct: totalCorrect,
      total_wrong: totalWrong,
    });
  }
};

// Track milestone events every 5 cards
export const trackMilestone = (cardsPlayed: number, correctCount: number, wrongCount: number) => {
  if (typeof window.gtag === 'function') {
    window.gtag('event', 'session_milestone', {
      cards_played: cardsPlayed,
      correct_count: correctCount,
      wrong_count: wrongCount,
      accuracy: correctCount / (correctCount + wrongCount),
    });
  }
};