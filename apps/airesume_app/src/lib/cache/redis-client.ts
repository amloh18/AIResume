import 'server-only';
import { createClient, RedisClientType } from 'redis';

/**
 * Redis Client Singleton
 * 
 * Provides a single Redis connection instance for the entire application.
 * Falls back to null if Redis is unavailable (for development).
 */

class RedisClientManager {
  private static instance: RedisClientManager;
  private client: RedisClientType | null = null;
  private isConnecting: boolean = false;
  private connectionPromise: Promise<RedisClientType | null> | null = null;
  private static hasWarnedAboutRedis: boolean = false; // Track if we've already warned

  private constructor() { }

  static getInstance(): RedisClientManager {
    if (!RedisClientManager.instance) {
      RedisClientManager.instance = new RedisClientManager();
    }
    return RedisClientManager.instance;
  }

  /**
   * Get Redis client (lazy initialization)
   */
  async getClient(): Promise<RedisClientType | null> {
    // Return existing client if available
    if (this.client && this.client.isReady) {
      return this.client;
    }

    // If already connecting, return the promise
    if (this.isConnecting && this.connectionPromise) {
      return await this.connectionPromise;
    }

    // Start new connection
    if (!this.connectionPromise) {
      this.connectionPromise = this.connect();
    }

    return await this.connectionPromise;
  }

  /**
   * Get Redis client only if already connected (non-blocking)
   * Returns null immediately if Redis is not ready - does not wait for connection
   * Use this in hot paths like auth where we don't want to block on Redis
   */
  getClientIfReady(): RedisClientType | null {
    if (this.client && this.client.isReady) {
      return this.client;
    }
    // Start connection in background if not already connecting
    if (!this.connectionPromise && !this.isConnecting) {
      this.connectionPromise = this.connect();
    }
    return null;
  }

  /**
   * Initialize Redis connection
   */
  private async connect(): Promise<RedisClientType | null> {
    this.isConnecting = true;

    try {
      const redisUrl = process.env.REDIS_URL;

      if (!redisUrl) {
        // Only warn once to avoid console spam
        if (!RedisClientManager.hasWarnedAboutRedis) {
          RedisClientManager.hasWarnedAboutRedis = true;
          // Use info-level log in development, warn in production
          if (process.env.NODE_ENV === 'development') {
            console.log('ℹ️  Redis not configured (REDIS_URL not set), using in-memory cache fallback');
          } else {
            console.warn('⚠️ REDIS_URL not set, cache will use in-memory fallback');
          }
        }
        this.isConnecting = false;
        return null;
      }

      const client = createClient({
        url: redisUrl,
        socket: {
          connectTimeout: 5000, // 5 second connection timeout to prevent blocking auth
          reconnectStrategy: (retries) => {
            // Only attempt 2 retries with 1 second delay, then give up
            if (retries > 2) {
              console.warn('⚠️ Redis connection failed after 2 retries, using in-memory fallback');
              return false; // Stop retrying
            }
            return 1000; // Retry after 1 second
          },
        },
      }) as RedisClientType;

      client.on('error', (err) => {
        console.warn('❌ Redis connection error:', err.message);
        this.client = null;
      });

      client.on('connect', () => {
        // Only log in development to reduce log noise
        if (process.env.NODE_ENV === 'development') {
          console.log('🔗 Redis connecting...');
        }
      });

      client.on('ready', () => {
        // Only log on first connection to reduce log noise
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ Redis connected successfully');
        }
      });

      // Add timeout to the connection attempt
      const connectPromise = client.connect();
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Redis connection timeout (5s)')), 5000);
      });

      await Promise.race([connectPromise, timeoutPromise]);
      this.client = client;
      this.isConnecting = false;

      return client;
    } catch (error) {
      console.warn('⚠️ Redis not available, using in-memory cache fallback:', error);
      this.client = null;
      this.isConnecting = false;
      return null;
    }
  }

  /**
   * Check if Redis is available
   */
  async isAvailable(): Promise<boolean> {
    const client = await this.getClient();
    return client !== null && client.isReady;
  }

  /**
   * Gracefully disconnect
   */
  async disconnect(): Promise<void> {
    if (this.client && this.client.isOpen) {
      await this.client.quit();
      this.client = null;
    }
    this.connectionPromise = null;
    this.isConnecting = false;
  }
}

// Export singleton instance
export const redisClientManager = RedisClientManager.getInstance();

// Export convenience method
export const getRedisClient = () => redisClientManager.getClient();
export const getRedisClientIfReady = () => redisClientManager.getClientIfReady();
export const isRedisAvailable = () => redisClientManager.isAvailable();
export const disconnectRedis = () => redisClientManager.disconnect();

