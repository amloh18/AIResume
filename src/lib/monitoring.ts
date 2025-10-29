/**
 * Production monitoring and error tracking
 * Integrates with Sentry for error tracking and performance monitoring
 */

import { logger } from './logger';

// Sentry configuration
let Sentry: any = null;
let isSentryInitialized = false;

// Initialize Sentry if available
async function initializeSentry() {
  if (isSentryInitialized) return;

  try {
    // Dynamic import to avoid bundling Sentry in development
    if (process.env.NODE_ENV === 'production' && process.env.SENTRY_DSN) {
      Sentry = await import('@sentry/nextjs');
      
      Sentry.init({
        dsn: process.env.SENTRY_DSN,
        environment: process.env.NODE_ENV,
        tracesSampleRate: 0.1, // 10% of transactions for performance monitoring
        debug: false,
        beforeSend(event) {
          // Filter out non-critical errors
          if (event.exception) {
            const error = event.exception.values?.[0];
            if (error?.type === 'ChunkLoadError' || error?.type === 'Loading chunk') {
              return null; // Don't send chunk load errors
            }
          }
          return event;
        },
        integrations: [
          new Sentry.Integrations.Http({ tracing: true }),
          new Sentry.Integrations.Mongo({ useMongoose: true }),
        ],
      });
      
      isSentryInitialized = true;
      logger.info('Sentry initialized successfully');
    }
  } catch (error) {
    logger.warn('Failed to initialize Sentry', { error: error instanceof Error ? error.message : 'Unknown error' });
  }
}

// Error tracking
export class ErrorTracker {
  static async captureException(error: Error, context?: Record<string, any>) {
    await initializeSentry();
    
    if (Sentry) {
      Sentry.captureException(error, {
        tags: context?.tags || {},
        extra: context?.extra || {},
        user: context?.user || {},
      });
    }
    
    // Also log locally
    logger.error('Exception captured', {
      error: error.message,
      stack: error.stack,
      ...context,
    });
  }

  static async captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info', context?: Record<string, any>) {
    await initializeSentry();
    
    if (Sentry) {
      Sentry.captureMessage(message, level, {
        tags: context?.tags || {},
        extra: context?.extra || {},
        user: context?.user || {},
      });
    }
    
    // Also log locally
    logger[level](message, context);
  }

  static setUser(user: { id: string; email?: string; role?: string }) {
    if (Sentry) {
      Sentry.setUser(user);
    }
  }

  static addBreadcrumb(message: string, category: string, level: 'info' | 'warning' | 'error' = 'info', data?: Record<string, any>) {
    if (Sentry) {
      Sentry.addBreadcrumb({
        message,
        category,
        level,
        data,
        timestamp: Date.now() / 1000,
      });
    }
  }

  static setTag(key: string, value: string) {
    if (Sentry) {
      Sentry.setTag(key, value);
    }
  }

  static setContext(key: string, context: Record<string, any>) {
    if (Sentry) {
      Sentry.setContext(key, context);
    }
  }
}

// Performance monitoring
export class PerformanceMonitor {
  static startTransaction(name: string, op: string = 'custom') {
    if (Sentry) {
      return Sentry.startTransaction({ name, op });
    }
    return null;
  }

  static startSpan(transaction: any, name: string, op: string = 'custom') {
    if (Sentry && transaction) {
      return transaction.startChild({ name, op });
    }
    return null;
  }

  static finishSpan(span: any) {
    if (span) {
      span.finish();
    }
  }

  static finishTransaction(transaction: any) {
    if (transaction) {
      transaction.finish();
    }
  }

  // Convenience method for timing operations
  static async timeOperation<T>(
    name: string,
    operation: () => Promise<T>,
    context?: Record<string, any>
  ): Promise<T> {
    const transaction = this.startTransaction(name, 'function');
    const span = this.startSpan(transaction, name, 'function');
    
    try {
      const result = await operation();
      this.finishSpan(span);
      this.finishTransaction(transaction);
      return result;
    } catch (error) {
      this.finishSpan(span);
      this.finishTransaction(transaction);
      
      await ErrorTracker.captureException(error as Error, {
        tags: { operation: name },
        extra: context,
      });
      
      throw error;
    }
  }
}

// API monitoring
export class APIMonitor {
  static async monitorAPI<T>(
    endpoint: string,
    method: string,
    operation: () => Promise<T>,
    context?: Record<string, any>
  ): Promise<T> {
    const startTime = Date.now();
    
    try {
      const result = await operation();
      const duration = Date.now() - startTime;
      
      // Log successful API call
      logger.api(`API call successful: ${method} ${endpoint}`, {
        endpoint,
        method,
        duration,
        status: 'success',
        ...context,
      });
      
      // Track performance
      if (duration > 1000) { // Log slow API calls
        logger.warn('Slow API call detected', {
          endpoint,
          method,
          duration,
          ...context,
        });
      }
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Log failed API call
      logger.error(`API call failed: ${method} ${endpoint}`, {
        endpoint,
        method,
        duration,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        ...context,
      });
      
      // Track error
      await ErrorTracker.captureException(error as Error, {
        tags: { 
          endpoint, 
          method,
          type: 'api_error',
        },
        extra: context,
      });
      
      throw error;
    }
  }
}

// Database monitoring
export class DatabaseMonitor {
  static async monitorQuery<T>(
    operation: string,
    query: () => Promise<T>,
    context?: Record<string, any>
  ): Promise<T> {
    const startTime = Date.now();
    
    try {
      const result = await query();
      const duration = Date.now() - startTime;
      
      logger.db(`Database operation successful: ${operation}`, {
        operation,
        duration,
        ...context,
      });
      
      // Track slow queries
      if (duration > 500) { // Log slow database operations
        logger.warn('Slow database operation detected', {
          operation,
          duration,
          ...context,
        });
      }
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      logger.error(`Database operation failed: ${operation}`, {
        operation,
        duration,
        error: error instanceof Error ? error.message : 'Unknown error',
        ...context,
      });
      
      await ErrorTracker.captureException(error as Error, {
        tags: { 
          operation,
          type: 'database_error',
        },
        extra: context,
      });
      
      throw error;
    }
  }
}

// Security monitoring
export class SecurityMonitor {
  static trackSuspiciousActivity(event: string, context: Record<string, any>) {
    logger.security(`Suspicious activity detected: ${event}`, context);
    
    ErrorTracker.captureMessage(`Suspicious activity: ${event}`, 'warning', {
      tags: { type: 'security' },
      extra: context,
    });
  }

  static trackAuthFailure(email: string, reason: string, context: Record<string, any>) {
    logger.security(`Authentication failure: ${email}`, {
      email,
      reason,
      ...context,
    });
    
    ErrorTracker.captureMessage(`Auth failure: ${email}`, 'warning', {
      tags: { type: 'auth_failure' },
      extra: { email, reason, ...context },
    });
  }

  static trackRateLimitExceeded(ip: string, endpoint: string, context: Record<string, any>) {
    logger.security(`Rate limit exceeded: ${ip}`, {
      ip,
      endpoint,
      ...context,
    });
    
    ErrorTracker.captureMessage(`Rate limit exceeded: ${ip}`, 'warning', {
      tags: { type: 'rate_limit' },
      extra: { ip, endpoint, ...context },
    });
  }
}

// Initialize monitoring on module load
if (process.env.NODE_ENV === 'production') {
  initializeSentry();
}

export default {
  ErrorTracker,
  PerformanceMonitor,
  APIMonitor,
  DatabaseMonitor,
  SecurityMonitor,
};
