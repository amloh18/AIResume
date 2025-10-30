/**
 * Safely parse JSON with proper error handling
 * Prevents "Unexpected end of JSON input" errors
 */

export function safeJsonParse<T = any>(
  jsonString: string | null | undefined,
  fallback: T | null = null
): T | null {
  if (!jsonString || typeof jsonString !== 'string') {
    return fallback;
  }

  const trimmed = jsonString.trim();
  if (!trimmed) {
    return fallback;
  }

  try {
    return JSON.parse(trimmed);
  } catch (error) {
    console.warn('Failed to parse JSON:', error);
    return fallback;
  }
}

/**
 * Safely parse JSON from localStorage
 */
export function safeLocalStorageParse<T = any>(
  key: string,
  fallback: T | null = null
): T | null {
  if (typeof window === 'undefined') {
    return fallback;
  }

  try {
    const value = localStorage.getItem(key);
    return safeJsonParse(value, fallback);
  } catch (error) {
    console.warn(`Failed to parse localStorage item "${key}":`, error);
    return fallback;
  }
}

/**
 * Safely parse JSON from sessionStorage
 */
export function safeSessionStorageParse<T = any>(
  key: string,
  fallback: T | null = null
): T | null {
  if (typeof window === 'undefined') {
    return fallback;
  }

  try {
    const value = sessionStorage.getItem(key);
    return safeJsonParse(value, fallback);
  } catch (error) {
    console.warn(`Failed to parse sessionStorage item "${key}":`, error);
    return fallback;
  }
}

/**
 * Safely set JSON to localStorage
 */
export function safeLocalStorageSet(key: string, value: any): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.warn(`Failed to set localStorage item "${key}":`, error);
    return false;
  }
}

/**
 * Safely set JSON to sessionStorage
 */
export function safeSessionStorageSet(key: string, value: any): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    sessionStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.warn(`Failed to set sessionStorage item "${key}":`, error);
    return false;
  }
}
