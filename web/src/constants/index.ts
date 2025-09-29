export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export const STORAGE_KEYS = {
  ANONYMOUS_SESSION: 'anonymous_session_data',
  THEME: 'retro_theme_mode',
  USER_PREFERENCES: 'user_preferences',
} as const;

export const HAPTIC_PATTERNS = {
  SUCCESS: 30,
  ERROR: [40, 60, 40],
  LIGHT_TAP: 10,
} as const;

import type { PredictionCard } from '../types';
import cardsData from '../../cards.json';

export const DEMO_DECK: PredictionCard[] = cardsData as PredictionCard[];