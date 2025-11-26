/**
 * Service Metrics Collection
 * 
 * Wrapper around existing PerformanceMonitor and ActivityLogService
 * Provides unified metrics collection for all services
 */

import { PerformanceMonitor } from '@/lib/monitoring';
import { ActivityLogService } from './activityLogService';
import { logger } from '@/lib/structured-logger';

export interface ServiceMetrics {
  operation: string;
  duration: number;
  success: boolean;
  error?: string;
  metadata?: Record<string, any>;
}

export interface CacheMetrics {
  hits: number;
  misses: number;
  hitRate: number;
}

export interface ServiceHealth {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number;
  errorRate: number;
  averageResponseTime: number;
  metrics: ServiceMetrics[];
}

export class MetricsService {
  private static metrics: Map<string, ServiceMetrics[]> = new Map();
  private static readonly MAX_METRICS_PER_SERVICE = 1000;

  /**
   * Track an operation
   */
  static async trackOperation(
    service: string,
    operation: string,
    duration: number,
    success: boolean,
    error?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const metric: ServiceMetrics = {
      operation,
      duration,
      success,
      error,
      metadata
    };

    // Store metric
    if (!this.metrics.has(service)) {
      this.metrics.set(service, []);
    }

    const serviceMetrics = this.metrics.get(service)!;
    serviceMetrics.push(metric);

    // Keep only recent metrics
    if (serviceMetrics.length > this.MAX_METRICS_PER_SERVICE) {
      serviceMetrics.shift();
    }

    // Log to ActivityLogService
    try {
      await ActivityLogService.log({
        logType: 'performance',
        action: `${service}.${operation}`,
        status: success ? 'success' : 'error',
        metadata: {
          duration,
          error,
          ...metadata
        }
      });
    } catch (error) {
      // Don't fail if logging fails
      console.error('Failed to log metric:', error);
    }

    // Use PerformanceMonitor for timing
    if (duration > 1000) {
      logger.performance(`${service}.${operation}`, duration, {
        service,
        operation,
        success,
        ...metadata
      });
    }
  }

  /**
   * Track cache operation
   */
  static trackCacheOperation(
    service: string,
    operation: 'hit' | 'miss' | 'set',
    cacheKey: string,
    metadata?: Record<string, any>
  ): void {
    logger.performance(`cache.${operation}`, 0, {
      service,
      operation,
      cacheKey,
      ...metadata
    });
  }

  /**
   * Get metrics for a service
   */
  static getMetrics(service: string): ServiceMetrics[] {
    return this.metrics.get(service) || [];
  }

  /**
   * Get service health
   */
  static getServiceHealth(service: string): ServiceHealth {
    const metrics = this.getMetrics(service);
    const recentMetrics = metrics.slice(-100); // Last 100 operations

    if (recentMetrics.length === 0) {
      return {
        service,
        status: 'healthy',
        uptime: 100,
        errorRate: 0,
        averageResponseTime: 0,
        metrics: []
      };
    }

    const successCount = recentMetrics.filter(m => m.success).length;
    const errorRate = ((recentMetrics.length - successCount) / recentMetrics.length) * 100;
    const averageResponseTime = recentMetrics.reduce((sum, m) => sum + m.duration, 0) / recentMetrics.length;

    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (errorRate < 1) {
      status = 'healthy';
    } else if (errorRate < 5) {
      status = 'degraded';
    } else {
      status = 'unhealthy';
    }

    return {
      service,
      status,
      uptime: 100 - errorRate,
      errorRate,
      averageResponseTime: Math.round(averageResponseTime),
      metrics: recentMetrics
    };
  }

  /**
   * Get cache metrics (from pdfCacheService)
   */
  static getCacheMetrics(service: string): CacheMetrics {
    // This would integrate with cache services
    // For now, return placeholder
    return {
      hits: 0,
      misses: 0,
      hitRate: 0
    };
  }

  /**
   * Clear metrics for a service
   */
  static clearMetrics(service: string): void {
    this.metrics.delete(service);
  }

  /**
   * Clear all metrics
   */
  static clearAllMetrics(): void {
    this.metrics.clear();
  }
}

export const metricsService = MetricsService;

