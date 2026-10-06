/**
 * Compatibility façade over the **single** structured logger (`./structured-logger`).
 *
 * ## Why this file still exists
 *
 * The repo used to ship three server-side loggers with three different signatures:
 * `lib/logger.ts` (string levels, `error(message, metadata, error)`), `lib/structured-logger.ts`
 * (numeric levels, `error(message, error, context, metadata)`) and `lib/edge-logger.ts` (a third
 * shape again). Which one a file imported decided its log format, its level filtering and whether a
 * correlation id could ever appear. They are now one implementation — this module only adapts the
 * older call signature so existing callers (e.g. `applicationDryRunService`) keep working unchanged.
 *
 * New code should import `log` from `@/lib/structured-logger` directly.
 */

import { log as coreLog } from './structured-logger';

export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  service: string;
  userId?: string;
  requestId?: string;
  correlationId?: string;
  metadata?: Record<string, any>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

const isErrorLike = (value: unknown): value is Error =>
  value instanceof Error || (Boolean(value) && typeof (value as any).message === 'string' && typeof (value as any).stack === 'string');

class Logger {
  constructor(private service: string = 'airesume-app') {}

  private emit(
    level: keyof typeof LogLevel,
    message: string,
    metadata?: Record<string, any>,
    error?: Error
  ): void {
    const prefixed = `[${this.service}] ${message}`;
    const context: Record<string, any> = { service: this.service, ...metadata };

    switch (level) {
      case 'ERROR':
        coreLog.error(prefixed, error, context);
        break;
      case 'WARN':
        coreLog.warn(prefixed, context);
        break;
      case 'INFO':
        coreLog.info(prefixed, context);
        break;
      case 'DEBUG':
        coreLog.debug(prefixed, context);
        break;
    }
  }

  /**
   * `error(message, metadata?, error?)` — the historical shape. Callers in this repo also use the
   * shorter `error(message, error)`, so an `Error` passed as the metadata slot is promoted to the
   * error slot instead of being serialised into `{}` (which is what it used to do).
   */
  error(message: string, metadata?: Record<string, any> | Error, error?: Error): void {
    if (!error && isErrorLike(metadata)) {
      this.emit('ERROR', message, undefined, metadata as Error);
      return;
    }
    this.emit('ERROR', message, metadata, error);
  }

  warn(message: string, metadata?: Record<string, any>): void {
    this.emit('WARN', message, metadata);
  }

  info(message: string, metadata?: Record<string, any>): void {
    this.emit('INFO', message, metadata);
  }

  debug(message: string, metadata?: Record<string, any>): void {
    this.emit('DEBUG', message, metadata);
  }

  // Convenience methods for common use cases
  auth(message: string, metadata?: Record<string, any>): void {
    this.info(`[AUTH] ${message}`, metadata);
  }

  api(message: string, metadata?: Record<string, any>): void {
    this.info(`[API] ${message}`, metadata);
  }

  db(message: string, metadata?: Record<string, any>): void {
    this.info(`[DB] ${message}`, metadata);
  }

  email(message: string, metadata?: Record<string, any>): void {
    this.info(`[EMAIL] ${message}`, metadata);
  }

  payment(message: string, metadata?: Record<string, any>): void {
    this.info(`[PAYMENT] ${message}`, metadata);
  }

  // Performance logging
  performance(operation: string, duration: number, metadata?: Record<string, any>): void {
    coreLog.performance(`${operation} (${this.service})`, duration, metadata);
  }

  // Security logging
  security(event: string, metadata?: Record<string, any>): void {
    this.warn(`[SECURITY] ${event}`, metadata);
  }
}

// Create default logger instance
export const logger = new Logger();

// Create service-specific loggers
export const createLogger = (service: string) => new Logger(service);

// Middleware logger for API routes
export const apiLogger = createLogger('api-middleware');

// Database logger
export const dbLogger = createLogger('database');

// Auth logger
export const authLogger = createLogger('authentication');

// Email logger
export const emailLogger = createLogger('email-service');

// Payment logger
export const paymentLogger = createLogger('payment-service');

export default logger;
