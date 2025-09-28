export interface PredictionCard {
  id: string;
  question: string;
  context: string;
  why: string;
  others: number;
  n: number;
  nct: string;
  correct: 'Yes' | 'No';
  parts: {
    intervention: string;
    verb: string;
    outcome: string;
    timeframe: string;
    population: string;
    comparator: string;
  };
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