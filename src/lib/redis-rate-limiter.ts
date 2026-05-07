/**
 * Redis-backed rate limiting service for production scalability
 * Falls back to in-memory rate limiting if Redis is not available
 */

import crypto from 'crypto';

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  keyGenerator?: (req: any) => string; // Custom key generator
  skipSuccessfulRequests?: boolean; // Don't count successful requests
  skipFailedRequests?: boolean; // Don't count failed requests
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  totalHits: number;
}

class RedisRateLimiter {
  private redis: any = null;
  private fallbackStore: Map<string, { count: number; resetTime: number }> = new Map();
  private isRedisAvailable: boolean = false;
  private static hasWarnedAboutRedis: boolean = false; // Track if we've already warned

  constructor() {
    this.initializeRedis();
  }

  private async initializeRedis(): Promise<void> {
    try {
      // Try to import Redis (optional dependency)
      const Redis = require('redis');

      if (process.env.REDIS_URL) {
        this.redis = Redis.createClient({
          url: process.env.REDIS_URL,
          socket: {
            connectTimeout: 5000, // 5 second connection timeout
            reconnectStrategy: (retries: number) => {
              if (retries > 2) {
                return false; // Stop retrying after 2 attempts
              }
              return 1000; // Retry after 1 second
            },
          },
        });

        this.redis.on('error', (err: Error) => {
          console.warn('Redis connection error:', err.message);
          this.isRedisAvailable = false;
        });

        this.redis.on('connect', () => {
          console.log('✅ Redis connected successfully');
          this.isRedisAvailable = true;
        });

        // Add timeout to the connection attempt
        const connectPromise = this.redis.connect();
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Redis connection timeout (5s)')), 5000)
        );

        await Promise.race([connectPromise, timeoutPromise]);
      } else {
        // Only warn once to avoid console spam
        if (!RedisRateLimiter.hasWarnedAboutRedis) {
          RedisRateLimiter.hasWarnedAboutRedis = true;
          // Use info-level log in development, warn in production
          if (process.env.NODE_ENV === 'development') {
            console.log('ℹ️  Redis not configured (REDIS_URL not set), using in-memory rate limiting');
          } else {
            console.warn('⚠️ REDIS_URL not set, using in-memory rate limiting');
          }
        }
        this.isRedisAvailable = false;
      }
    } catch (error) {
      // Only warn once to avoid console spam
      if (!RedisRateLimiter.hasWarnedAboutRedis) {
        RedisRateLimiter.hasWarnedAboutRedis = true;
        if (process.env.NODE_ENV === 'development') {
          console.log('ℹ️  Redis not available, using in-memory rate limiting');
        } else {
          console.warn('⚠️ Redis not available, using in-memory rate limiting:', error);
        }
      }
      this.isRedisAvailable = false;
    }
  }

  private generateKey(identifier: string, config: RateLimitConfig): string {
    const window = Math.floor(Date.now() / config.windowMs);
    return `rate_limit:${identifier}:${window}`;
  }

  private async getRedisValue(key: string): Promise<number> {
    if (!this.isRedisAvailable || !this.redis) {
      return 0;
    }

    try {
      const value = await this.redis.get(key);
      return value ? parseInt(value, 10) : 0;
    } catch (error) {
      console.warn('Redis get error:', error);
      return 0;
    }
  }

  private async setRedisValue(key: string, value: number, ttlMs: number): Promise<void> {
    if (!this.isRedisAvailable || !this.redis) {
      return;
    }

    try {
      await this.redis.setEx(key, Math.ceil(ttlMs / 1000), value.toString());
    } catch (error) {
      console.warn('Redis set error:', error);
    }
  }

  private async incrementRedisValue(key: string, ttlMs: number): Promise<number> {
    if (!this.isRedisAvailable || !this.redis) {
      return 0;
    }

    try {
      const result = await this.redis.multi()
        .incr(key)
        .expire(key, Math.ceil(ttlMs / 1000))
        .exec();

      return result[0][1] || 0;
    } catch (error) {
      console.warn('Redis increment error:', error);
      return 0;
    }
  }

  private getFallbackValue(key: string): { count: number; resetTime: number } {
    const now = Date.now();
    const stored = this.fallbackStore.get(key);

    if (!stored || stored.resetTime < now) {
      // Reset or create new entry
      const resetTime = now + 60000; // 1 minute window
      const newEntry = { count: 0, resetTime };
      this.fallbackStore.set(key, newEntry);
      return newEntry;
    }

    return stored;
  }

  private setFallbackValue(key: string, count: number, resetTime: number): void {
    this.fallbackStore.set(key, { count, resetTime });
  }

  private cleanupFallbackStore(): void {
    const now = Date.now();
    for (const [key, value] of Array.from(this.fallbackStore.entries())) {
      if (value.resetTime < now) {
        this.fallbackStore.delete(key);
      }
    }
  }

  async checkLimit(identifier: string, config: RateLimitConfig): Promise<RateLimitResult> {
    const key = this.generateKey(identifier, config);
    const now = Date.now();
    const windowStart = Math.floor(now / config.windowMs) * config.windowMs;
    const resetTime = windowStart + config.windowMs;
    const ttlMs = resetTime - now;

    let currentCount: number;

    if (this.isRedisAvailable) {
      // Use Redis for distributed rate limiting
      currentCount = await this.incrementRedisValue(key, ttlMs);
    } else {
      // Use in-memory fallback
      this.cleanupFallbackStore();
      const stored = this.getFallbackValue(key);
      stored.count++;
      this.setFallbackValue(key, stored.count, stored.resetTime);
      currentCount = stored.count;
    }

    const allowed = currentCount <= config.maxRequests;
    const remaining = Math.max(0, config.maxRequests - currentCount);

    return {
      allowed,
      remaining,
      resetTime,
      totalHits: currentCount
    };
  }

  async resetLimit(identifier: string, config: RateLimitConfig): Promise<void> {
    const key = this.generateKey(identifier, config);

    if (this.isRedisAvailable) {
      try {
        await this.redis.del(key);
      } catch (error) {
        console.warn('Redis delete error:', error);
      }
    } else {
      this.fallbackStore.delete(key);
    }
  }

  async getLimitInfo(identifier: string, config: RateLimitConfig): Promise<RateLimitResult> {
    const key = this.generateKey(identifier, config);
    const now = Date.now();
    const windowStart = Math.floor(now / config.windowMs) * config.windowMs;
    const resetTime = windowStart + config.windowMs;

    let currentCount: number;

    if (this.isRedisAvailable) {
      currentCount = await this.getRedisValue(key);
    } else {
      const stored = this.getFallbackValue(key);
      currentCount = stored.count;
    }

    const allowed = currentCount <= config.maxRequests;
    const remaining = Math.max(0, config.maxRequests - currentCount);

    return {
      allowed,
      remaining,
      resetTime,
      totalHits: currentCount
    };
  }

  // Predefined rate limit configurations
  static readonly CONFIGS = {
    // API rate limits
    API_GENERAL: { windowMs: 15 * 60 * 1000, maxRequests: 1000 }, // 1000 requests per 15 minutes
    API_STRICT: { windowMs: 5 * 60 * 1000, maxRequests: 100 }, // 100 requests per 5 minutes
    API_AI: { windowMs: 60 * 1000, maxRequests: 10 }, // 10 AI requests per minute

    // Authentication limits
    AUTH_LOGIN: { windowMs: 15 * 60 * 1000, maxRequests: 5 }, // 5 login attempts per 15 minutes
    AUTH_PASSWORD_RESET: { windowMs: 60 * 60 * 1000, maxRequests: 3 }, // 3 password resets per hour
    AUTH_TWO_FACTOR: { windowMs: 10 * 60 * 1000, maxRequests: 3 }, // 3 2FA codes per 10 minutes per user
    AUTH_TWO_FACTOR_IP: { windowMs: 10 * 60 * 1000, maxRequests: 10 }, // 10 2FA codes per 10 minutes per IP

    // File upload limits
    UPLOAD: { windowMs: 60 * 1000, maxRequests: 5 }, // 5 uploads per minute

    // Email limits
    EMAIL: { windowMs: 60 * 1000, maxRequests: 3 }, // 3 emails per minute

    // Admin limits
    ADMIN: { windowMs: 60 * 1000, maxRequests: 50 }, // 50 admin requests per minute
  };

  // Convenience methods for common rate limiting scenarios
  async checkAPILimit(identifier: string, strict: boolean = false): Promise<RateLimitResult> {
    const config = strict ? RedisRateLimiter.CONFIGS.API_STRICT : RedisRateLimiter.CONFIGS.API_GENERAL;
    return this.checkLimit(identifier, config);
  }

  async checkAILimit(identifier: string): Promise<RateLimitResult> {
    return this.checkLimit(identifier, RedisRateLimiter.CONFIGS.API_AI);
  }

  async checkAuthLimit(identifier: string, action: 'login' | 'password_reset'): Promise<RateLimitResult> {
    const config = action === 'login' ? RedisRateLimiter.CONFIGS.AUTH_LOGIN : RedisRateLimiter.CONFIGS.AUTH_PASSWORD_RESET;
    return this.checkLimit(identifier, config);
  }

  async checkUploadLimit(identifier: string): Promise<RateLimitResult> {
    return this.checkLimit(identifier, RedisRateLimiter.CONFIGS.UPLOAD);
  }

  async checkEmailLimit(identifier: string): Promise<RateLimitResult> {
    return this.checkLimit(identifier, RedisRateLimiter.CONFIGS.EMAIL);
  }

  async checkAdminLimit(identifier: string): Promise<RateLimitResult> {
    return this.checkLimit(identifier, RedisRateLimiter.CONFIGS.ADMIN);
  }

  /**
   * Check 2FA rate limit for a user (dual-key: user + IP)
   * Both user-based and IP-based limits must pass
   */
  async checkTwoFactorRateLimit(
    userId: string,
    ipAddress?: string
  ): Promise<{ allowed: boolean; userLimit?: RateLimitResult; ipLimit?: RateLimitResult }> {
    const userKey = `2fa:user:${userId}`;
    const userResult = await this.checkLimit(userKey, RedisRateLimiter.CONFIGS.AUTH_TWO_FACTOR);

    let ipResult: RateLimitResult | undefined;
    if (ipAddress) {
      // Simple IP hash to avoid storing raw IPs
      const ipHash = crypto.createHash('sha256').update(ipAddress).digest('hex').substring(0, 16);
      const ipKey = `2fa:ip:${ipHash}`;
      ipResult = await this.checkLimit(ipKey, RedisRateLimiter.CONFIGS.AUTH_TWO_FACTOR_IP);
    }

    return {
      allowed: userResult.allowed && (!ipResult || ipResult.allowed),
      userLimit: userResult,
      ipLimit: ipResult,
    };
  }
}

// Create singleton instance
const redisRateLimiter = new RedisRateLimiter();

// Export convenience functions
export const rateLimit = {
  check: (identifier: string, config: RateLimitConfig) => redisRateLimiter.checkLimit(identifier, config),
  checkAPI: (identifier: string, strict?: boolean) => redisRateLimiter.checkAPILimit(identifier, strict),
  checkAI: (identifier: string) => redisRateLimiter.checkAILimit(identifier),
  checkAuth: (identifier: string, action: 'login' | 'password_reset') => redisRateLimiter.checkAuthLimit(identifier, action),
  checkUpload: (identifier: string) => redisRateLimiter.checkUploadLimit(identifier),
  checkEmail: (identifier: string) => redisRateLimiter.checkEmailLimit(identifier),
  checkAdmin: (identifier: string) => redisRateLimiter.checkAdminLimit(identifier),
  checkTwoFactorRateLimit: (userId: string, ipAddress?: string) => 
    redisRateLimiter.checkTwoFactorRateLimit(userId, ipAddress),
  reset: (identifier: string, config: RateLimitConfig) => redisRateLimiter.resetLimit(identifier, config),
  getInfo: (identifier: string, config: RateLimitConfig) => redisRateLimiter.getLimitInfo(identifier, config)
};

export default redisRateLimiter;
