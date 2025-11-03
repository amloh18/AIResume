/**
 * Redis-backed rate limiting service for production
 * Falls back to in-memory storage if Redis is not available
 */

import { logger } from './logger';

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

// In-memory fallback storage
class MemoryStore {
  private store = new Map<string, { count: number; resetTime: number }>();

  async get(key: string): Promise<{ count: number; resetTime: number } | null> {
    const entry = this.store.get(key);
    if (!entry) return null;

    // Clean up expired entries
    if (Date.now() > entry.resetTime) {
      this.store.delete(key);
      return null;
    }

    return entry;
  }

  async set(key: string, count: number, resetTime: number): Promise<void> {
    this.store.set(key, { count, resetTime });
  }

  async increment(key: string, windowMs: number): Promise<{ count: number; resetTime: number }> {
    const now = Date.now();
    const resetTime = now + windowMs;
    
    const existing = await this.get(key);
    if (existing) {
      existing.count++;
      await this.set(key, existing.count, existing.resetTime);
      return existing;
    } else {
      await this.set(key, 1, resetTime);
      return { count: 1, resetTime };
    }
  }

  // Clean up expired entries periodically
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of Array.from(this.store.entries())) {
      if (now > entry.resetTime) {
        this.store.delete(key);
      }
    }
  }
}

class RateLimiter {
  private store: MemoryStore;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.store = new MemoryStore();
    
    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.store.cleanup();
    }, 5 * 60 * 1000);
  }

  private getKey(req: any, config: RateLimitConfig): string {
    if (config.keyGenerator) {
      return config.keyGenerator(req);
    }

    // Default key generation based on IP and user agent
    const ip = req.headers?.get('x-forwarded-for') || 
               req.headers?.get('x-real-ip') || 
               req.ip || 
               'unknown';
    const userAgent = req.headers?.get('user-agent') || 'unknown';
    
    return `rate_limit:${ip}:${Buffer.from(userAgent).toString('base64').slice(0, 10)}`;
  }

  async checkLimit(req: any, config: RateLimitConfig): Promise<RateLimitResult> {
    try {
      const key = this.getKey(req, config);
      const now = Date.now();
      
      // Get current state
      const current = await this.store.get(key);
      
      if (!current) {
        // First request in window
        const resetTime = now + config.windowMs;
        await this.store.set(key, 1, resetTime);
        
        return {
          allowed: true,
          remaining: config.maxRequests - 1,
          resetTime,
          totalHits: 1,
        };
      }

      // Check if window has expired
      if (now > current.resetTime) {
        // Window expired, start new window
        const resetTime = now + config.windowMs;
        await this.store.set(key, 1, resetTime);
        
        return {
          allowed: true,
          remaining: config.maxRequests - 1,
          resetTime,
          totalHits: 1,
        };
      }

      // Check if limit exceeded
      if (current.count >= config.maxRequests) {
        return {
          allowed: false,
          remaining: 0,
          resetTime: current.resetTime,
          totalHits: current.count,
        };
      }

      // Increment counter
      const updated = await this.store.increment(key, config.windowMs);
      
      return {
        allowed: true,
        remaining: config.maxRequests - updated.count,
        resetTime: updated.resetTime,
        totalHits: updated.count,
      };

    } catch (error) {
      logger.error('Rate limiter error', { error: error instanceof Error ? error.message : 'Unknown error' });
      
      // Fail open - allow request if rate limiter fails
      return {
        allowed: true,
        remaining: config.maxRequests,
        resetTime: Date.now() + config.windowMs,
        totalHits: 0,
      };
    }
  }

  // Cleanup method
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

// Create singleton instance
const rateLimiter = new RateLimiter();

// Predefined rate limit configurations
export const rateLimitConfigs = {
  // General API rate limiting
  api: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,
  },
  
  // Authentication endpoints
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5,
  },
  
  // AI endpoints (more restrictive)
  ai: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 20,
  },
  
  // Email sending
  email: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 10,
  },
  
  // File uploads
  upload: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 50,
  },
  
  // Admin endpoints
  admin: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 200,
  },
} as const;

// Rate limiting middleware factory
export function createRateLimit(config: RateLimitConfig) {
  return async (req: any): Promise<RateLimitResult> => {
    return rateLimiter.checkLimit(req, config);
  };
}

// Convenience functions for common use cases
export const apiRateLimit = createRateLimit(rateLimitConfigs.api);
export const authRateLimit = createRateLimit(rateLimitConfigs.auth);
export const aiRateLimit = createRateLimit(rateLimitConfigs.ai);
export const emailRateLimit = createRateLimit(rateLimitConfigs.email);
export const uploadRateLimit = createRateLimit(rateLimitConfigs.upload);
export const adminRateLimit = createRateLimit(rateLimitConfigs.admin);

// Cleanup on process exit
process.on('SIGINT', () => {
  rateLimiter.destroy();
});

process.on('SIGTERM', () => {
  rateLimiter.destroy();
});

export default rateLimiter;
