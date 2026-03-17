/**
 * Admin Panel Constants
 * Client-safe constants for admin panel components
 * These can be imported in both client and server components
 */

/**
 * Status values
 */
export const SUBSCRIPTION_STATUSES = ['active', 'inactive', 'cancelled', 'expired'] as const;
export type SubscriptionStatus = typeof SUBSCRIPTION_STATUSES[number];

export const USER_ROLES = ['user', 'admin', 'superadmin'] as const;
export type UserRole = typeof USER_ROLES[number];

export const TEMPLATE_TIERS = ['free', 'premium'] as const;
export type TemplateTier = typeof TEMPLATE_TIERS[number];

export const CAMPAIGN_STATUSES = ['draft', 'scheduled', 'sent', 'cancelled', 'recurring', 'archived'] as const;
export type CampaignStatus = typeof CAMPAIGN_STATUSES[number];

/**
 * Currency options
 */
export const SUPPORTED_CURRENCIES = ['EUR', 'USD', 'INR'] as const;
export type SupportedCurrency = typeof SUPPORTED_CURRENCIES[number];

/**
 * Payment providers
 */
export const PAYMENT_PROVIDERS = ['polar', 'razorpay', 'admin', 'none'] as const;
export type PaymentProvider = typeof PAYMENT_PROVIDERS[number];

/**
 * Draft statuses
 */
export const DRAFT_STATUSES = ['anonymous', 'linked', 'converted'] as const;
export type DraftStatus = typeof DRAFT_STATUSES[number];

/**
 * Email template types
 */
export const EMAIL_TEMPLATE_TYPES = [
  'verification',
  'welcome',
  'password_reset',
  'membership_reminder',
  'limit_exhausted',
  'special_offers',
  'account_deletion',
  'custom'
] as const;
export type EmailTemplateType = typeof EMAIL_TEMPLATE_TYPES[number];

/**
 * Email template categories
 */
export const EMAIL_TEMPLATE_CATEGORIES = ['system', 'marketing', 'transactional'] as const;
export type EmailTemplateCategory = typeof EMAIL_TEMPLATE_CATEGORIES[number];

/**
 * Notification types
 */
export const NOTIFICATION_TYPES = [
  'system_update',
  'feature_announcement',
  'promotional_offer',
  'account_activity',
  'subscription_update'
] as const;
export type NotificationType = typeof NOTIFICATION_TYPES[number];

/**
 * Pagination defaults
 */
export const DEFAULT_PAGE_SIZE = 20;
export const DEFAULT_PAGE = 1;
export const MAX_PAGE_SIZE = 100;

/**
 * Time ranges for analytics
 */
export const TIME_RANGES = ['today', '7d', '30d', '90d', '1y'] as const;
export type TimeRange = typeof TIME_RANGES[number];

/**
 * Default values
 */
export const DEFAULT_CURRENCY: SupportedCurrency = 'EUR';
export const DEFAULT_PLAN_KEY = 'free';
export const DEFAULT_PAGINATION_LIMIT = 50;
export const DEFAULT_SEARCH_DEBOUNCE_MS = 300;

/**
 * Country code to name mapping (for regional pricing)
 * This should ideally come from a library or API, but providing common ones
 */
export const COUNTRY_NAMES: Record<string, string> = {
  'GB': 'United Kingdom',
  'US': 'United States',
  'CA': 'Canada',
  'AU': 'Australia',
  'DE': 'Germany',
  'FR': 'France',
  'IT': 'Italy',
  'ES': 'Spain',
  'NL': 'Netherlands',
  'BE': 'Belgium',
  'AT': 'Austria',
  'FI': 'Finland',
  'IE': 'Ireland',
  'PT': 'Portugal',
  'GR': 'Greece',
  'PL': 'Poland',
  'IN': 'India',
  'PK': 'Pakistan',
};

/**
 * Helper function to get country name
 */
export function getCountryName(countryCode: string): string {
  try {
    const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
    return regionNames.of(countryCode.toUpperCase()) || COUNTRY_NAMES[countryCode.toUpperCase()] || countryCode;
  } catch (error) {
    return COUNTRY_NAMES[countryCode.toUpperCase()] || countryCode;
  }
}

/**
 * Helper function to get country flag emoji
 */
export function getCountryFlag(countryCode: string): string {
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

