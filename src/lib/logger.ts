/**
 * Production-ready logging service
 * Replaces console.log with structured logging
 */

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
  metadata?: Record<string, any>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

class Logger {
  private service: string;
  private isProduction: boolean;

  constructor(service: string = 'cvcircle-app') {
    this.service = service;
    this.isProduction = process.env.NODE_ENV === 'production';
  }

  private createLogEntry(
    level: LogLevel,
    message: string,
    metadata?: Record<string, any>,
    error?: Error
  ): LogEntry {
    return {
      level,
      message,
      timestamp: new Date().toISOString(),
      service: this.service,
      metadata,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : undefined,
    };
  }

  private shouldLog(level: LogLevel): boolean {
    if (this.isProduction) {
      // In production, only log ERROR and WARN
      return level === LogLevel.ERROR || level === LogLevel.WARN;
    }
    // In development, log everything
    return true;
  }

  private output(entry: LogEntry): void {
    if (!this.shouldLog(entry.level)) return;

    if (this.isProduction) {
      // In production, use structured JSON logging
      console.log(JSON.stringify(entry));
    } else {
      // In development, use formatted console output
      const prefix = `[${entry.timestamp}] ${entry.level.toUpperCase()} [${entry.service}]`;
      const message = entry.metadata 
        ? `${prefix}: ${entry.message} ${JSON.stringify(entry.metadata, null, 2)}`
        : `${prefix}: ${entry.message}`;
      
      switch (entry.level) {
        case LogLevel.ERROR:
          console.error(message);
          if (entry.error) console.error(entry.error.stack);
          break;
        case LogLevel.WARN:
          console.warn(message);
          break;
        case LogLevel.INFO:
          console.info(message);
          break;
        case LogLevel.DEBUG:
          console.debug(message);
          break;
      }
    }
  }

  error(message: string, metadata?: Record<string, any>, error?: Error): void {
    this.output(this.createLogEntry(LogLevel.ERROR, message, metadata, error));
  }

  warn(message: string, metadata?: Record<string, any>): void {
    this.output(this.createLogEntry(LogLevel.WARN, message, metadata));
  }

  info(message: string, metadata?: Record<string, any>): void {
    this.output(this.createLogEntry(LogLevel.INFO, message, metadata));
  }

  debug(message: string, metadata?: Record<string, any>): void {
    this.output(this.createLogEntry(LogLevel.DEBUG, message, metadata));
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
    this.info(`[PERF] ${operation} completed in ${duration}ms`, {
      operation,
      duration,
      ...metadata,
    });
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
