/**
 * Unified Cache Module
 * 
 * Provides Redis caching with in-memory fallback for development.
 * 
 * Usage:
 *   import { getCache, setCache, invalidateCache } from '@/lib/cache';
 * 
 *   // Get from cache
 *   const user = await getCache<User>('user:123');
 * 
 *   // Set in cache (5 minute TTL)
 *   await setCache('user:123', user, 300);
 * 
 *   // Invalidate user cache
 *   await invalidateCache('user:*');
 */

export {
  cacheManager,
  getCache,
  setCache,
  deleteCache,
  invalidateCache,
  clearCache,
} from './cache-manager';

export {
  redisClientManager,
  getRedisClient,
  isRedisAvailable,
  disconnectRedis,
} from './redis-client';

