// Simple Google Analytics 4 tracking utilities

declare global {
  interface Window {
    gtag: (command: string, ...args: any[]) => void;
    dataLayer: any[];
  }
}

// Debug function to test GA4 setup - call from browser console
export const testGA4 = () => {
  console.log('🔍 Testing GA4 Setup:');
  console.log('- gtag available:', typeof window.gtag === 'function');
  console.log('- dataLayer exists:', !!window.dataLayer);
  console.log('- dataLayer length:', window.dataLayer?.length || 0);
  
  if (typeof window.gtag === 'function') {
    console.log('✅ Sending test event...');
    window.gtag('event', 'test_event', {
      test_parameter: 'debug_test',
      timestamp: new Date().toISOString()
    });
    console.log('✅ Test event sent! Check GA4 DebugView in 30 seconds.');
  } else {
    console.error('❌ gtag not available - GA4 not loaded properly');
  }
};

// Make testGA4 available globally for console debugging
if (typeof window !== 'undefined') {
  (window as any).testGA4 = testGA4;
}

// Track when user answers a card
export const trackCardAnswered = (prediction: 'yes' | 'no', isCorrect: boolean, cardsPlayed: number) => {
  console.log('🔍 GA Debug - trackCardAnswered called:', { prediction, isCorrect, cardsPlayed });
  
  if (typeof window.gtag === 'function') {
    console.log('✅ GA Debug - gtag found, sending event');
    window.gtag('event', 'card_answered', {
      prediction,
      correct: isCorrect,
      cards_played: cardsPlayed,
    });
  } else {
    console.warn('❌ GA Debug - gtag not available');
  }
};

// Track when user completes a card (sees results and clicks next)
export const trackCardCompleted = (cardsPlayed: number, streak: number, totalCorrect: number, totalWrong: number) => {
  console.log('🔍 GA Debug - trackCardCompleted called:', { cardsPlayed, streak, totalCorrect, totalWrong });
  
  if (typeof window.gtag === 'function') {
    console.log('✅ GA Debug - gtag found, sending event');
    window.gtag('event', 'card_completed', {
      cards_played: cardsPlayed,
      streak,
      total_correct: totalCorrect,
      total_wrong: totalWrong,
    });
  } else {
    console.warn('❌ GA Debug - gtag not available');
  }
};

// Track milestone events every 5 cards
export const trackMilestone = (cardsPlayed: number, correctCount: number, wrongCount: number) => {
  console.log('🔍 GA Debug - trackMilestone called:', { cardsPlayed, correctCount, wrongCount });

  if (typeof window.gtag === 'function') {
    console.log('✅ GA Debug - gtag found, sending event');
    window.gtag('event', 'session_milestone', {
      cards_played: cardsPlayed,
      correct_count: correctCount,
      wrong_count: wrongCount,
      accuracy: correctCount / (correctCount + wrongCount),
    });
  } else {
    console.warn('❌ GA Debug - gtag not available');
  }
};

// Track page views
export const trackPageView = (pageName: string, pageTitle?: string) => {
  console.log('🔍 GA Debug - trackPageView called:', { pageName, pageTitle });

  if (typeof window.gtag === 'function') {
    console.log('✅ GA Debug - gtag found, sending event');
    window.gtag('event', 'page_view', {
      page_name: pageName,
      page_title: pageTitle || pageName,
    });
  } else {
    console.warn('❌ GA Debug - gtag not available');
  }
};

// Track button clicks
export const trackButtonClick = (buttonName: string, location: string) => {
  console.log('🔍 GA Debug - trackButtonClick called:', { buttonName, location });

  if (typeof window.gtag === 'function') {
    console.log('✅ GA Debug - gtag found, sending event');
    window.gtag('event', 'button_click', {
      button_name: buttonName,
      location,
    });
  } else {
    console.warn('❌ GA Debug - gtag not available');
  }
};

// Track deck switches
export const trackDeckSwitch = (fromDeck: string | null, toDeck: string, deckSize: number) => {
  console.log('🔍 GA Debug - trackDeckSwitch called:', { fromDeck, toDeck, deckSize });

  if (typeof window.gtag === 'function') {
    console.log('✅ GA Debug - gtag found, sending event');
    window.gtag('event', 'deck_switch', {
      from_deck: fromDeck || 'initial',
      to_deck: toDeck,
      deck_size: deckSize,
    });
  } else {
    console.warn('❌ GA Debug - gtag not available');
  }
};

// Track modal opens
export const trackModalOpen = (modalName: string, cardId?: string) => {
  console.log('🔍 GA Debug - trackModalOpen called:', { modalName, cardId });

  if (typeof window.gtag === 'function') {
    console.log('✅ GA Debug - gtag found, sending event');
    window.gtag('event', 'modal_open', {
      modal_name: modalName,
      card_id: cardId,
    });
  } else {
    console.warn('❌ GA Debug - gtag not available');
  }
};

// Track skip actions
export const trackSkip = (phase: string, cardsPlayed: number, streak: number) => {
  console.log('🔍 GA Debug - trackSkip called:', { phase, cardsPlayed, streak });

  if (typeof window.gtag === 'function') {
    console.log('✅ GA Debug - gtag found, sending event');
    window.gtag('event', 'card_skipped', {
      phase,
      cards_played: cardsPlayed,
      streak,
    });
  } else {
    console.warn('❌ GA Debug - gtag not available');
  }
};

// Track time metrics - time spent on a card
export const trackCardTime = (timeSpent: number, phase: 'question' | 'reveal', answered: boolean) => {
  console.log('🔍 GA Debug - trackCardTime called:', { timeSpent, phase, answered });

  if (typeof window.gtag === 'function') {
    console.log('✅ GA Debug - gtag found, sending event');
    window.gtag('event', 'card_time', {
      time_spent_ms: timeSpent,
      phase,
      answered,
    });
  } else {
    console.warn('❌ GA Debug - gtag not available');
  }
};

// Track session duration
export const trackSessionDuration = (sessionDuration: number, cardsPlayed: number) => {
  console.log('🔍 GA Debug - trackSessionDuration called:', { sessionDuration, cardsPlayed });

  if (typeof window.gtag === 'function') {
    console.log('✅ GA Debug - gtag found, sending event');
    window.gtag('event', 'session_duration', {
      duration_ms: sessionDuration,
      cards_played: cardsPlayed,
      avg_time_per_card: cardsPlayed > 0 ? sessionDuration / cardsPlayed : 0,
    });
  } else {
    console.warn('❌ GA Debug - gtag not available');
  }
};