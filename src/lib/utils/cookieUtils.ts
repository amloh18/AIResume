/**
 * Cookie utility functions for managing user consent and preferences.
 * Sets actual browser cookies, synchronizes with localStorage, and updates
 * tracking tools (PostHog, Google Analytics) according to user preferences.
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
  preferences: true,
};

export const COOKIE_CONSENT_NAME = 'cookie_consent';
export const COOKIE_PREFERENCES_NAME = 'cookie_preferences';

/**
 * Set an actual browser cookie with standard attributes
 */
function setBrowserCookie(name: string, value: string, maxAgeDays = 365): void {
  if (typeof document === 'undefined') return;
  const isSecure = typeof window !== 'undefined' && window.location.protocol === 'https:';
  const maxAge = maxAgeDays * 24 * 60 * 60;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax${isSecure ? '; Secure' : ''}`;
}

/**
 * Read a cookie by name from document.cookie
 */
function getBrowserCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'));
  return match ? decodeURIComponent(match[3]) : null;
}

/**
 * Delete a cookie
 */
function deleteBrowserCookie(name: string): void {
  if (typeof document === 'undefined') return;
  const isSecure = typeof window !== 'undefined' && window.location.protocol === 'https:';
  document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax${isSecure ? '; Secure' : ''}`;
}

/**
 * Get the current cookie consent status (from cookie or localStorage)
 */
export function getCookieConsentStatus(): CookieConsentStatus {
  if (typeof window === 'undefined') return null;

  try {
    // Check browser cookie first
    const cookieStatus = getBrowserCookie(COOKIE_CONSENT_NAME);
    if (cookieStatus === 'accepted' || cookieStatus === 'declined' || cookieStatus === 'customized') {
      return cookieStatus as CookieConsentStatus;
    }

    // Fallback to localStorage
    const localStatus = localStorage.getItem('cookieConsent');
    if (localStatus === 'accepted' || localStatus === 'declined' || localStatus === 'customized') {
      // Sync to cookie
      setBrowserCookie(COOKIE_CONSENT_NAME, localStatus);
      return localStatus as CookieConsentStatus;
    }

    return null;
  } catch (error) {
    console.error('Error reading cookie consent:', error);
    return null;
  }
}

/**
 * Set cookie consent status and write to both cookie and localStorage
 */
export function setCookieConsentStatus(status: CookieConsentStatus): void {
  if (typeof window === 'undefined') return;

  try {
    if (status && (status === 'accepted' || status === 'declined' || status === 'customized')) {
      // 1. Write to localStorage
      localStorage.setItem('cookieConsent', status);
      const expiryDate = new Date();
      expiryDate.setFullYear(expiryDate.getFullYear() + 1);
      localStorage.setItem('cookieConsentExpiry', expiryDate.toISOString());

      // 2. Write real browser cookie
      setBrowserCookie(COOKIE_CONSENT_NAME, status, 365);

      // 3. Save matching preferences
      const preferences: CookiePreferences = status === 'accepted'
        ? { necessary: true, analytics: true, marketing: true, preferences: true }
        : status === 'declined'
        ? { necessary: true, analytics: false, marketing: false, preferences: false }
        : getCookiePreferences();

      setBrowserCookie(COOKIE_PREFERENCES_NAME, JSON.stringify(preferences), 365);
      localStorage.setItem('cookiePreferences', JSON.stringify(preferences));
    } else {
      localStorage.removeItem('cookieConsent');
      localStorage.removeItem('cookieConsentExpiry');
      localStorage.removeItem('cookiePreferences');
      deleteBrowserCookie(COOKIE_CONSENT_NAME);
      deleteBrowserCookie(COOKIE_PREFERENCES_NAME);
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

  try {
    const rawCookie = getBrowserCookie(COOKIE_PREFERENCES_NAME);
    if (rawCookie) {
      return { ...DEFAULT_COOKIE_PREFERENCES, ...JSON.parse(rawCookie) };
    }

    const localPreferences = localStorage.getItem('cookiePreferences');
    if (localPreferences) {
      return { ...DEFAULT_COOKIE_PREFERENCES, ...JSON.parse(localPreferences) };
    }
  } catch {}

  if (getCookieConsentStatus() === 'accepted') {
    return {
      necessary: true,
      analytics: true,
      marketing: true,
      preferences: true,
    };
  }

  if (getCookieConsentStatus() === 'declined') {
    return {
      necessary: true,
      analytics: false,
      marketing: false,
      preferences: false,
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
  setBrowserCookie(COOKIE_PREFERENCES_NAME, JSON.stringify(newPreferences), 365);
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
  deleteBrowserCookie(COOKIE_CONSENT_NAME);
  deleteBrowserCookie(COOKIE_PREFERENCES_NAME);
}

/**
 * Initialize analytics tools (PostHog, Google Analytics) based on consent
 */
export function initializeAnalytics(): void {
  if (typeof window === 'undefined' || !isAnalyticsAllowed()) return;

  try {
    // 1. PostHog Consent Opt-in
    import('posthog-js')
      .then(({ default: posthog }) => {
        if (typeof posthog?.opt_in_capturing === 'function') {
          posthog.opt_in_capturing();
          posthog.capture('cookie_consent_accepted', {
            analytics_granted: true,
            marketing_granted: isMarketingAllowed(),
          });
        }
      })
      .catch(() => {});

    // 2. Google Analytics Consent Grant
    const win = window as any;
    if (typeof win.gtag === 'function') {
      win.gtag('consent', 'update', {
        analytics_storage: 'granted',
        ad_storage: isMarketingAllowed() ? 'granted' : 'denied',
      });
    }

    console.log('📊 Analytics active and enabled by cookie consent');
  } catch (err) {
    console.warn('Failed to initialize analytics:', err);
  }
}

/**
 * Initialize marketing tools based on consent
 */
export function initializeMarketing(): void {
  if (typeof window === 'undefined' || !isMarketingAllowed()) return;

  try {
    const win = window as any;
    if (typeof win.gtag === 'function') {
      win.gtag('consent', 'update', {
        ad_storage: 'granted',
        ad_user_data: 'granted',
        ad_personalization: 'granted',
      });
    }

    console.log('🎯 Marketing tools active and enabled by cookie consent');
  } catch (err) {
    console.warn('Failed to initialize marketing tools:', err);
  }
}

/**
 * Revoke tracking and opt-out of analytics/marketing
 */
export function revokeConsent(): void {
  if (typeof window === 'undefined') return;

  try {
    // PostHog Opt-out
    import('posthog-js')
      .then(({ default: posthog }) => {
        if (typeof posthog?.opt_out_capturing === 'function') {
          posthog.opt_out_capturing();
        }
      })
      .catch(() => {});

    // Google Analytics Denial
    const win = window as any;
    if (typeof win.gtag === 'function') {
      win.gtag('consent', 'update', {
        analytics_storage: 'denied',
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
      });
    }

    console.log('🛑 Cookie consent declined: tracking disabled');
  } catch (err) {
    console.warn('Failed to revoke consent:', err);
  }
}
