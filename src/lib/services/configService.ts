/**
 * Service Configuration
 * 
 * Centralized configuration management for all services
 * Uses environment variables with type-safe access and defaults
 */

interface ServiceConfig {
  pdf: {
    cache: {
      ttl: number; // Cache TTL in seconds
      maxSize: number; // Maximum cache entries
      cleanupInterval: number; // Cleanup interval in milliseconds
    };
    puppeteer: {
      headless: boolean;
      args: string[];
      timeout: number; // Timeout in milliseconds
      poolSize: number; // Browser pool size
      idleTimeout: number; // Idle browser timeout in milliseconds
    };
    generation: {
      maxFileSize: number; // Maximum file size in bytes (10MB)
      timeout: number; // Generation timeout in milliseconds
    };
  };
  download: {
    rateLimit: {
      perUser: number; // Downloads per user per hour
      perIP: number; // Downloads per IP per hour
      freeTier: number; // Free tier limit
      premiumTier: number; // Premium tier limit
    };
    maxFileSize: number; // Maximum file size in bytes
    allowedFormats: string[];
  };
  template: {
    cache: {
      ttl: number; // Template cache TTL in seconds
      preloadCount: number; // Number of templates to preload
    };
  };
  retry: {
    maxRetries: number;
    initialDelay: number; // Initial delay in milliseconds
    maxDelay: number; // Maximum delay in milliseconds
    backoffMultiplier: number;
  };
  circuitBreaker: {
    failureThreshold: number;
    resetTimeout: number; // Reset timeout in milliseconds
    halfOpenTimeout: number; // Half-open timeout in milliseconds
  };
}

class ConfigService {
  private static config: ServiceConfig;

  static getConfig(): ServiceConfig {
    if (this.config) {
      return this.config;
    }

    this.config = {
      pdf: {
        cache: {
          ttl: parseInt(process.env.PDF_CACHE_TTL || '3600', 10), // 1 hour default
          maxSize: parseInt(process.env.PDF_CACHE_MAX_SIZE || '1000', 10),
          cleanupInterval: parseInt(process.env.PDF_CACHE_CLEANUP_INTERVAL || '300000', 10) // 5 minutes
        },
        puppeteer: {
          headless: process.env.PUPPETEER_HEADLESS !== 'false',
          args: (process.env.PUPPETEER_ARGS || '--no-sandbox,--disable-setuid-sandbox,--font-render-hinting=none,--force-color-profile=srgb').split(','),
          timeout: parseInt(process.env.PUPPETEER_TIMEOUT || '30000', 10), // 30 seconds
          poolSize: parseInt(process.env.PUPPETEER_POOL_SIZE || '3', 10),
          idleTimeout: parseInt(process.env.PUPPETEER_IDLE_TIMEOUT || '300000', 10) // 5 minutes
        },
        generation: {
          maxFileSize: parseInt(process.env.PDF_MAX_FILE_SIZE || '10485760', 10), // 10MB
          timeout: parseInt(process.env.PDF_GENERATION_TIMEOUT || '30000', 10) // 30 seconds
        }
      },
      download: {
        rateLimit: {
          perUser: parseInt(process.env.DOWNLOAD_RATE_LIMIT_USER || '50', 10), // 50 per hour
          perIP: parseInt(process.env.DOWNLOAD_RATE_LIMIT_IP || '100', 10), // 100 per hour
          freeTier: parseInt(process.env.DOWNLOAD_RATE_LIMIT_FREE || '10', 10), // 10 per hour
          premiumTier: parseInt(process.env.DOWNLOAD_RATE_LIMIT_PREMIUM || '1000', 10) // 1000 per hour
        },
        maxFileSize: parseInt(process.env.DOWNLOAD_MAX_FILE_SIZE || '52428800', 10), // 50MB
        allowedFormats: (process.env.DOWNLOAD_ALLOWED_FORMATS || 'pdf,docx,doc').split(',')
      },
      template: {
        cache: {
          ttl: parseInt(process.env.TEMPLATE_CACHE_TTL || '7200', 10), // 2 hours
          preloadCount: parseInt(process.env.TEMPLATE_PRELOAD_COUNT || '10', 10)
        }
      },
      retry: {
        maxRetries: parseInt(process.env.SERVICE_MAX_RETRIES || '3', 10),
        initialDelay: parseInt(process.env.SERVICE_RETRY_INITIAL_DELAY || '1000', 10),
        maxDelay: parseInt(process.env.SERVICE_RETRY_MAX_DELAY || '10000', 10),
        backoffMultiplier: parseFloat(process.env.SERVICE_RETRY_BACKOFF || '2')
      },
      circuitBreaker: {
        failureThreshold: parseInt(process.env.CIRCUIT_BREAKER_THRESHOLD || '5', 10),
        resetTimeout: parseInt(process.env.CIRCUIT_BREAKER_RESET_TIMEOUT || '60000', 10), // 1 minute
        halfOpenTimeout: parseInt(process.env.CIRCUIT_BREAKER_HALF_OPEN_TIMEOUT || '30000', 10) // 30 seconds
      }
    };

    return this.config;
  }

  /**
   * Get PDF configuration
   */
  static getPDFConfig() {
    return this.getConfig().pdf;
  }

  /**
   * Get download configuration
   */
  static getDownloadConfig() {
    return this.getConfig().download;
  }

  /**
   * Get template configuration
   */
  static getTemplateConfig() {
    return this.getConfig().template;
  }

  /**
   * Get retry configuration
   */
  static getRetryConfig() {
    return this.getConfig().retry;
  }

  /**
   * Get circuit breaker configuration
   */
  static getCircuitBreakerConfig() {
    return this.getConfig().circuitBreaker;
  }

  /**
   * Reload configuration (useful for testing)
   */
  static reload(): void {
    this.config = undefined as any;
  }
}

export const configService = ConfigService;
export default ConfigService;

