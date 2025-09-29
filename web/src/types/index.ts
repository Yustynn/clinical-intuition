export interface PredictionCard {
  study: {
    nct_id: string;
    title: string;
  };
  card_id: string;
  front_details: {
    question: string;
    intervention_fragment: string;
    intervention_group_fragment: string;
    outcome_fragment: string;
    comparator_group_fragment: string;
    timeframe_fragment: string;
  };
  p_value: string;
  num_participants: number;
  success: boolean;
  conditions: string[];
  keywords: string[];
}

export interface User {
  id: string;
  email?: string;
  isAnonymous: boolean;
  streak: number;
  totalAnswered: number;
  correctPredictions: number;
  createdAt: Date;
}

export interface CardAnswer {
  cardId: string;
  answer: 'Yes' | 'No';
  correct: boolean;
  timestamp: Date;
}

export interface GameState {
  currentStreak: number;
  totalAnswered: number;
  correctPredictions: number;
  currentCard: PredictionCard | null;
  cardHistory: CardAnswer[];
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isAnonymous: boolean;
  sessionId: string;
  tempData: AnonymousUserData;
}

export interface AnonymousUserData {
  streak: number;
  totalAnswered: number;
  correctPredictions: number;
  cardHistory: CardAnswer[];
}

export type FeedFilter = 'all' | 'behavioral' | 'pharmaceutical' | 'device';
export type Theme = 'light' | 'dark';
export type GamePhase = 'question' | 'reveal';