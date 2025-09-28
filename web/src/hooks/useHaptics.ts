import { useCallback } from 'react';

export const useHaptics = () => {
  return useCallback((pattern: number | number[]) => {
    try {
      if (navigator && 'vibrate' in navigator) {
        navigator.vibrate(pattern);
      }
    } catch (error) {
      // Silently fail if vibration is not supported
    }
  }, []);
};