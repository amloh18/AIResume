/**
 * Renderer Health Service
 * 
 * Provides health checks for rendering services and fallback mechanisms
 * Integrates with PerformanceMonitor and ErrorTracker
 */

import { PerformanceMonitor, ErrorTracker } from '@/lib/monitoring';
import { logger } from '@/lib/structured-logger';
import { puppeteerPoolService } from './puppeteerPoolService';

export class RendererHealthService {
  private static healthCheckCache: { isHealthy: boolean; lastCheck: number; responseTime: number } = {
    isHealthy: true,
    lastCheck: 0,
    responseTime: 0
  };
  private static readonly CACHE_TTL = 60000; // 1 minute
  private static failureCount = 0;
  private static successCount = 0;

  /**
   * Check if Puppeteer is available and healthy
   */
  static async checkHealth(): Promise<boolean> {
    // Use cached result if recent
    const now = Date.now();
    if (now - this.healthCheckCache.lastCheck < this.CACHE_TTL) {
      return this.healthCheckCache.isHealthy;
    }

    return PerformanceMonitor.timeOperation('renderer.healthCheck', async () => {
      try {
        const startTime = Date.now();
        
        // Check Puppeteer pool instead of launching new browser
        const poolStats = puppeteerPoolService.getPoolStats();
        
        // If pool has browsers, consider it healthy
        if (poolStats.total > 0) {
          const responseTime = Date.now() - startTime;
          
          this.healthCheckCache = {
            isHealthy: true,
            lastCheck: now,
            responseTime
          };
          
          this.successCount++;
          this.failureCount = 0; // Reset failure count on success
          
          logger.info('Renderer health check: healthy', {
            service: 'RendererHealthService',
            poolSize: poolStats.total,
            available: poolStats.available,
            responseTime
          });
          
          return true;
        }

        // If no pool browsers, try to get one (will create if needed)
        const browser = await puppeteerPoolService.getBrowser();
        await puppeteerPoolService.releaseBrowser(browser);
        
        const responseTime = Date.now() - startTime;
        
        this.healthCheckCache = {
          isHealthy: true,
          lastCheck: now,
          responseTime
        };
        
        this.successCount++;
        this.failureCount = 0;
        
        return true;
      } catch (error) {
        const responseTime = Date.now() - Date.now();
        this.failureCount++;
        
        logger.warn('Renderer health check failed', {
          service: 'RendererHealthService',
          error: error instanceof Error ? error.message : String(error),
          failureCount: this.failureCount,
          responseTime
        });
        
        // Alert if repeated failures
        if (this.failureCount >= 3) {
          ErrorTracker.captureMessage(
            'Renderer health check failing repeatedly',
            'error',
            {
              tags: { service: 'RendererHealthService' },
              extra: {
                failureCount: this.failureCount,
                lastError: error instanceof Error ? error.message : String(error)
              }
            }
          );
        }
        
        this.healthCheckCache = {
          isHealthy: false,
          lastCheck: now,
          responseTime
        };
        
        return false;
      }
    });
  }

  /**
   * Get available fallback renderers
   */
  static getAvailableFallbacks(): string[] {
    const fallbacks: string[] = [];
    
    // Check for html2pdf
    try {
      require.resolve('html2pdf.js');
      fallbacks.push('html2pdf');
    } catch {
      // Not available
    }
    
    // Check for jsPDF
    try {
      require.resolve('jspdf');
      fallbacks.push('jspdf');
    } catch {
      // Not available
    }
    
    return fallbacks;
  }

  /**
   * Get health metrics
   */
  static getHealthMetrics(): {
    isHealthy: boolean;
    responseTime: number;
    successRate: number;
    failureCount: number;
    successCount: number;
  } {
    const total = this.successCount + this.failureCount;
    const successRate = total > 0 ? (this.successCount / total) * 100 : 100;

    return {
      isHealthy: this.healthCheckCache.isHealthy,
      responseTime: this.healthCheckCache.responseTime,
      successRate: Math.round(successRate * 100) / 100,
      failureCount: this.failureCount,
      successCount: this.successCount
    };
  }

  /**
   * Reset health check cache (force re-check)
   */
  static resetCache(): void {
    this.healthCheckCache = {
      isHealthy: true,
      lastCheck: 0,
      responseTime: 0
    };
    this.failureCount = 0;
    this.successCount = 0;
  }
}

export const rendererHealthService = RendererHealthService;

