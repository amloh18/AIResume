/**
 * Admin Panel Configuration (Server-Only)
 * Server-side functions for fetching dynamic values from database
 * 
 * NOTE: This file is server-only and cannot be imported in client components.
 * For client-safe constants, use '@/lib/config/adminConstants' instead.
 */

import 'server-only';
import PricingPlan from '@/models/PricingPlan';
import getConnection from '@/lib/database';

// Re-export constants for convenience (these are client-safe)
export * from './adminConstants';

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
    return ['free', 'pro_monthly', 'pro_quarterly', 'pro_yearly', 'pro_lifetime'];
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
      'pro_monthly': 'Monthly Pro',
      'pro_quarterly': 'Quarterly Pro',
      'pro_yearly': 'Yearly Pro',
      'pro_lifetime': 'Lifetime'
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


