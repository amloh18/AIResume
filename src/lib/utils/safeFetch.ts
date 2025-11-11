/**
 * Safe fetch utility for admin components
 * Handles HTML error pages and provides consistent error handling
 */

export interface SafeFetchOptions extends RequestInit {
  skipJsonParse?: boolean;
}

export interface SafeFetchResult<T = any> {
  data: T | null;
  error: string | null;
  response: Response | null;
}

/**
 * Safely fetch and parse JSON, handling HTML error pages
 */
export async function safeFetch<T = any>(
  url: string,
  options?: SafeFetchOptions
): Promise<SafeFetchResult<T>> {
  try {
    const response = await fetch(url, options);
    
    // Check content type before parsing
    const contentType = response.headers.get('content-type');
    const isJson = contentType && contentType.includes('application/json');
    
    if (!response.ok) {
      // Try to parse error message if JSON
      if (isJson) {
        try {
          const errorData = await response.json();
          return {
            data: null,
            error: errorData.error || errorData.message || `HTTP ${response.status}: ${response.statusText}`,
            response
          };
        } catch {
          // If JSON parse fails, return generic error
          return {
            data: null,
            error: `HTTP ${response.status}: ${response.statusText}`,
            response
          };
        }
      } else {
        // HTML error page - return generic error
        return {
          data: null,
          error: `HTTP ${response.status}: ${response.statusText}. Server returned HTML instead of JSON.`,
          response
        };
      }
    }
    
    // If skipJsonParse is true, return response as-is
    if (options?.skipJsonParse) {
      return {
        data: response as any,
        error: null,
        response
      };
    }
    
    // Parse JSON only if content-type is JSON
    if (!isJson) {
      return {
        data: null,
        error: 'Response is not JSON. Content-Type: ' + (contentType || 'unknown'),
        response
      };
    }
    
    const data = await response.json();
    return {
      data,
      error: null,
      response
    };
  } catch (error) {
    // Network errors or other exceptions
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Network error occurred',
      response: null
    };
  }
}

/**
 * Helper to check if response is JSON before parsing
 */
export function isJsonResponse(response: Response): boolean {
  const contentType = response.headers.get('content-type');
  return contentType ? contentType.includes('application/json') : false;
}

/**
 * Safely parse JSON from a response, handling HTML error pages
 * Returns null if response is not JSON or parsing fails
 */
export async function safeJsonParse<T = any>(response: Response): Promise<T | null> {
  try {
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      console.warn('Response is not JSON. Content-Type:', contentType);
      return null;
    }
    return await response.json();
  } catch (error) {
    console.error('Failed to parse JSON response:', error);
    return null;
  }
}

