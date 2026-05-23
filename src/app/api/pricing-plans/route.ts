// @ts-nocheck
export const dynamic = 'force-dynamic';
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
    _id: 'starter_monthly',
    key: 'starter_monthly',
    name: 'Starter Monthly',
    description: 'Basic CV creation for job applications',
    price_monthly: 0,
    price_one_time: 0,
    currency: 'USD',
    features: [
      'Access to ALL templates and snippets',
      'Basic AI Writing (Grammar & rephrasing)',
      'Limited Free AI Credits'
    ],
    notIncludedFeatures: [
      'Unlimited CV & Cover Letter Edits',
      'Real-time ATS Scoring & Editor',
      'AI Cover Letter Generator',
      'LinkedIn Enhancer',
      'Interview Coach Simulator',
      'Application Tracker'
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
    billingCycle: 'monthly',
    category: 'essential'
  },
  {
    _id: 'starter_yealry',
    key: 'starter_yealry',
    name: 'Starter Yearly',
    description: 'Unlimited CV & Cover letter editing with live ATS checks',
    price_monthly: 0,
    price_yearly: 39.99,
    promotionalPrice_yearly: 19.99,
    promotionValidFrom: new Date('2026-01-01'),
    promotionValidUntil: new Date('2036-12-31'),
    promotionDescription: 'Limited time offer - 50% Off!',
    price_one_time: 0,
    currency: 'USD',
    features: [
      'Access to ALL templates and snippets',
      'Unlimited CV & Cover Letter Edits',
      'Real-time ATS Scoring & Editor',
      'AI Cover Letter Generator',
      'PDF & DOCX Downloads'
    ],
    notIncludedFeatures: [
      'LinkedIn Enhancer',
      'Interview Coach Simulator',
      'Application Tracker',
      'Auto Job Application Bot'
    ],
    isPopular: false,
    isBestValue: false,
    displayOnLanding: true,
    targetAudience: 'all',
    maxCVs: -1,
    maxExports: -1,
    maxCoverLetters: -1,
    maxJobs: 0,
    maxJourneys: -1,
    billingCycle: 'yearly',
    category: 'essential'
  },
  // Focused Pack
  {
    _id: 'focused_monthly',
    key: 'focused_monthly',
    name: 'Focused Monthly',
    description: 'Complete career toolkit with job tracking and AI interview prep',
    price_monthly: 9.99,
    price_one_time: 0,
    currency: 'USD',
    features: [
      'Unlimited CV & Cover Letter Edits',
      'Real-time ATS Scoring & Editor',
      'AI Cover Letter Generator',
      'LinkedIn Enhancer',
      'AI Interview Coach Mock Simulator',
      'Application Tracker (Full Kanban access)',
      'Access to ALL templates and snippets'
    ],
    notIncludedFeatures: [
      'Auto Job Application Bot'
    ],
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
    _id: 'focused_yearly',
    key: 'focused_yearly',
    name: 'Focused Yearly',
    description: 'Full career package with significant yearly savings',
    price_yearly: 79.99,
    price_one_time: 0,
    currency: 'USD',
    features: [
      'Unlimited CV & Cover Letter Edits',
      'Real-time ATS Scoring & Editor',
      'AI Cover Letter Generator',
      'LinkedIn Enhancer',
      'AI Interview Coach Mock Simulator',
      'Application Tracker (Full Kanban access)',
      'Access to ALL templates and snippets',
      'Priority Customer Support'
    ],
    notIncludedFeatures: [
      'Auto Job Application Bot'
    ],
    isPopular: true,
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
  // Smart Pack
  {
    _id: 'smart_quaterly',
    key: 'smart_quaterly',
    name: 'Smart Quarterly',
    description: 'All Focused features plus Auto Job Application Bot',
    price_quarterly: 59.99,
    price_one_time: 0,
    currency: 'USD',
    features: [
      'Auto Job Application Bot',
      'Unlimited CV & Cover Letter Edits',
      'Real-time ATS Scoring & Editor',
      'AI Cover Letter Generator',
      'LinkedIn Enhancer',
      'AI Interview Coach Mock Simulator',
      'Application Tracker (Full Kanban access)',
      'VIP 24/7 Support'
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
    billingCycle: 'quarterly',
    category: 'professional'
  },
  {
    _id: 'smart_yearly',
    key: 'smart_yearly',
    name: 'Smart Yearly',
    description: 'The ultimate automated career package for absolute success',
    price_yearly: 199.00,
    price_one_time: 0,
    currency: 'USD',
    features: [
      'Auto Job Application Bot',
      'Unlimited CV & Cover Letter Edits',
      'Real-time ATS Scoring & Editor',
      'AI Cover Letter Generator',
      'LinkedIn Enhancer',
      'AI Interview Coach Mock Simulator',
      'Application Tracker (Full Kanban access)',
      'VIP 24/7 Support'
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
    billingCycle: 'yearly',
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
        'pro_monthly': 12.99,
        'pro_quarterly': 34.99,
        'pro_yearly': 99.00,
        'pro_lifetime': 199.00,
        'day_pass': 9.00,
        'starter_monthly': 0,
        'starter_yealry': 39.99,
        'focused_monthly': 9.99,
        'focused_yearly': 79.99,
        'smart_quaterly': 59.99,
        'smart_yearly': 199.00
      };

      // Polar USD plans are the single source of truth for the whole app
      const baseUSDPrice = {
        monthly: plan.price_monthly !== undefined && plan.price_monthly !== null ? plan.price_monthly : (plan.key === 'pro_monthly' ? 12.99 : plan.key === 'focused_monthly' ? 9.99 : 0),
        quarterly: plan.price_quarterly !== undefined && plan.price_quarterly !== null ? plan.price_quarterly : (plan.key === 'pro_quarterly' ? 34.99 : plan.key === 'smart_quaterly' ? 59.99 : 0),
        yearly: plan.price_yearly !== undefined && plan.price_yearly !== null ? plan.price_yearly : (plan.key === 'pro_yearly' ? 99.00 : plan.key === 'starter_yealry' ? 39.99 : plan.key === 'focused_yearly' ? 79.99 : plan.key === 'smart_yearly' ? 199.00 : 0),
        lifetime: plan.price_one_time !== undefined && plan.price_one_time !== null ? plan.price_one_time : (plan.key === 'pro_lifetime' ? 199.00 : 0),
        dayPass: plan.key === 'day_pass' ? (plan.price_one_time || 9.00) : 0
      };

      const userCurrency = regionInfo?.currency || 'USD';
      const isUSD = userCurrency === 'USD';

      let finalPrice = {
        monthly: baseUSDPrice.monthly,
        quarterly: baseUSDPrice.quarterly,
        yearly: baseUSDPrice.yearly,
        lifetime: baseUSDPrice.lifetime,
        dayPass: baseUSDPrice.dayPass
      };

      let isConversionApplied = false;

      if (!isUSD) {
        const { LocationService } = await import('@/lib/payment/locationService');
        
        // Convert to local currency and round off to nearest whole integer
        if (baseUSDPrice.monthly > 0) finalPrice.monthly = Math.round(LocationService.convertPrice(baseUSDPrice.monthly, 'USD', userCurrency).convertedPrice);
        if (baseUSDPrice.quarterly > 0) finalPrice.quarterly = Math.round(LocationService.convertPrice(baseUSDPrice.quarterly, 'USD', userCurrency).convertedPrice);
        if (baseUSDPrice.yearly > 0) finalPrice.yearly = Math.round(LocationService.convertPrice(baseUSDPrice.yearly, 'USD', userCurrency).convertedPrice);
        if (baseUSDPrice.lifetime > 0) finalPrice.lifetime = Math.round(LocationService.convertPrice(baseUSDPrice.lifetime, 'USD', userCurrency).convertedPrice);
        if (baseUSDPrice.dayPass > 0) finalPrice.dayPass = Math.round(LocationService.convertPrice(baseUSDPrice.dayPass, 'USD', userCurrency).convertedPrice);
        
        isConversionApplied = true;
      }

      const basePrice = {
        monthly: finalPrice.monthly,
        quarterly: finalPrice.quarterly,
        yearly: finalPrice.yearly,
        oneTime: plan.key === 'pro_lifetime' ? finalPrice.lifetime : finalPrice.dayPass
      };

      const effectivePrice = {
        monthly: isPromotionActive && (plan as any).promotionalPrice_monthly !== undefined
          ? (plan as any).promotionalPrice_monthly
          : basePrice.monthly,
        quarterly: isPromotionActive && (plan as any).promotionalPrice_quarterly !== undefined
          ? (plan as any).promotionalPrice_quarterly
          : basePrice.quarterly,
        yearly: isPromotionActive && (plan as any).promotionalPrice_yearly !== undefined
          ? (plan as any).promotionalPrice_yearly
          : basePrice.yearly,
        oneTime: isPromotionActive && (plan as any).promotionalPrice_one_time !== undefined
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
      } else if (plan.key.includes('monthly')) {
        durationInfo = {
          durationInDays: 30,
          durationType: 'month',
          displayText: '1 month'
        };
      } else if (plan.key.includes('quarterly') || plan.key.includes('quaterly')) {
        durationInfo = {
          durationInDays: 90,
          durationType: 'month',
          displayText: '3 months'
        };
      } else if (plan.key.includes('yearly') || plan.key.includes('yealry')) {
        durationInfo = {
          durationInDays: 365,
          durationType: 'year',
          displayText: '1 year'
        };
      } else if (plan.key.includes('lifetime')) {
        durationInfo = {
          durationInDays: -1,
          durationType: 'year',
          displayText: 'Lifetime'
        };
      }

      // Get currency from CountryPricing (primary source) - no legacy fallbacks
      const planCurrency = activePricing?.currency
        || defaultCountryPricing?.currency
        || regionInfo?.currency
        || 'USD'; // Default to USD (matches Polar plans)

      const planCurrencySymbol = activePricing?.currencySymbol
        || defaultCountryPricing?.currencySymbol
        || getCurrencySymbol(planCurrency);

      // Find user regional pricing in database plan
      const userRegion = regionInfo?.countryCode || 'US';
      const planRegionalPricingObj = plan.regionalPricing?.find((rp: any) => 
        rp.region?.toUpperCase() === userRegion.toUpperCase()
      );

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
        price: basePrice.yearly || basePrice.monthly || basePrice.quarterly || basePrice.oneTime || 0,
        billingCycle: plan.billingCycle,
        // Country pricing info
        regionalPricing: (() => {
          const pricingSource = countryPricing || defaultCountryPricing;
          const displayPriceValue = plan.key.includes('lifetime') ? basePrice.oneTime : 
                                   plan.key === 'day_pass' ? basePrice.oneTime : 
                                   plan.key.includes('quarterly') || plan.key.includes('quaterly') ? basePrice.quarterly :
                                   plan.key.includes('yearly') || plan.key.includes('yealry') ? basePrice.yearly :
                                   basePrice.monthly;

          return {
            region: pricingSource?.countryCode || regionInfo?.countryCode || 'US',
            regionName: pricingSource?.countryName || regionInfo?.countryName || 'United States',
            currency: planCurrency,
            currencySymbol: planCurrencySymbol,
            price: displayPriceValue,
            displayPrice: planCurrency === 'USD' 
              ? `${planCurrencySymbol}${displayPriceValue.toFixed(2)}` 
              : `${planCurrencySymbol}${displayPriceValue}`,
            polarPriceId: planRegionalPricingObj?.polarPriceId || activePricing?.polarPriceIds?.[
              plan.key.includes('monthly') ? 'monthly' :
              plan.key.includes('quarterly') || plan.key.includes('quaterly') ? 'quarterly' :
              plan.key.includes('yearly') || plan.key.includes('yealry') ? 'yearly' :
              plan.key.includes('lifetime') ? 'lifetime' : 'monthly'
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
