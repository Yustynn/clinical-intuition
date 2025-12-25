// Simple Google Analytics 4 tracking utilities

declare global {
  interface Window {
    gtag: (command: string, ...args: any[]) => void;
    dataLayer: any[];
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

// Track page views
export const trackPageView = (pageName: string, pageTitle?: string) => {
  if (typeof window.gtag === 'function') {
    window.gtag('event', 'page_view', {
      page_name: pageName,
      page_title: pageTitle || pageName,
    });
  }
};

// Track button clicks
export const trackButtonClick = (buttonName: string, location: string) => {
  if (typeof window.gtag === 'function') {
    window.gtag('event', 'button_click', {
      button_name: buttonName,
      location,
    });
  }
};

// Track deck switches
export const trackDeckSwitch = (fromDeck: string | null, toDeck: string, deckSize: number) => {
  if (typeof window.gtag === 'function') {
    window.gtag('event', 'deck_switch', {
      from_deck: fromDeck || 'initial',
      to_deck: toDeck,
      deck_size: deckSize,
    });
  }
};

// Track modal opens
export const trackModalOpen = (modalName: string, cardId?: string) => {
  if (typeof window.gtag === 'function') {
    window.gtag('event', 'modal_open', {
      modal_name: modalName,
      card_id: cardId,
    });
  }
};

// Track skip actions
export const trackSkip = (phase: string, cardsPlayed: number, streak: number) => {
  if (typeof window.gtag === 'function') {
    window.gtag('event', 'card_skipped', {
      phase,
      cards_played: cardsPlayed,
      streak,
    });
  }
};

// Track time metrics - time spent on a card
export const trackCardTime = (timeSpent: number, phase: 'question' | 'reveal', answered: boolean) => {
  if (typeof window.gtag === 'function') {
    window.gtag('event', 'card_time', {
      time_spent_ms: timeSpent,
      phase,
      answered,
    });
  }
};

// Track session duration
export const trackSessionDuration = (sessionDuration: number, cardsPlayed: number) => {
  if (typeof window.gtag === 'function') {
    window.gtag('event', 'session_duration', {
      duration_ms: sessionDuration,
      cards_played: cardsPlayed,
      avg_time_per_card: cardsPlayed > 0 ? sessionDuration / cardsPlayed : 0,
    });
  }
};
