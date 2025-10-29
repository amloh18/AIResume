/**
 * Structured logging service for production
 * Replaces console.log with proper structured logging
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  metadata?: {
    userId?: string;
    sessionId?: string;
    requestId?: string;
    userAgent?: string;
    ip?: string;
    endpoint?: string;
    method?: string;
    statusCode?: number;
    responseTime?: number;
  };
}

class StructuredLogger {
  private logLevel: LogLevel;
  private isDevelopment: boolean;
  private isProduction: boolean;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.isProduction = process.env.NODE_ENV === 'production';
    
    // Set log level based on environment
    const envLogLevel = process.env.LOG_LEVEL?.toUpperCase();
    this.logLevel = envLogLevel ? LogLevel[envLogLevel as keyof typeof LogLevel] : 
                   this.isDevelopment ? LogLevel.DEBUG : LogLevel.INFO;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.logLevel;
  }

  private formatLogEntry(entry: LogEntry): string {
    if (this.isDevelopment) {
      // Pretty format for development
      const levelName = LogLevel[entry.level];
      const timestamp = new Date(entry.timestamp).toLocaleTimeString();
      let output = `[${timestamp}] ${levelName}: ${entry.message}`;
      
      if (entry.context) {
        output += `\n  Context: ${JSON.stringify(entry.context, null, 2)}`;
      }
      
      if (entry.error) {
        output += `\n  Error: ${entry.error.name}: ${entry.error.message}`;
        if (entry.error.stack) {
          output += `\n  Stack: ${entry.error.stack}`;
        }
      }
      
      if (entry.metadata) {
        output += `\n  Metadata: ${JSON.stringify(entry.metadata, null, 2)}`;
      }
      
      return output;
    } else {
      // JSON format for production
      return JSON.stringify(entry);
    }
  }

  private log(level: LogLevel, message: string, context?: Record<string, any>, error?: Error, metadata?: LogEntry['metadata']): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      metadata
    };

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack
      };
    }

    const formattedLog = this.formatLogEntry(entry);

    // Use appropriate console method based on level
    switch (level) {
      case LogLevel.DEBUG:
        console.debug(formattedLog);
        break;
      case LogLevel.INFO:
        console.info(formattedLog);
        break;
      case LogLevel.WARN:
        console.warn(formattedLog);
        break;
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        console.error(formattedLog);
        break;
    }

    // In production, also send to external logging service
    if (this.isProduction && level >= LogLevel.ERROR) {
      this.sendToExternalService(entry);
    }
  }

  private async sendToExternalService(entry: LogEntry): Promise<void> {
    // TODO: Integrate with external logging service (Sentry, LogRocket, etc.)
    // For now, we'll just log to console
    // In a real implementation, you would send to your chosen service
  }

  debug(message: string, context?: Record<string, any>, metadata?: LogEntry['metadata']): void {
    this.log(LogLevel.DEBUG, message, context, undefined, metadata);
  }

  info(message: string, context?: Record<string, any>, metadata?: LogEntry['metadata']): void {
    this.log(LogLevel.INFO, message, context, undefined, metadata);
  }

  warn(message: string, context?: Record<string, any>, metadata?: LogEntry['metadata']): void {
    this.log(LogLevel.WARN, message, context, undefined, metadata);
  }

  error(message: string, error?: Error, context?: Record<string, any>, metadata?: LogEntry['metadata']): void {
    this.log(LogLevel.ERROR, message, context, error, metadata);
  }

  fatal(message: string, error?: Error, context?: Record<string, any>, metadata?: LogEntry['metadata']): void {
    this.log(LogLevel.FATAL, message, context, error, metadata);
  }

  // Convenience methods for common logging patterns
  request(method: string, endpoint: string, statusCode: number, responseTime: number, metadata?: Partial<LogEntry['metadata']>): void {
    this.info(`${method} ${endpoint} ${statusCode}`, {
      method,
      endpoint,
      statusCode,
      responseTime
    }, {
      ...metadata,
      method,
      endpoint,
      statusCode,
      responseTime
    });
  }

  auth(action: string, userId?: string, success: boolean = true, metadata?: Partial<LogEntry['metadata']>): void {
    const level = success ? LogLevel.INFO : LogLevel.WARN;
    const message = `Auth ${action} ${success ? 'successful' : 'failed'}`;
    
    this.log(level, message, {
      action,
      success,
      userId
    }, undefined, {
      ...metadata,
      userId
    });
  }

  database(operation: string, collection: string, duration: number, success: boolean = true, metadata?: Partial<LogEntry['metadata']>): void {
    const level = success ? LogLevel.INFO : LogLevel.ERROR;
    const message = `Database ${operation} on ${collection} ${success ? 'completed' : 'failed'}`;
    
    this.log(level, message, {
      operation,
      collection,
      duration,
      success
    }, undefined, metadata);
  }

  performance(operation: string, duration: number, metadata?: Record<string, any>): void {
    const level = duration > 1000 ? LogLevel.WARN : LogLevel.INFO;
    const message = `Performance: ${operation} took ${duration}ms`;
    
    this.log(level, message, {
      operation,
      duration,
      ...metadata
    });
  }

  security(event: string, details: Record<string, any>, metadata?: Partial<LogEntry['metadata']>): void {
    this.warn(`Security event: ${event}`, details, metadata);
  }

  business(event: string, details: Record<string, any>, metadata?: Partial<LogEntry['metadata']>): void {
    this.info(`Business event: ${event}`, details, metadata);
  }
}

// Create singleton instance
export const logger = new StructuredLogger();

// Export convenience functions
export const log = {
  debug: (message: string, context?: Record<string, any>, metadata?: LogEntry['metadata']) => 
    logger.debug(message, context, metadata),
  info: (message: string, context?: Record<string, any>, metadata?: LogEntry['metadata']) => 
    logger.info(message, context, metadata),
  warn: (message: string, context?: Record<string, any>, metadata?: LogEntry['metadata']) => 
    logger.warn(message, context, metadata),
  error: (message: string, error?: Error, context?: Record<string, any>, metadata?: LogEntry['metadata']) => 
    logger.error(message, error, context, metadata),
  fatal: (message: string, error?: Error, context?: Record<string, any>, metadata?: LogEntry['metadata']) => 
    logger.fatal(message, error, context, metadata),
  request: (method: string, endpoint: string, statusCode: number, responseTime: number, metadata?: Partial<LogEntry['metadata']>) => 
    logger.request(method, endpoint, statusCode, responseTime, metadata),
  auth: (action: string, userId?: string, success?: boolean, metadata?: Partial<LogEntry['metadata']>) => 
    logger.auth(action, userId, success, metadata),
  database: (operation: string, collection: string, duration: number, success?: boolean, metadata?: Partial<LogEntry['metadata']>) => 
    logger.database(operation, collection, duration, success, metadata),
  performance: (operation: string, duration: number, metadata?: Record<string, any>) => 
    logger.performance(operation, duration, metadata),
  security: (event: string, details: Record<string, any>, metadata?: Partial<LogEntry['metadata']>) => 
    logger.security(event, details, metadata),
  business: (event: string, details: Record<string, any>, metadata?: Partial<LogEntry['metadata']>) => 
    logger.business(event, details, metadata)
};

export default logger;
