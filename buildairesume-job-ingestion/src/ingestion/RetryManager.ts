import { logger } from '../utils/logger';

export interface RetryOptions {
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  shouldRetry?: (error: any) => boolean;
}

export class RetryManager {
  static async withRetry<T>(
    operation: () => Promise<T>,
    contextName: string,
    options?: RetryOptions
  ): Promise<T> {
    const maxAttempts = options?.maxAttempts || 3;
    let delayMs = options?.initialDelayMs || 1000;
    const maxDelayMs = options?.maxDelayMs || 30000;
    const multiplier = options?.backoffMultiplier || 2;

    let lastError: any;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (err: any) {
        lastError = err;

        if (options?.shouldRetry && !options.shouldRetry(err)) {
          throw err;
        }

        if (attempt >= maxAttempts) {
          logger.error(`Operation [${contextName}] failed after ${maxAttempts} attempts:`, err);
          throw err;
        }

        // Apply exponential backoff with jitter
        const jitter = Math.random() * 200;
        const sleepDuration = Math.min(delayMs + jitter, maxDelayMs);

        logger.warn(`Retry attempt ${attempt}/${maxAttempts} for [${contextName}] in ${Math.round(sleepDuration)}ms...`);
        await new Promise((resolve) => setTimeout(resolve, sleepDuration));
        delayMs *= multiplier;
      }
    }

    throw lastError;
  }
}
