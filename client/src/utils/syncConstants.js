/**
 * Real-Time Watch Space Playback & Synchronization Configuration
 */

// Drift Correction Thresholds (in seconds)
export const SYNC_WARNING_THRESHOLD = 0.25; // 250ms — natural playback continues
export const SYNC_HARD_CORRECTION_THRESHOLD = 1.0; // 1.0s — triggers hard seek to projected position

// Sync Ping Loop Interval (ms)
export const SYNC_PING_INTERVAL_MS = 3000;

// Development Logging Utility
const IS_DEV = import.meta.env.MODE === 'development';

export const logger = {
  watchSpace: (...args) => {
    if (IS_DEV) console.log('[WATCHSPACE]', ...args);
  },
  playback: (...args) => {
    if (IS_DEV) console.log('[PLAYBACK]', ...args);
  },
  sync: (...args) => {
    if (IS_DEV) console.log('[SYNC]', ...args);
  },
  error: (...args) => {
    console.error('[WATCHSPACE ERROR]', ...args);
  },
};
