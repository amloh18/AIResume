import { useState, useEffect, useCallback, useRef } from 'react';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

interface FetchOptions {
  cacheDuration?: number; // in milliseconds
  staleWhileRevalidate?: boolean;
  retryAttempts?: number;
  retryDelay?: number;
}

interface UseOptimizedDataFetchingReturn<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  invalidateCache: () => void;
}

// Global cache store
const globalCache = new Map<string, CacheEntry<any>>();

// Cache cleanup interval
const CACHE_CLEANUP_INTERVAL = 60000; // 1 minute
let cleanupInterval: NodeJS.Timeout | null = null;

const cleanupExpiredEntries = () => {
  const now = Date.now();
  for (const [key, entry] of Array.from(globalCache.entries())) {
    if (now > entry.expiresAt) {
      globalCache.delete(key);
    }
  }
};

const startCacheCleanup = () => {
  if (!cleanupInterval) {
    cleanupInterval = setInterval(cleanupExpiredEntries, CACHE_CLEANUP_INTERVAL);
  }
};

export function useOptimizedDataFetching<T>(
  key: string,
  fetchFn: () => Promise<T>,
  options: FetchOptions = {}
): UseOptimizedDataFetchingReturn<T> {
  const {
    cacheDuration = 300000, // 5 minutes default
    staleWhileRevalidate = true,
    retryAttempts = 3,
    retryDelay = 1000
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const retryCountRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const fetchFnRef = useRef(fetchFn);

  // Update fetchFnRef when fetchFn changes
  useEffect(() => {
    fetchFnRef.current = fetchFn;
  }, [fetchFn]);

  // Start cache cleanup on first use
  useEffect(() => {
    startCacheCleanup();
  }, []);

  const fetchData = useCallback(async (forceRefresh = false) => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      setError(null);

      // Check cache first (unless force refresh)
      if (!forceRefresh) {
        const cachedEntry = globalCache.get(key);
        if (cachedEntry && Date.now() < cachedEntry.expiresAt) {
          setData(cachedEntry.data);
          setLoading(false);
          
          // If stale-while-revalidate is enabled, fetch in background
          if (staleWhileRevalidate && Date.now() > cachedEntry.timestamp + (cacheDuration * 0.8)) {
            // Fetch fresh data in background without showing loading
            fetchData(true).catch(() => {
              // Ignore background fetch errors
            });
          }
          return;
        }
      }

      setLoading(true);
      const result = await fetchFnRef.current();
      
      if (!abortController.signal.aborted) {
        setData(result);
        
        // Cache the result
        globalCache.set(key, {
          data: result,
          timestamp: Date.now(),
          expiresAt: Date.now() + cacheDuration
        });
        
        retryCountRef.current = 0;
      }
    } catch (err) {
      if (!abortController.signal.aborted) {
        const error = err as Error;
        setError(error);
        
        // Retry logic
        if (retryCountRef.current < retryAttempts) {
          retryCountRef.current++;
          setTimeout(() => {
            if (!abortController.signal.aborted) {
              fetchData(forceRefresh);
            }
          }, retryDelay * retryCountRef.current);
          return;
        }
      }
    } finally {
      if (!abortController.signal.aborted) {
        setLoading(false);
      }
    }
  }, [key, cacheDuration, staleWhileRevalidate, retryAttempts, retryDelay]);

  const refetch = useCallback(() => fetchData(true), [fetchData]);

  const invalidateCache = useCallback(() => {
    globalCache.delete(key);
  }, [key]);

  useEffect(() => {
    fetchData();
    
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [key]); // Only depend on key to prevent infinite loops

  return {
    data,
    loading,
    error,
    refetch,
    invalidateCache
  };
}

// Hook for parallel data fetching
export function useParallelDataFetching<T extends Record<string, any>>(
  fetchers: Record<keyof T, () => Promise<T[keyof T]>>,
  options: FetchOptions = {}
): {
  data: Partial<T> | null;
  loading: boolean;
  errors: Partial<Record<keyof T, Error>>;
  refetch: () => Promise<void>;
  invalidateCache: () => void;
} {
  const [data, setData] = useState<Partial<T> | null>(null);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<Partial<Record<keyof T, Error>>>({});
  const abortControllerRef = useRef<AbortController | null>(null);
  const fetchersRef = useRef(fetchers);
  
  // Update fetchersRef when fetchers change
  useEffect(() => {
    fetchersRef.current = fetchers;
  }, [fetchers]);

  const fetchAllData = useCallback(async (forceRefresh = false) => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      setErrors({});
      
      // Check cache for all keys
      if (!forceRefresh) {
        const cachedData: Partial<T> = {};
        let allCached = true;
        
        for (const key of Object.keys(fetchersRef.current)) {
          const cachedEntry = globalCache.get(key);
          if (cachedEntry && Date.now() < cachedEntry.expiresAt) {
            cachedData[key as keyof T] = cachedEntry.data;
          } else {
            allCached = false;
            break;
          }
        }
        
        if (allCached && Object.keys(cachedData).length === Object.keys(fetchersRef.current).length) {
          setData(cachedData);
          setLoading(false);
          return;
        }
      }

      setLoading(true);
      
      // Execute all fetchers in parallel
      const promises = Object.entries(fetchersRef.current).map(async ([key, fetcher]) => {
        try {
          const result = await fetcher();
          
          if (!abortController.signal.aborted) {
            // Cache the result
            globalCache.set(key, {
              data: result,
              timestamp: Date.now(),
              expiresAt: Date.now() + (options.cacheDuration || 300000)
            });
            
            return { key, result, error: null };
          }
          return { key, result: null, error: null };
        } catch (error) {
          return { key, result: null, error: error as Error };
        }
      });

      const results = await Promise.all(promises);
      
      if (!abortController.signal.aborted) {
        const newData: Partial<T> = {};
        const newErrors: Partial<Record<keyof T, Error>> = {};
        
        results.forEach(({ key, result, error }) => {
          if (error) {
            newErrors[key as keyof T] = error;
          } else if (result !== null) {
            newData[key as keyof T] = result;
          }
        });
        
        setData(newData);
        setErrors(newErrors);
      }
    } catch (err) {
      if (!abortController.signal.aborted) {
        setErrors({ general: err as Error } as Partial<Record<keyof T, Error>>);
      }
    } finally {
      if (!abortController.signal.aborted) {
        setLoading(false);
      }
    }
  }, [options.cacheDuration]);

  const refetch = useCallback(() => fetchAllData(true), [fetchAllData]);

  const invalidateCache = useCallback(() => {
    Object.keys(fetchersRef.current).forEach(key => {
      globalCache.delete(key);
    });
  }, []);

  useEffect(() => {
    fetchAllData();
    
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []); // Remove fetchAllData dependency to prevent infinite loops

  return {
    data,
    loading,
    errors,
    refetch,
    invalidateCache
  };
}

// Utility function to clear all cache
export const clearAllCache = () => {
  globalCache.clear();
};

// Utility function to get cache stats
export const getCacheStats = () => {
  const now = Date.now();
  let totalEntries = 0;
  let expiredEntries = 0;
  
  for (const entry of Array.from(globalCache.values())) {
    totalEntries++;
    if (now > entry.expiresAt) {
      expiredEntries++;
    }
  }
  
  return {
    totalEntries,
    expiredEntries,
    activeEntries: totalEntries - expiredEntries
  };
};
