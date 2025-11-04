/**
 * Edge Runtime compatible logger for middleware
 * Minimal logging without any external dependencies
 */

export const log = {
  debug: (message: string, context?: Record<string, any>) => {
    if (typeof console !== 'undefined') {
      console.debug(`[DEBUG] ${message}`, context || '');
    }
  },
  
  info: (message: string, context?: Record<string, any>) => {
    if (typeof console !== 'undefined') {
      console.info(`[INFO] ${message}`, context || '');
    }
  },
  
  warn: (message: string, context?: Record<string, any>) => {
    if (typeof console !== 'undefined') {
      console.warn(`[WARN] ${message}`, context || '');
    }
  },
  
  error: (message: string, error?: Error, context?: Record<string, any>) => {
    if (typeof console !== 'undefined') {
      console.error(`[ERROR] ${message}`, error, context || '');
    }
  },
  
  performance: (operation: string, duration: number, context?: Record<string, any>) => {
    if (typeof console !== 'undefined' && duration > 100) {
      console.log(`[PERF] ${operation}: ${duration}ms`, context || '');
    }
  }
};