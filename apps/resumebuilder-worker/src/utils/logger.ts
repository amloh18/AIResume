import { env } from '../config/env';

export type LogLevel = 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace';

const LOG_LEVELS: Record<LogLevel, number> = {
  fatal: 60,
  error: 50,
  warn: 40,
  info: 30,
  debug: 20,
  trace: 10,
};

export interface LogContext {
  source?: string;
  runId?: string;
  jobId?: string;
  durationMs?: number;
  status?: string;
  batchIndex?: number;
  count?: number;
  [key: string]: any;
}

class StructuredLogger {
  private level: LogLevel = 'info';
  private minLevelVal: number = 30;
  private defaultContext: Record<string, any> = {};

  constructor(context: Record<string, any> = {}) {
    this.level = (env.LOG_LEVEL as LogLevel) || 'info';
    this.minLevelVal = LOG_LEVELS[this.level] ?? 30;
    this.defaultContext = {
      service: env.SERVICE_NAME,
      env: env.NODE_ENV,
      ...context,
    };
  }

  private log(level: LogLevel, message: string, context?: Record<string, any>, error?: Error | any) {
    const levelVal = LOG_LEVELS[level] ?? 30;
    if (levelVal < this.minLevelVal) return;

    const entry: Record<string, any> = {
      timestamp: new Date().toISOString(),
      level: level.toUpperCase(),
      message,
      ...this.defaultContext,
      ...(context || {}),
    };

    if (error) {
      entry.error = {
        message: error.message || String(error),
        stack: error.stack,
        code: error.code,
        name: error.name,
      };
    }

    if (env.NODE_ENV === 'development') {
      const color =
        level === 'error' || level === 'fatal'
          ? '\x1b[31m'
          : level === 'warn'
          ? '\x1b[33m'
          : level === 'info'
          ? '\x1b[32m'
          : '\x1b[36m';
      const reset = '\x1b[0m';
      const src = entry.source ? ` [${entry.source}]` : '';
      const run = entry.runId ? ` (${entry.runId.slice(0, 8)})` : '';
      console.log(`${color}${entry.timestamp} ${entry.level}${reset}${src}${run}: ${message}`);
      if (entry.error) console.error(entry.error);
    } else {
      console.log(JSON.stringify(entry));
    }
  }

  info(message: string, context?: Record<string, any>) {
    this.log('info', message, context);
  }

  warn(message: string, context?: Record<string, any>, error?: Error | any) {
    this.log('warn', message, context, error);
  }

  error(message: string, error?: Error | any, context?: Record<string, any>) {
    this.log('error', message, context, error);
  }

  debug(message: string, context?: Record<string, any>) {
    this.log('debug', message, context);
  }

  child(context: Record<string, any>): StructuredLogger {
    return new StructuredLogger({
      ...this.defaultContext,
      ...context,
    });
  }
}

export const logger = new StructuredLogger();

export function createSourceLogger(source: string, runId?: string) {
  return logger.child({
    source,
    ...(runId ? { runId } : {}),
  });
}
