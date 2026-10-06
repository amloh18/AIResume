interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class JobSearchCache {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly defaultTtlMs = 60 * 1000; // 1 minute cache for search queries

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  set<T>(key: string, data: T, ttlMs = this.defaultTtlMs): void {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttlMs,
    });

    // Prune stale cache if growing large
    if (this.cache.size > 1000) {
      const now = Date.now();
      for (const [k, v] of this.cache.entries()) {
        if (now > v.expiresAt) {
          this.cache.delete(k);
        }
      }
    }
  }

  invalidateAll(): void {
    this.cache.clear();
  }
}

export const jobSearchCache = new JobSearchCache();
