/**
 * Cookie utility functions for managing user consent and preferences
 */

export type CookieConsentStatus = 'accepted' | 'declined' | null;

export interface CookiePreferences {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
  preferences: boolean;
}

export const DEFAULT_COOKIE_PREFERENCES: CookiePreferences = {
  necessary: true, // Always required
  analytics: true,
  marketing: false,
  preferences: true
};

/**
 * Get the current cookie consent status
 */
export function getCookieConsentStatus(): CookieConsentStatus {
  if (typeof window === 'undefined') return null;
  
  const status = localStorage.getItem('cookieConsent');
  return status as CookieConsentStatus;
}

/**
 * Set cookie consent status
 */
export function setCookieConsentStatus(status: CookieConsentStatus): void {
  if (typeof window === 'undefined') return;
  
  if (status) {
    localStorage.setItem('cookieConsent', status);
  } else {
    localStorage.removeItem('cookieConsent');
  }
}

/**
 * Get user's cookie preferences
 */
export function getCookiePreferences(): CookiePreferences {
  if (typeof window === 'undefined') return DEFAULT_COOKIE_PREFERENCES;
  
  const preferences = localStorage.getItem('cookiePreferences');
  if (preferences) {
    try {
      return { ...DEFAULT_COOKIE_PREFERENCES, ...JSON.parse(preferences) };
    } catch {
      return DEFAULT_COOKIE_PREFERENCES;
    }
  }
  
  return DEFAULT_COOKIE_PREFERENCES;
}

/**
 * Set user's cookie preferences
 */
export function setCookiePreferences(preferences: Partial<CookiePreferences>): void {
  if (typeof window === 'undefined') return;
  
  const currentPreferences = getCookiePreferences();
  const newPreferences = { ...currentPreferences, ...preferences };
  
  localStorage.setItem('cookiePreferences', JSON.stringify(newPreferences));
}

/**
 * Check if analytics cookies are allowed
 */
export function isAnalyticsAllowed(): boolean {
  const status = getCookieConsentStatus();
  const preferences = getCookiePreferences();
  
  return status === 'accepted' && preferences.analytics;
}

/**
 * Check if marketing cookies are allowed
 */
export function isMarketingAllowed(): boolean {
  const status = getCookieConsentStatus();
  const preferences = getCookiePreferences();
  
  return status === 'accepted' && preferences.marketing;
}

/**
 * Clear all cookie preferences and consent
 */
export function clearCookiePreferences(): void {
  if (typeof window === 'undefined') return;
  
  localStorage.removeItem('cookieConsent');
  localStorage.removeItem('cookiePreferences');
}

/**
 * Initialize Google Analytics based on consent
 */
export function initializeAnalytics(): void {
  if (typeof window === 'undefined' || !isAnalyticsAllowed()) return;
  
  // Initialize Google Analytics or other analytics tools here
  // This is a placeholder for when you add analytics
  console.log('Analytics initialized with user consent');
}

/**
 * Initialize marketing tools based on consent
 */
export function initializeMarketing(): void {
  if (typeof window === 'undefined' || !isMarketingAllowed()) return;
  
  // Initialize marketing tools here
  // This is a placeholder for when you add marketing tools
  console.log('Marketing tools initialized with user consent');
}

