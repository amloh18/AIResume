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
    description: 'Perfect for getting started with basic CV creation',
    price_monthly: 0,
    price_one_time: 0,
    currency: 'GBP',
    features: [
      '3 CVs',
      'Basic templates',
      'PDF export',
      'Email support'
    ],
    notIncludedFeatures: [
      'Cover letters',
      'Job tracking',
      'ATS optimization',
      'Priority support'
    ],
    isPopular: false,
    isBestValue: false,
    displayOnLanding: true,
    targetAudience: 'all',
    maxCVs: 3,
    maxExports: 3,
    maxCoverLetters: 0,
    maxJobs: 0,
    maxJourneys: 0,
    billingCycle: 'free',
    category: 'essential'
  },
  {
    _id: 'day_pass',
    key: 'day_pass',
    name: 'Day Pass',
    description: 'One-day access to all premium features',
    price_monthly: 0,
    price_one_time: 5,
    currency: 'GBP',
    features: [
      'Unlimited CVs for 24 hours',
      'All premium templates',
      'Cover letter generator',
      'Job tracking',
      'ATS optimization'
    ],
    notIncludedFeatures: [
      'Priority support',
      'Advanced analytics'
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
    billingCycle: 'one-time',
    category: 'essential'
  },
  // Professional Category
  {
    _id: 'pro_monthly',
    key: 'pro_monthly',
    name: 'Professional Monthly',
    description: 'Full access to all features with monthly billing',
    price_monthly: 19,
    price_quarterly: 0,
    price_yearly: 0,
    price_one_time: 0,
    currency: 'GBP',
    features: [
      'Unlimited CVs',
      'All premium templates',
      'Cover letter generator',
      'Job tracking & management',
      'ATS optimization',
      'Priority support',
      'Advanced analytics'
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
    billingCycle: 'monthly',
    category: 'professional'
  },
  {
    _id: 'pro_quarterly',
    key: 'pro_quarterly',
    name: 'Professional Quarterly',
    description: 'Full access to all features with quarterly billing',
    price_monthly: 0,
    price_quarterly: 49,
    price_yearly: 0,
    price_one_time: 0,
    currency: 'GBP',
    features: [
      'Unlimited CVs',
      'All premium templates',
      'Cover letter generator',
      'Job tracking & management',
      'ATS optimization',
      'Priority support',
      'Advanced analytics'
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
    _id: 'pro_yearly',
    key: 'pro_yearly',
    name: 'Professional Yearly',
    description: 'Full access to all features with yearly billing',
    price_monthly: 0,
    price_quarterly: 0,
    price_yearly: 179,
    price_one_time: 0,
    currency: 'GBP',
    features: [
      'Unlimited CVs',
      'All premium templates',
      'Cover letter generator',
      'Job tracking & management',
      'ATS optimization',
      'Priority support',
      'Advanced analytics'
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

    // Add promotional pricing, regional pricing, and computed fields
    const currentDate = new Date();
    const enhancedPlans = plans.map(plan => {
      
      // Check if promotion is active
      const isPromotionActive = (plan as any).promotionValidFrom && (plan as any).promotionValidUntil &&
        new Date((plan as any).promotionValidFrom) <= currentDate && new Date((plan as any).promotionValidUntil) >= currentDate;

      // Get regional pricing from plan's regionalPricing array
      const planRegionalPricing = (plan as any).regionalPricing || [];
      
      // Find regional pricing entries for the user's region
      const userRegionPricings = planRegionalPricing.filter((rp: any) => 
        rp.region === regionInfo?.countryCode
      );

      // Helper to get regional price for a specific billing cycle
      const getRegionalPriceForCycle = (cycle: 'monthly' | 'quarterly' | 'yearly' | 'oneTime') => {
        // Map our cycle names to the billing cycle enum
        const cycleMap: Record<string, string> = {
          'monthly': 'monthly',
          'quarterly': 'quarterly',
          'yearly': 'yearly',
          'oneTime': 'one-time'
        };
        const mappedCycle = cycleMap[cycle];
        
        // First try to find a specific entry for this cycle
        const cycleSpecific = userRegionPricings.find((rp: any) => 
          rp.billingCycle === mappedCycle
        );
        if (cycleSpecific) return cycleSpecific.price;
        
        // If no cycle-specific entry, look for one without billingCycle (applies to all)
        const general = userRegionPricings.find((rp: any) => !rp.billingCycle);
        if (general) return general.price;
        
        return null;
      };

      const basePrice = {
        monthly: getRegionalPriceForCycle('monthly') || plan.price_monthly,
        quarterly: getRegionalPriceForCycle('quarterly') || plan.price_quarterly,
        yearly: getRegionalPriceForCycle('yearly') || plan.price_yearly,
        oneTime: getRegionalPriceForCycle('oneTime') || plan.price_one_time
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
      }

      return {
        ...plan,
        maxCVs: plan.maxCVs === -1 ? 'Unlimited' : plan.maxCVs,
        maxExports: plan.maxExports === -1 ? 'Unlimited' : plan.maxExports,
        maxCoverLetters: plan.maxCoverLetters === -1 ? 'Unlimited' : plan.maxCoverLetters,
        maxJobs: plan.maxJobs === -1 ? 'Unlimited' : plan.maxJobs,
        maxJourneys: plan.maxJourneys === -1 ? 'Unlimited' : plan.maxJourneys,
        // Add computed fields for backward compatibility
        price: plan.price_monthly || plan.price_one_time || 0,
        billingCycle: plan.billingCycle,
        // Regional pricing info - use monthly pricing for display
        regionalPricing: (() => {
          const monthlyRegional = userRegionPricings.find((rp: any) => rp.billingCycle === 'monthly' || !rp.billingCycle) || userRegionPricings[0];
          return monthlyRegional ? {
            region: monthlyRegional.region,
            regionName: regionInfo.countryName,
            currency: monthlyRegional.currency,
            currencySymbol: getCurrencySymbol(monthlyRegional.currency),
            price: monthlyRegional.price,
            displayPrice: monthlyRegional.displayPrice || `${getCurrencySymbol(monthlyRegional.currency)}${monthlyRegional.price}`,
            stripePriceId: monthlyRegional.stripePriceId,
            razorpayPlanId: monthlyRegional.razorpayPlanId
          } : {
            region: regionInfo.countryCode,
            regionName: regionInfo.countryName,
            currency: plan.currency || regionInfo.currency,
            currencySymbol: getCurrencySymbol(plan.currency || regionInfo.currency),
            price: plan.price_monthly || 0,
            displayPrice: `${getCurrencySymbol(plan.currency || regionInfo.currency)}${plan.price_monthly || 0}`
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
    });

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
