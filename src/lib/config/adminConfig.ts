/**
 * Admin Panel Configuration
 * Centralized configuration for admin panel components
 * Fetches dynamic values from database to avoid hardcoding
 */

import PricingPlan from '@/models/PricingPlan';
import getConnection from '@/lib/database';

// Cache configuration for performance
let configCache: {
  plans: string[];
  planDisplayNames: Record<string, string>;
  lastUpdated: Date;
} | null = null;

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get all active plan keys from database
 */
export async function getPlanKeys(): Promise<string[]> {
  try {
    await getConnection();
    const plans = await PricingPlan.find({ status: 'active' })
      .select('key name')
      .lean();
    
    return plans.map(p => p.key);
  } catch (error) {
    console.error('Error fetching plan keys:', error);
    // Fallback to default plans
    return ['free', 'day_pass', 'pro_monthly', 'pro_quarterly', 'pro_yearly'];
  }
}

/**
 * Get plan display names (from database or fallback)
 */
export async function getPlanDisplayNames(): Promise<Record<string, string>> {
  try {
    await getConnection();
    const plans = await PricingPlan.find({ status: 'active' })
      .select('key name')
      .lean();
    
    const displayNames: Record<string, string> = {};
    plans.forEach(plan => {
      displayNames[plan.key] = plan.name;
    });
    
    return displayNames;
  } catch (error) {
    console.error('Error fetching plan display names:', error);
    // Fallback display names
    return {
      'free': 'Free',
      'day_pass': 'Day Pass',
      'pro_monthly': 'Monthly Pro',
      'pro_quarterly': 'Quarterly Pro',
      'pro_yearly': 'Yearly Pro'
    };
  }
}

/**
 * Get cached or fresh plan configuration
 */
export async function getPlanConfig(): Promise<{
  plans: string[];
  planDisplayNames: Record<string, string>;
}> {
  const now = new Date();
  
  if (configCache && (now.getTime() - configCache.lastUpdated.getTime()) < CACHE_TTL) {
    return {
      plans: configCache.plans,
      planDisplayNames: configCache.planDisplayNames
    };
  }
  
  const [plans, planDisplayNames] = await Promise.all([
    getPlanKeys(),
    getPlanDisplayNames()
  ]);
  
  configCache = {
    plans,
    planDisplayNames,
    lastUpdated: now
  };
  
  return { plans, planDisplayNames };
}

/**
 * Get plans for campaign filtering (excludes free plan typically)
 */
export async function getCampaignFilterPlans(): Promise<string[]> {
  const { plans } = await getPlanConfig();
  // Filter out free plan for campaign targeting
  return plans.filter(p => p !== 'free');
}

/**
 * Invalidate config cache (call after plan updates)
 */
export function invalidateConfigCache(): void {
  configCache = null;
}

/**
 * Status values
 */
export const SUBSCRIPTION_STATUSES = ['active', 'inactive', 'cancelled', 'expired'] as const;
export type SubscriptionStatus = typeof SUBSCRIPTION_STATUSES[number];

export const USER_ROLES = ['user', 'admin', 'superadmin'] as const;
export type UserRole = typeof USER_ROLES[number];

export const TEMPLATE_TIERS = ['free', 'premium'] as const;
export type TemplateTier = typeof TEMPLATE_TIERS[number];

export const CAMPAIGN_STATUSES = ['draft', 'scheduled', 'sent', 'cancelled'] as const;
export type CampaignStatus = typeof CAMPAIGN_STATUSES[number];

/**
 * Currency options
 */
export const SUPPORTED_CURRENCIES = ['EUR', 'USD', 'INR'] as const;
export type SupportedCurrency = typeof SUPPORTED_CURRENCIES[number];

/**
 * Payment providers
 */
export const PAYMENT_PROVIDERS = ['stripe', 'razorpay', 'admin', 'none'] as const;
export type PaymentProvider = typeof PAYMENT_PROVIDERS[number];

/**
 * Default values
 */
export const DEFAULT_CURRENCY: SupportedCurrency = 'EUR';
export const DEFAULT_PLAN_KEY = 'free';

