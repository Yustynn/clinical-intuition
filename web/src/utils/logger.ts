/**
 * Development-only logger
 * Logs only when NOT in production
 */

const isDev = import.meta.env.DEV;

export const devLog = {
  log: (...args: any[]) => {
    if (isDev) console.log(...args);
  },
  error: (...args: any[]) => {
    if (isDev) console.error(...args);
  },
  warn: (...args: any[]) => {
    if (isDev) console.warn(...args);
  },
};
