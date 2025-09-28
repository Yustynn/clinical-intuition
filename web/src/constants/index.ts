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

export const DEMO_DECK: PredictionCard[] = [
  {
    id: "CARD-1234",
    question: "At 6 months, did treadmill training increase daily energy expenditure vs stretching in stroke survivors?",
    context: "stroke survivors • 6 months • vs stretching",
    why: "At 6 months, treadmill training increased daily energy expenditure vs stretching (p=0.02; n=142).",
    others: 62,
    n: 1204,
    nct: "NCT02043574",
    correct: "Yes",
    parts: {
      intervention: "treadmill training",
      verb: "increase",
      outcome: "daily energy expenditure",
      timeframe: "6 months",
      population: "stroke survivors",
      comparator: "stretching"
    }
  },
  {
    id: "CARD-5678",
    question: "Did exposure therapy reduce CAPS-IV scores at 3-month follow-up in combat-related PTSD?",
    context: "combat PTSD • 3 months • exposure vs control",
    why: "Exposure therapy reduced CAPS-IV vs control (Δ=-9.4; p=0.01; n=88).",
    others: 54,
    n: 862,
    nct: "NCT00371176",
    correct: "Yes",
    parts: {
      intervention: "exposure therapy",
      verb: "reduce",
      outcome: "CAPS-IV score",
      timeframe: "3 months",
      population: "combat-related PTSD",
      comparator: "control"
    }
  },
  {
    id: "CARD-9012",
    question: "Did CBT improve Roland-Morris disability score at 9 months in chronic low back pain?",
    context: "low back pain • 9 months • CBT vs usual care",
    why: "CBT improved RMDQ at 9 months (p=0.03; n=240).",
    others: 49,
    n: 1011,
    nct: "NCT00386243",
    correct: "Yes",
    parts: {
      intervention: "CBT",
      verb: "improve",
      outcome: "Roland–Morris disability score",
      timeframe: "9 months",
      population: "chronic low back pain",
      comparator: "usual care"
    }
  },
];