/**
 * Request Deduplication Utility
 * 
 * Prevents multiple simultaneous calls to the same endpoint.
 * If a request is already in progress, subsequent calls will wait for the first one to complete.
 * 
 * This solves the "shotgun" problem where multiple components fetch the same data independently.
 */

interface PendingRequest {
  promise: Promise<any>;
  timestamp: number;
}

class RequestDeduplication {
  private pendingRequests: Map<string, PendingRequest> = new Map();
  private readonly CACHE_TTL = 10000; // 10 seconds - requests within this window are deduplicated (increased from 5s)

  /**
   * Deduplicate a fetch request
   * @param url - The request URL (used as key)
   * @param fetchFn - The actual fetch function to call
   * @returns The response from the fetch
   */
  async deduplicate<T>(url: string, fetchFn: () => Promise<T>): Promise<T> {
    const now = Date.now();
    
    // Check if there's a pending request
    const pending = this.pendingRequests.get(url);
    
    if (pending && (now - pending.timestamp) < this.CACHE_TTL) {
      console.log(`⏭️ RequestDeduplication - Reusing pending request for: ${url}`);
      // Return the existing promise
      return pending.promise;
    }

    // Create new request
    console.log(`🔍 RequestDeduplication - Starting new request for: ${url}`);
    const promise = fetchFn()
      .then(result => {
        // Clean up after request completes
        this.pendingRequests.delete(url);
        return result;
      })
      .catch(error => {
        // Clean up on error too
        this.pendingRequests.delete(url);
        throw error;
      });

    // Store the pending request
    this.pendingRequests.set(url, {
      promise,
      timestamp: now
    });

    return promise;
  }

  /**
   * Clear all pending requests (useful for testing or cleanup)
   */
  clear(): void {
    this.pendingRequests.clear();
  }

  /**
   * Get the number of pending requests
   */
  getPendingCount(): number {
    return this.pendingRequests.size;
  }
}

// Singleton instance
export const requestDeduplication = new RequestDeduplication();

/**
 * Hook to use deduplicated fetch
 */
export function useDeduplicatedFetch() {
  const deduplicatedFetch = async <T>(
    url: string,
    fetchFn: () => Promise<T>
  ): Promise<T> => {
    return requestDeduplication.deduplicate(url, fetchFn);
  };

  return { deduplicatedFetch };
}




