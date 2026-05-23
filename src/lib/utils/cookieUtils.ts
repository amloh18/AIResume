/**
 * Cookie utility functions for managing user consent and preferences
 */

export type CookieConsentStatus = 'accepted' | 'declined' | 'customized' | null;

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
  
  try {
    const status = localStorage.getItem('cookieConsent');
    // Validate that the status is a valid value
    if (status === 'accepted' || status === 'declined' || status === 'customized') {
      return status as CookieConsentStatus;
    }
    return null;
  } catch (error) {
    console.error('Error reading cookie consent:', error);
    return null;
  }
}

/**
 * Set cookie consent status
 */
export function setCookieConsentStatus(status: CookieConsentStatus): void {
  if (typeof window === 'undefined') return;
  
  try {
    if (status && (status === 'accepted' || status === 'declined' || status === 'customized')) {
      localStorage.setItem('cookieConsent', status);
      // Also set an expiry date (1 year from now) to ensure persistence
      const expiryDate = new Date();
      expiryDate.setFullYear(expiryDate.getFullYear() + 1);
      localStorage.setItem('cookieConsentExpiry', expiryDate.toISOString());
    } else {
      localStorage.removeItem('cookieConsent');
      localStorage.removeItem('cookieConsentExpiry');
    }
  } catch (error) {
    console.error('Error setting cookie consent:', error);
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
  
  // If user accepted all, return all true
  if (getCookieConsentStatus() === 'accepted') {
    return {
      necessary: true,
      analytics: true,
      marketing: true,
      preferences: true
    };
  }

  // If user declined all, return only necessary
  if (getCookieConsentStatus() === 'declined') {
    return {
      necessary: true,
      analytics: false,
      marketing: false,
      preferences: false
    };
  }
  
  return DEFAULT_COOKIE_PREFERENCES;
}

/**
 * Set user's cookie preferences
 */
export function setCookiePreferences(preferences: Partial<CookiePreferences>): void {
  if (typeof window === 'undefined') return;
  
  const currentPreferences = getCookiePreferences();
  const newPreferences = { ...currentPreferences, ...preferences, necessary: true };
  
  localStorage.setItem('cookiePreferences', JSON.stringify(newPreferences));
  setCookieConsentStatus('customized');
}

/**
 * Check if analytics cookies are allowed
 */
export function isAnalyticsAllowed(): boolean {
  const status = getCookieConsentStatus();
  if (status === 'accepted') return true;
  if (status === 'declined') return false;
  
  const preferences = getCookiePreferences();
  return preferences.analytics;
}

/**
 * Check if marketing cookies are allowed
 */
export function isMarketingAllowed(): boolean {
  const status = getCookieConsentStatus();
  if (status === 'accepted') return true;
  if (status === 'declined') return false;
  
  const preferences = getCookiePreferences();
  return preferences.marketing;
}

/**
 * Clear all cookie preferences and consent
 */
export function clearCookiePreferences(): void {
  if (typeof window === 'undefined') return;
  
  localStorage.removeItem('cookieConsent');
  localStorage.removeItem('cookiePreferences');
  localStorage.removeItem('cookieConsentExpiry');
}

/**
 * Initialize Google Analytics based on consent
 */
export function initializeAnalytics(): void {
  if (typeof window === 'undefined' || !isAnalyticsAllowed()) return;
  
  // This is where you'd trigger GA or other trackers
  console.log('📊 Analytics initialized based on consent');
}

/**
 * Initialize marketing tools based on consent
 */
export function initializeMarketing(): void {
  if (typeof window === 'undefined' || !isMarketingAllowed()) return;
  
  // This is where you'd trigger FB Pixel, etc.
  console.log('🎯 Marketing tools initialized based on consent');
}
