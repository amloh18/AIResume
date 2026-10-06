import 'server-only';
import { getRedisClient, getRedisClientIfReady, isRedisAvailable } from './redis-client';

/**
 * Unified Cache Manager
 * 
 * Provides a unified caching interface that:
 * - Uses Redis in production when available
 * - Falls back to in-memory cache for development
 * - Supports TTL (time-to-live) for cache entries
 * - Provides cache invalidation patterns
 */

class InMemoryCache {
  private cache: Map<string, { value: any; expiresAt: number }> = new Map();

  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttl: number = 300): Promise<void> {
    const expiresAt = Date.now() + ttl * 1000;
    this.cache.set(key, { value, expiresAt });
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }

  async keys(pattern: string): Promise<string[]> {
    // Simple pattern matching for in-memory cache
    const regex = new RegExp(
      pattern.replace(/\*/g, '.*').replace(/\?/g, '.')
    );
    return Array.from(this.cache.keys()).filter((key) => regex.test(key));
  }
}

class CacheManager {
  private static instance: CacheManager;
  private memoryCache: InMemoryCache;
  private useRedis: boolean = false;

  private constructor() {
    this.memoryCache = new InMemoryCache();
    // Check Redis availability asynchronously
    this.initializeRedis();
  }

  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  private async initializeRedis(): Promise<void> {
    try {
      this.useRedis = await isRedisAvailable();
    } catch (error) {
      this.useRedis = false;
    }
  }

  /**
   * Get value from cache
   * Uses non-blocking Redis access to prevent auth delays
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      // Use non-blocking getter - returns null immediately if Redis not ready
      const redisClient = getRedisClientIfReady();
      if (redisClient) {
        const value = await redisClient.get(key);
        if (value) {
          return JSON.parse(value) as T;
        }
        return null;
      }

      // Fallback to in-memory cache
      return await this.memoryCache.get<T>(key);
    } catch (error) {
      console.warn(`⚠️ Cache get error for key ${key}:`, error);
      // Fallback to in-memory cache on error
      return await this.memoryCache.get<T>(key);
    }
  }

  /**
   * Set value in cache with TTL
   * Uses non-blocking Redis access to prevent auth delays
   */
  async set<T>(key: string, value: T, ttl: number = 300): Promise<void> {
    try {
      // Use non-blocking getter - returns null immediately if Redis not ready
      const redisClient = getRedisClientIfReady();
      if (redisClient) {
        await redisClient.setEx(key, ttl, JSON.stringify(value));
        return;
      }

      // Fallback to in-memory cache
      await this.memoryCache.set(key, value, ttl);
    } catch (error) {
      console.warn(`⚠️ Cache set error for key ${key}:`, error);
      // Fallback to in-memory cache on error
      await this.memoryCache.set(key, value, ttl);
    }
  }

  /**
   * Delete a cache key
   */
  async delete(key: string): Promise<void> {
    try {
      if (this.useRedis) {
        const redisClient = await getRedisClient();
        if (redisClient) {
          await redisClient.del(key);
        }
      }

      await this.memoryCache.delete(key);
    } catch (error) {
      console.warn(`⚠️ Cache delete error for key ${key}:`, error);
      await this.memoryCache.delete(key);
    }
  }

  /**
   * Invalidate cache keys matching a pattern
   * Pattern supports * for wildcard and ? for single character
   */
  async invalidate(pattern: string): Promise<void> {
    try {
      if (this.useRedis) {
        const redisClient = await getRedisClient();
        if (redisClient) {
          // Convert pattern to Redis SCAN pattern
          const redisPattern = pattern.replace(/\*/g, '*').replace(/\?/g, '?');

          // Use SCAN to find matching keys
          const keys: string[] = [];
          let cursor: string = '0';

          do {
            const result = await redisClient.scan(cursor, {
              MATCH: redisPattern,
              COUNT: 100,
            }) as { cursor: string | number; keys: string[] };
            const nextCursor = result.cursor;
            cursor = typeof nextCursor === 'number' ? String(nextCursor) : nextCursor;
            keys.push(...result.keys);
          } while (cursor !== '0');

          // Delete all matching keys
          if (keys.length > 0) {
            await redisClient.del(keys);
          }
        }
      }

      // Also invalidate in-memory cache
      const memoryKeys = await this.memoryCache.keys(pattern);
      for (const key of memoryKeys) {
        await this.memoryCache.delete(key);
      }
    } catch (error) {
      console.warn(`⚠️ Cache invalidate error for pattern ${pattern}:`, error);
    }
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    try {
      if (this.useRedis) {
        const redisClient = await getRedisClient();
        if (redisClient) {
          await redisClient.flushAll();
        }
      }

      await this.memoryCache.clear();
    } catch (error) {
      console.warn('⚠️ Cache clear error:', error);
    }
  }

  /**
   * Get multiple keys at once
   */
  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    const results: (T | null)[] = [];

    for (const key of keys) {
      results.push(await this.get<T>(key));
    }

    return results;
  }

  /**
   * Set multiple keys at once
   */
  async mset(items: Array<{ key: string; value: any; ttl?: number }>): Promise<void> {
    for (const item of items) {
      await this.set(item.key, item.value, item.ttl || 300);
    }
  }
}

// Export singleton instance
export const cacheManager = CacheManager.getInstance();

// Export convenience methods
export const getCache = <T>(key: string) => cacheManager.get<T>(key);
export const setCache = <T>(key: string, value: T, ttl?: number) =>
  cacheManager.set(key, value, ttl);
export const deleteCache = (key: string) => cacheManager.delete(key);
export const invalidateCache = (pattern: string) => cacheManager.invalidate(pattern);
export const clearCache = () => cacheManager.clear();

