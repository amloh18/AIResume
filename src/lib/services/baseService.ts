// @ts-nocheck
/**
 * Base Service Class
 * 
 * Provides common functionality for all services:
 * - Standardized error handling
 * - Retry logic with exponential backoff
 * - Circuit breaker pattern
 * - Logging integration
 * - Performance monitoring
 */

import { ErrorTracker, PerformanceMonitor } from '@/lib/monitoring';
import { logger } from '@/lib/structured-logger';
import { ActivityLogService } from './activityLogService';

export interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  retryableErrors?: string[];
}

export interface CircuitBreakerOptions {
  failureThreshold?: number;
  resetTimeout?: number;
  halfOpenTimeout?: number;
}

export class ServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public context?: Record<string, any>
  ) {
    super(message);
    this.name = 'ServiceError';
  }
}

export abstract class BaseService {
  protected serviceName: string;
  private circuitBreakers: Map<string, {
    failures: number;
    lastFailureTime: number;
    state: 'closed' | 'open' | 'half-open';
  }> = new Map();

  constructor(serviceName: string) {
    this.serviceName = serviceName;
  }

  /**
   * Execute operation with retry logic
   */
  protected async withRetry<T>(
    operation: () => Promise<T>,
    options: RetryOptions = {},
    context?: Record<string, any>
  ): Promise<T> {
    const {
      maxRetries = 3,
      initialDelay = 1000,
      maxDelay = 10000,
      backoffMultiplier = 2,
      retryableErrors = ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNREFUSED']
    } = options;

    let lastError: Error | null = null;
    let delay = initialDelay;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await operation();
        
        // Log successful retry if it wasn't the first attempt
        if (attempt > 0) {
          logger.info(`${this.serviceName}: Operation succeeded after ${attempt} retries`, {
            service: this.serviceName,
            attempts: attempt + 1,
            ...context
          });
        }

        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // Check if error is retryable
        const isRetryable = this.isRetryableError(lastError, retryableErrors);
        
        if (attempt < maxRetries && isRetryable) {
          logger.warn(`${this.serviceName}: Retry attempt ${attempt + 1}/${maxRetries}`, {
            service: this.serviceName,
            attempt: attempt + 1,
            error: lastError.message,
            delay,
            ...context
          });

          await this.sleep(delay);
          delay = Math.min(delay * backoffMultiplier, maxDelay);
        } else {
          // Not retryable or max retries reached
          break;
        }
      }
    }

    // All retries exhausted
    throw this.handleError(lastError || new Error('Unknown error'), context);
  }

  /**
   * Execute operation with circuit breaker
   */
  protected async withCircuitBreaker<T>(
    operation: () => Promise<T>,
    key: string,
    options: CircuitBreakerOptions = {},
    context?: Record<string, any>
  ): Promise<T> {
    const {
      failureThreshold = 5,
      resetTimeout = 60000, // 1 minute
      halfOpenTimeout = 30000 // 30 seconds
    } = options;

    const breaker = this.getCircuitBreaker(key, failureThreshold, resetTimeout, halfOpenTimeout);

    // Check circuit breaker state
    if (breaker.state === 'open') {
      const timeSinceLastFailure = Date.now() - breaker.lastFailureTime;
      if (timeSinceLastFailure > resetTimeout) {
        breaker.state = 'half-open';
        logger.info(`${this.serviceName}: Circuit breaker half-open for ${key}`, {
          service: this.serviceName,
          key,
          ...context
        });
      } else {
        throw new ServiceError(
          `Circuit breaker is open for ${key}`,
          'CIRCUIT_BREAKER_OPEN',
          503,
          { key, resetIn: resetTimeout - timeSinceLastFailure }
        );
      }
    }

    try {
      const result = await operation();
      
      // Success - reset circuit breaker if in half-open state
      if (breaker.state === 'half-open') {
        breaker.state = 'closed';
        breaker.failures = 0;
        logger.info(`${this.serviceName}: Circuit breaker closed for ${key}`, {
          service: this.serviceName,
          key,
          ...context
        });
      }
      
      return result;
    } catch (error) {
      breaker.failures++;
      breaker.lastFailureTime = Date.now();

      if (breaker.failures >= failureThreshold) {
        breaker.state = 'open';
        logger.error(`${this.serviceName}: Circuit breaker opened for ${key}`, {
          service: this.serviceName,
          key,
          failures: breaker.failures,
          ...context
        });
      }

      throw error;
    }
  }

  /**
   * Get or create circuit breaker for a key
   */
  private getCircuitBreaker(
    key: string,
    failureThreshold: number,
    resetTimeout: number,
    halfOpenTimeout: number
  ) {
    if (!this.circuitBreakers.has(key)) {
      this.circuitBreakers.set(key, {
        failures: 0,
        lastFailureTime: 0,
        state: 'closed'
      });
    }
    return this.circuitBreakers.get(key)!;
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: Error, retryableErrors: string[]): boolean {
    // Check error code
    if ((error as any).code && retryableErrors.includes((error as any).code)) {
      return true;
    }

    // Check error message for common retryable patterns
    const message = error.message.toLowerCase();
    const retryablePatterns = ['timeout', 'network', 'connection', 'temporary', 'retry'];
    return retryablePatterns.some(pattern => message.includes(pattern));
  }

  /**
   * Handle and log errors
   */
  protected handleError(error: unknown, context?: Record<string, any>): ServiceError {
    const serviceError = error instanceof ServiceError
      ? error
      : error instanceof Error
        ? new ServiceError(error.message, 'SERVICE_ERROR', 500, context)
        : new ServiceError(String(error), 'UNKNOWN_ERROR', 500, context);

    // Log error
    logger.error(`${this.serviceName}: Service error`, serviceError, {
      service: this.serviceName,
      code: serviceError.code,
      statusCode: serviceError.statusCode,
      ...context,
      ...serviceError.context
    });

    // Track error
    ErrorTracker.captureException(serviceError, {
      tags: {
        service: this.serviceName,
        code: serviceError.code
      },
      extra: {
        ...context,
        ...serviceError.context
      }
    }).catch(err => {
      // Don't fail if error tracking fails
      console.error('Failed to track error:', err);
    });

    return serviceError;
  }

  /**
   * Time an operation and log performance
   */
  protected async timeOperation<T>(
    operationName: string,
    operation: () => Promise<T>,
    context?: Record<string, any>
  ): Promise<T> {
    const startTime = Date.now();
    
    try {
      const result = await PerformanceMonitor.timeOperation(
        `${this.serviceName}.${operationName}`,
        operation,
        {
          service: this.serviceName,
          operation: operationName,
          ...context
        }
      );

      const duration = Date.now() - startTime;
      
      // Log performance
      logger.performance(`${this.serviceName}.${operationName}`, duration, {
        service: this.serviceName,
        operation: operationName,
        ...context
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      logger.error(`${this.serviceName}.${operationName} failed`, error instanceof Error ? error : new Error(String(error)), {
        service: this.serviceName,
        operation: operationName,
        duration,
        ...context
      });

      throw error;
    }
  }

  /**
   * Log business event
   */
  protected async logBusinessEvent(
    event: string,
    details: Record<string, any>,
    userId?: string
  ): Promise<void> {
    try {
      await ActivityLogService.log({
        logType: 'business',
        userId: userId as any,
        action: event,
        status: 'success',
        metadata: details
      });
    } catch (error) {
      // Don't fail if logging fails
      logger.warn(`${this.serviceName}: Failed to log business event`, {
        service: this.serviceName,
        event,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Sleep utility
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

