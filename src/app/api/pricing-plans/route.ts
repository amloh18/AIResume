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
    currency: 'USD',
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
    price_yearly: 144,
    price_one_time: 0,
    currency: 'USD',
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
    currency: 'USD',
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
    price_quarterly: 48,
    price_yearly: 0,
    price_one_time: 0,
    currency: 'USD',
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
    price_one_time: 199,
    currency: 'USD',
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
        paymentPartner: 'polar'
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
      const getCountryPriceForPlan = (planKey: string, pricingSource: any) => {
        if (!pricingSource) return null;

        const planKeyMap: Record<string, keyof typeof pricingSource.planPrices> = {
          'free': 'free',
          'day_pass': 'dayPass',
          'pro_monthly': 'monthly',
          'pro_quarterly': 'quarterly',
          'pro_yearly': 'yearly',
          'pro_lifetime': 'lifetime'
        };

        const pricingKey = planKeyMap[planKey];
        if (!pricingKey) return null;

        // Ensure we handle missing slots gracefully
        const slot = pricingSource.planPrices[pricingKey];
        return slot ? slot.price : null;
      };

      // Get price from user's country pricing, or fallback to plan's defaultCountryPricingId
      const activePricing = countryPricing || defaultCountryPricing;
      
      const standardFallbacks: Record<string, number> = {
        'pro_monthly': 19,
        'pro_quarterly': 48,
        'pro_yearly': 144,
        'pro_lifetime': 199,
        'day_pass': 9
      };

      // Base prices from database
      const dbPrice = {
        monthly: getCountryPriceForPlan('pro_monthly', activePricing) || standardFallbacks.pro_monthly,
        quarterly: getCountryPriceForPlan('pro_quarterly', activePricing) || standardFallbacks.pro_quarterly,
        yearly: getCountryPriceForPlan('pro_yearly', activePricing) || standardFallbacks.pro_yearly,
        lifetime: getCountryPriceForPlan('pro_lifetime', activePricing) || standardFallbacks.pro_lifetime,
        dayPass: getCountryPriceForPlan('day_pass', activePricing) || standardFallbacks.day_pass
      };

      // If we are using standard fallbacks (USD) but the user is in a different currency, 
      // and we DON'T have a CountryPricing record for them, perform a live conversion.
      let finalPrice = { ...dbPrice };
      let isConversionApplied = false;

      if (!countryPricing && regionInfo?.currency && regionInfo.currency !== 'USD') {
        const { LocationService } = await import('@/lib/payment/locationService');
        
        finalPrice.monthly = LocationService.convertPrice(dbPrice.monthly, 'USD', regionInfo.currency).convertedPrice;
        finalPrice.quarterly = LocationService.convertPrice(dbPrice.quarterly, 'USD', regionInfo.currency).convertedPrice;
        finalPrice.yearly = LocationService.convertPrice(dbPrice.yearly, 'USD', regionInfo.currency).convertedPrice;
        finalPrice.lifetime = LocationService.convertPrice(dbPrice.lifetime, 'USD', regionInfo.currency).convertedPrice;
        finalPrice.dayPass = LocationService.convertPrice(dbPrice.dayPass, 'USD', regionInfo.currency).convertedPrice;
        
        isConversionApplied = true;
      }

      const basePrice = {
        monthly: finalPrice.monthly,
        quarterly: finalPrice.quarterly,
        yearly: finalPrice.yearly,
        oneTime: plan.key === 'pro_lifetime' ? finalPrice.lifetime : finalPrice.dayPass
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
        // Country pricing info
        regionalPricing: (() => {
          const pricingSource = countryPricing || planDefaultCountryPricing || defaultCountryPricing;
          const displayPriceValue = plan.key === 'pro_lifetime' ? basePrice.oneTime : 
                                   plan.key === 'day_pass' ? basePrice.oneTime : 
                                   plan.key === 'pro_quarterly' ? basePrice.quarterly :
                                   plan.key === 'pro_yearly' ? basePrice.yearly :
                                   basePrice.monthly;

          return {
            region: pricingSource?.countryCode || regionInfo?.countryCode || 'US',
            regionName: pricingSource?.countryName || regionInfo?.countryName || 'United States',
            currency: planCurrency,
            currencySymbol: planCurrencySymbol,
            price: displayPriceValue,
            displayPrice: `${planCurrencySymbol}${displayPriceValue}`,
            polarPriceId: activePricing?.polarPriceIds?.[
              plan.key === 'pro_monthly' ? 'monthly' :
              plan.key === 'pro_quarterly' ? 'quarterly' :
              plan.key === 'pro_yearly' ? 'yearly' :
              plan.key === 'pro_lifetime' ? 'lifetime' : 'monthly'
            ],
            isApproximate: isConversionApplied
          };
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
