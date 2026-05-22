// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import { PricingPlan } from '@/models';
import { detectUserRegion } from '@/lib/services/regionDetectionService';
import { getAdminPricingPlan } from '@/models/admin-models';
import { createErrorResponse } from '@/lib/api/error-handler';

// Helper to get currency symbol
function getCurrencySymbol(currency: string): string {
  const symbols: Record<string, string> = {
    'USD': '$',
    'EUR': '€',
    'GBP': '£',
    'INR': '₹',
  };
  return symbols[currency.toUpperCase()] || currency;
}

// In-memory cache for pricing plans (static data that rarely changes)
interface CacheEntry {
  data: any;
  timestamp: number;
  region?: string;
}

const pricingCache = new Map<string, CacheEntry>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache

// Fallback pricing plans for when database is empty
const fallbackPlans = [
  // Essential Category
  {
    _id: 'free',
    key: 'free',
    name: 'Free',
    description: 'Get started with your first professional CV',
    price_monthly: 0,
    price_one_time: 0,
    currency: 'GBP',
    features: [
      'Access to ALL templates and snippets',
      'Application Tracker (Full Kanban access)',
      'Basic Chrome Extension functionality',
      'Basic AI Writing (Grammar & rephrasing)',
      'Limited Free AI Credits'
    ],
    notIncludedFeatures: [
      'Unlimited AI Generation',
      'ATS Scoring & Editing',
      'Advanced Sentence Structuring (STAR method)',
      'AI Cover Letter Generator',
      'LinkedIn Enhancer',
      'Interview Coach Simulator'
    ],
    isPopular: false,
    isBestValue: false,
    displayOnLanding: true,
    targetAudience: 'all',
    maxCVs: 1,
    maxExports: 1,
    maxCoverLetters: 0,
    maxJobs: 3,
    maxJourneys: 0,
    billingCycle: 'free',
    category: 'essential'
  },
  {
    _id: 'pro_yearly',
    key: 'pro_yearly',
    name: 'Professional Yearly',
    description: 'Full access to all features with yearly billing',
    price_monthly: 0,
    price_quarterly: 0,
    price_yearly: 149,
    price_one_time: 0,
    currency: 'GBP',
    features: [
      'Unlimited AI Generation',
      'ATS Scoring & Editing (Real-time feedback)',
      'Advanced Sentence Structuring (STAR method)',
      'Unlimited AI Cover Letter Generator',
      'LinkedIn Enhancer (Profile suggestions)',
      'Interview Coach (Mock simulator)',
      'Access to ALL templates and snippets',
      'Application Tracker (Full Kanban access)'
    ],
    notIncludedFeatures: [],
    isPopular: false,
    isBestValue: false,
    displayOnLanding: true,
    targetAudience: 'all',
    maxCVs: -1,
    maxExports: -1,
    maxCoverLetters: -1,
    maxJobs: -1,
    maxJourneys: -1,
    billingCycle: 'yearly',
    category: 'professional'
  },
  // Professional Category
  {
    _id: 'pro_monthly',
    key: 'pro_monthly',
    name: 'Professional Monthly',
    description: 'Complete career toolkit with monthly flexibility',
    price_monthly: 19,
    price_quarterly: 0,
    price_yearly: 0,
    price_one_time: 0,
    currency: 'GBP',
    features: [
      'Unlimited AI Generation',
      'ATS Scoring & Editing (Real-time feedback)',
      'Advanced Sentence Structuring (STAR method)',
      'Unlimited AI Cover Letter Generator',
      'LinkedIn Enhancer (Profile suggestions)',
      'Interview Coach (Mock simulator)',
      'Access to ALL templates and snippets',
      'Application Tracker (Full Kanban access)'
    ],
    notIncludedFeatures: [],
    isPopular: false,
    isBestValue: false,
    displayOnLanding: true,
    targetAudience: 'all',
    maxCVs: -1,
    maxExports: -1,
    maxCoverLetters: -1,
    maxJobs: -1,
    maxJourneys: -1,
    billingCycle: 'monthly',
    category: 'professional'
  },
  {
    _id: 'pro_quarterly',
    key: 'pro_quarterly',
    name: 'Professional Quarterly',
    description: 'Best value with priority support included',
    price_monthly: 0,
    price_quarterly: 49,
    price_yearly: 0,
    price_one_time: 0,
    currency: 'GBP',
    features: [
      'Unlimited AI Generation',
      'ATS Scoring & Editing (Real-time feedback)',
      'Advanced Sentence Structuring (STAR method)',
      'Unlimited AI Cover Letter Generator',
      'LinkedIn Enhancer (Profile suggestions)',
      'Interview Coach (Mock simulator)',
      'Access to ALL templates and snippets',
      'Application Tracker (Full Kanban access)'
    ],
    notIncludedFeatures: [],
    isPopular: true,
    isBestValue: false,
    displayOnLanding: true,
    targetAudience: 'all',
    maxCVs: -1,
    maxExports: -1,
    maxCoverLetters: -1,
    maxJobs: -1,
    maxJourneys: -1,
    billingCycle: 'quarterly',
    category: 'professional'
  },
  {
    _id: 'pro_lifetime',
    key: 'pro_lifetime',
    name: 'Lifetime',
    description: 'One-time payment for lifetime access',
    price_monthly: 0,
    price_quarterly: 0,
    price_yearly: 0,
    price_one_time: 179,
    currency: 'GBP',
    features: [
      'Unlimited AI Generation',
      'ATS Scoring & Editing (Real-time feedback)',
      'Advanced Sentence Structuring (STAR method)',
      'Unlimited AI Cover Letter Generator',
      'LinkedIn Enhancer (Profile suggestions)',
      'Interview Coach (Mock simulator)',
      'Access to ALL templates and snippets',
      'Application Tracker (Full Kanban access)',
      'Career Vault (Permanent Archive)'
    ],
    notIncludedFeatures: [],
    isPopular: false,
    isBestValue: true,
    displayOnLanding: true,
    targetAudience: 'all',
    maxCVs: -1,
    maxExports: -1,
    maxCoverLetters: -1,
    maxJobs: -1,
    maxJourneys: -1,
    billingCycle: 'one-time',
    category: 'professional'
  }
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const currency = searchParams.get('currency');
    const includeInactive = searchParams.get('includeInactive') === 'true';
    const publicOnly = searchParams.get('public') === 'true';

    // Create cache key based on query parameters
    const cacheKey = `pricing-${currency || 'all'}-${includeInactive}-${publicOnly}`;
    const now = Date.now();

    // Check cache first
    const cached = pricingCache.get(cacheKey);
    if (cached && (now - cached.timestamp) < CACHE_TTL) {
      // Return cached response with appropriate headers
      return NextResponse.json(cached.data, {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
          'X-Cache': 'HIT'
        }
      });
    }

    // Detect user region from IP (with timeout to prevent blocking)
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined;
    let regionInfo;
    try {
      // Add timeout to region detection to prevent slow API calls
      const regionPromise = detectUserRegion(ip);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Region detection timeout')), 2000)
      );
      regionInfo = await Promise.race([regionPromise, timeoutPromise]) as any;
    } catch (error) {
      console.warn('Region detection failed, using default:', error);
      regionInfo = {
        countryCode: 'US',
        countryName: 'United States',
        currency: 'USD',
        currencySymbol: '$',
        paymentPartner: 'stripe'
      };
    }

    let query: any = {};

    if (!includeInactive) {
      query.status = 'active';
    }

    if (currency) {
      query.currency = currency;
    }

    // For public API, only return plans that should be displayed on landing page
    if (publicOnly) {
      query.displayOnLanding = true;
      query.targetAudience = 'all';
    }

    let plans = [];

    try {
      await getConnection();
      const PricingPlanModel = await getAdminPricingPlan();
      // Fetch plans without populate - we'll fetch CountryPricing manually when needed
      const dbPlans = await PricingPlanModel.find(query)
        .sort({ sortOrder: 1 })
        .lean();

      if (dbPlans && dbPlans.length > 0) {
        plans = dbPlans;
      } else {
        // Use fallback plans if database is empty
        plans = fallbackPlans;
      }
    } catch (dbError) {
      console.warn('Database connection failed, using fallback plans:', dbError);
      // Use fallback plans if database connection fails
      plans = fallbackPlans;
    }

    // Get country pricing for user's region (if available)
    // This is the primary source for prices - all prices come from CountryPricing collection
    const { getCountryPricing } = await import('@/lib/services/countryPricingService');
    const countryPricing = regionInfo?.countryCode
      ? await getCountryPricing(regionInfo.countryCode)
      : null;

    // Get default country pricing from plan's defaultCountryPricingId as fallback
    // This ensures we always have pricing even if user's country pricing doesn't exist
    let defaultCountryPricing = null;
    if (plans.length > 0 && plans[0].defaultCountryPricingId) {
      const defaultCountryPricingId = (plans[0] as any).defaultCountryPricingId;
      // Fetch CountryPricing by ObjectId (not populated)
      const { getCountryPricingById } = await import('@/lib/services/countryPricingService');
      defaultCountryPricing = await getCountryPricingById(defaultCountryPricingId);
    }

    // Add promotional pricing, country pricing, and computed fields
    const currentDate = new Date();
    const enhancedPlans = await Promise.all(plans.map(async (plan) => {

      // Check if promotion is active
      const isPromotionActive = (plan as any).promotionValidFrom && (plan as any).promotionValidUntil &&
        new Date((plan as any).promotionValidFrom) <= currentDate && new Date((plan as any).promotionValidUntil) >= currentDate;

      // Helper to get country price for a specific plan from CountryPricing collection
      // Priority: 1. User's country pricing, 2. Plan's defaultCountryPricingId, 3. Legacy plan prices (deprecated)
      const getCountryPriceForPlan = (planKey: string, pricingSource: any) => {
        if (!pricingSource) return null;

        const planKeyMap: Record<string, keyof typeof pricingSource.planPrices> = {
          'free': 'free',
          'day_pass': 'dayPass',
          'pro_monthly': 'monthly',
          'pro_quarterly': 'quarterly',
          'pro_yearly': 'dayPass',
          'pro_lifetime': 'yearly'
        };

        const pricingKey = planKeyMap[planKey];
        return pricingKey ? pricingSource.planPrices[pricingKey]?.price : null;
      };

      // Get price from user's country pricing, or fallback to plan's defaultCountryPricingId
      const activePricing = countryPricing || defaultCountryPricing;
      const planDefaultPricingId = (plan as any).defaultCountryPricingId;

      // Try to get default pricing from ObjectId reference (fetch manually, no populate)
      let planDefaultCountryPricing = null;
      if (planDefaultPricingId) {
        // Fetch CountryPricing by ObjectId
        const { getCountryPricingById } = await import('@/lib/services/countryPricingService');
        planDefaultCountryPricing = await getCountryPricingById(planDefaultPricingId);
      }

      // All prices MUST come from CountryPricing - no legacy fallbacks
      const basePrice = {
        monthly: getCountryPriceForPlan('pro_monthly', activePricing)
          || getCountryPriceForPlan('pro_monthly', planDefaultCountryPricing)
          || 0, // No legacy fallback - prices must be in CountryPricing
        quarterly: getCountryPriceForPlan('pro_quarterly', activePricing)
          || getCountryPriceForPlan('pro_quarterly', planDefaultCountryPricing)
          || 0, // No legacy fallback
        yearly: getCountryPriceForPlan('pro_yearly', activePricing)
          || getCountryPriceForPlan('pro_yearly', planDefaultCountryPricing)
          || 0, // No legacy fallback
        oneTime: getCountryPriceForPlan('day_pass', activePricing)
          || getCountryPriceForPlan('pro_lifetime', activePricing)
          || getCountryPriceForPlan('day_pass', planDefaultCountryPricing)
          || getCountryPriceForPlan('pro_lifetime', planDefaultCountryPricing)
          || 0 // No legacy fallback
      };

      const effectivePrice = {
        monthly: isPromotionActive && (plan as any).promotionalPrice_monthly
          ? (plan as any).promotionalPrice_monthly
          : basePrice.monthly,
        quarterly: isPromotionActive && (plan as any).promotionalPrice_quarterly
          ? (plan as any).promotionalPrice_quarterly
          : basePrice.quarterly,
        yearly: isPromotionActive && (plan as any).promotionalPrice_yearly
          ? (plan as any).promotionalPrice_yearly
          : basePrice.yearly,
        oneTime: isPromotionActive && (plan as any).promotionalPrice_one_time
          ? (plan as any).promotionalPrice_one_time
          : basePrice.oneTime
      };

      // Calculate time-based duration
      let durationInfo = null;
      if (plan.key === 'day_pass') {
        durationInfo = {
          durationInDays: 1,
          durationType: 'hour',
          durationHours: (plan as any).dayPassDuration || 24,
          displayText: `${(plan as any).dayPassDuration || 24} hours`
        };
      } else if (plan.key === 'pro_monthly') {
        durationInfo = {
          durationInDays: 30,
          durationType: 'month',
          displayText: '1 month'
        };
      } else if (plan.key === 'pro_quarterly') {
        durationInfo = {
          durationInDays: 90,
          durationType: 'month',
          displayText: '3 months'
        };
      } else if (plan.key === 'pro_yearly') {
        durationInfo = {
          durationInDays: 365,
          durationType: 'year',
          displayText: '1 year'
        };
      } else if (plan.key === 'pro_lifetime') {
        durationInfo = {
          durationInDays: -1,
          durationType: 'year',
          displayText: 'Lifetime'
        };
      }

      // Get currency from CountryPricing (primary source) - no legacy fallbacks
      const planCurrency = activePricing?.currency
        || planDefaultCountryPricing?.currency
        || regionInfo?.currency
        || 'GBP'; // Default to GBP (matches our defaultCountryPricing)

      const planCurrencySymbol = activePricing?.currencySymbol
        || planDefaultCountryPricing?.currencySymbol
        || getCurrencySymbol(planCurrency);

      return {
        ...plan,
        // Credit-based system (primary)
        credits: plan.credits ? {
          cvCredits: plan.credits.cvCredits === -1 ? 'Unlimited' : plan.credits.cvCredits,
          exportCredits: plan.credits.exportCredits === -1 ? 'Unlimited' : plan.credits.exportCredits,
          atsCheckCredits: plan.credits.atsCheckCredits === -1 ? 'Unlimited' : plan.credits.atsCheckCredits,
          jobCredits: plan.credits.jobCredits === -1 ? 'Unlimited' : plan.credits.jobCredits,
          resetSchedule: plan.credits.resetSchedule
        } : undefined,
        // Legacy fields (deprecated - kept for backward compatibility)
        maxCVs: plan.maxCVs ? ((plan.maxCVs === 999999 || plan.maxCVs === -1) ? 'Unlimited' : plan.maxCVs) : undefined,
        maxExports: plan.maxExports ? ((plan.maxExports === 999999 || plan.maxExports === -1) ? 'Unlimited' : plan.maxExports) : undefined,
        maxCoverLetters: plan.maxCoverLetters ? ((plan.maxCoverLetters === 999999 || plan.maxCoverLetters === -1) ? 'Unlimited' : plan.maxCoverLetters) : undefined,
        maxJobs: plan.maxJobs ? ((plan.maxJobs === 999999 || plan.maxJobs === -1) ? 'Unlimited' : plan.maxJobs) : undefined,
        maxJourneys: plan.maxJourneys ? ((plan.maxJourneys === 999999 || plan.maxJourneys === -1) ? 'Unlimited' : plan.maxJourneys) : undefined,
        // Currency from CountryPricing collection (primary source)
        currency: planCurrency,
        currencySymbol: planCurrencySymbol,
        // Add computed fields for backward compatibility
        price: basePrice.monthly || basePrice.oneTime || 0,
        billingCycle: plan.billingCycle,
        // Country pricing info - use monthly pricing for display (from CountryPricing collection)
        regionalPricing: (() => {
          // Priority: 1. User's country pricing, 2. Plan's defaultCountryPricingId, 3. Fallback
          const pricingSource = countryPricing || planDefaultCountryPricing || defaultCountryPricing;
          if (pricingSource) {
            const monthlyPrice = pricingSource.planPrices.monthly.price;
            return {
              region: pricingSource.countryCode,
              regionName: pricingSource.countryName,
              currency: pricingSource.currency,
              currencySymbol: pricingSource.currencySymbol,
              price: monthlyPrice,
              displayPrice: `${pricingSource.currencySymbol}${monthlyPrice}`,
              polarPriceId: pricingSource.polarPriceIds?.monthly
            };
          } else {
            // Fallback to region info (should rarely happen if CountryPricing is properly set up)
            return {
              region: regionInfo?.countryCode || 'US',
              regionName: regionInfo?.countryName || 'United States',
              currency: planCurrency,
              currencySymbol: planCurrencySymbol,
              price: basePrice.monthly || 0,
              displayPrice: `${planCurrencySymbol}${basePrice.monthly || 0}`
            };
          }
        })(),
        // Time-based metadata
        durationInfo,
        // Add promotional fields
        isPromotionActive,
        effectivePrice,
        // Add days remaining for promotion
        promotionDaysRemaining: isPromotionActive && (plan as any).promotionValidUntil ? Math.ceil((new Date((plan as any).promotionValidUntil).getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24)) : null
      };
    }));

    const responseData = {
      plans: enhancedPlans,
      region: {
        countryCode: regionInfo.countryCode,
        countryName: regionInfo.countryName,
        currency: regionInfo.currency,
        currencySymbol: regionInfo.currencySymbol,
        paymentPartner: regionInfo.paymentPartner
      }
    };

    // Cache the response
    pricingCache.set(cacheKey, {
      data: responseData,
      timestamp: now,
      region: regionInfo.countryCode
    });

    // Clean up old cache entries (keep only last 10)
    if (pricingCache.size > 10) {
      const oldestKey = Array.from(pricingCache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp)[0]?.[0];
      if (oldestKey) {
        pricingCache.delete(oldestKey);
      }
    }

    return NextResponse.json(responseData, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        'X-Cache': 'MISS'
      }
    });
  } catch (error) {
    // CRITICAL: Always return JSON, never let Next.js return HTML
    console.error('Error fetching pricing plans:', error);

    // Return fallback plans even on error, but ensure it's JSON
    try {
      return NextResponse.json({
        success: true,
        plans: fallbackPlans,
        region: {
          countryCode: 'US',
          countryName: 'United States',
          currency: 'USD',
          currencySymbol: '$',
          paymentPartner: 'stripe'
        },
        _fallback: true,
        _error: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 200 }); // Return 200 with fallback data
    } catch (jsonError) {
      // If even JSON creation fails, use error handler
      return createErrorResponse(error);
    }
  }
}
