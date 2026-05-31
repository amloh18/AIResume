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

// In-memory cache for pricing plans
interface CacheEntry {
  data: any;
  timestamp: number;
  region?: string;
}

const pricingCache = new Map<string, CacheEntry>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache

// Updated Standard USD prices for the new plan structure
const STANDARD_USD_PRICES: Record<string, number> = {
  'starter_monthly': 0,
  'starter_yearly': 39.99,
  'focused_monthly': 9.99,
  'focused_yearly': 79.99,
  'smart_quarterly': 59.99,
  'smart_yearly': 199.00
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const currencyParam = searchParams.get('currency');
    const includeInactive = searchParams.get('includeInactive') === 'true';
    const publicOnly = searchParams.get('public') === 'true';

    // Create cache key based on query parameters
    const cacheKey = `pricing-${currencyParam || 'all'}-${includeInactive}-${publicOnly}`;
    const now = Date.now();

    // Check cache first
    const cached = pricingCache.get(cacheKey);
    if (cached && (now - cached.timestamp) < CACHE_TTL) {
      return NextResponse.json(cached.data, {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
          'X-Cache': 'HIT'
        }
      });
    }

    // Detect user region from IP
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined;
    let regionInfo;
    try {
      regionInfo = await detectUserRegion(ip);
    } catch (error) {
      console.warn('Region detection failed, using default:', error);
      regionInfo = { countryCode: 'US', currency: 'USD', currencySymbol: '$' };
    }

    await getConnection();
    const PricingPlanModel = await getAdminPricingPlan();
    
    if (!PricingPlanModel) {
      console.error('PricingPlan model could not be loaded in API route');
      throw new Error('Database model error');
    }

    let query: any = {};
    if (!includeInactive) query.status = 'active';
    if (publicOnly) {
      query.displayOnLanding = true;
      query.targetAudience = 'all';
    }

    console.log(`🔍 Pricing API - Query: ${JSON.stringify(query)}`);
    const plans = await PricingPlanModel.find(query).sort({ sortOrder: 1 }).lean();
    console.log(`🔍 Pricing API - Found ${plans?.length || 0} plans`);

    if (!plans || plans.length === 0) {
      console.error('❌ Pricing API - No pricing plans found matching query');
      throw new Error('No pricing plans found in database');
    }

    // Get country pricing for user's region
    const { getCountryPricing, getCountryPricingById } = await import('@/lib/services/countryPricingService');
    const countryPricing = regionInfo?.countryCode ? await getCountryPricing(regionInfo.countryCode) : null;
    
    let defaultCountryPricing = null;
    if (plans[0].defaultCountryPricingId) {
      defaultCountryPricing = await getCountryPricingById(plans[0].defaultCountryPricingId);
    }

    const currentDate = new Date();
    const { LocationService } = await import('@/lib/payment/locationService');

    const enhancedPlans = await Promise.all(plans.map(async (plan) => {
      // Fix common typos in keys for lookup
      const planKey = plan.key.replace('yealry', 'yearly').replace('quaterly', 'quarterly');
      
      // Check if promotion is active
      const isPromotionActive = (plan as any).promotionValidFrom && (plan as any).promotionValidUntil &&
        new Date((plan as any).promotionValidFrom) <= currentDate && new Date((plan as any).promotionValidUntil) >= currentDate;

      // Single source of truth for base USD price
      const baseUSDPriceValue = STANDARD_USD_PRICES[planKey] || plan.price_yearly || plan.price_monthly || plan.price_one_time || 0;
      const userCurrency = regionInfo?.currency || 'USD';
      const isUSD = userCurrency === 'USD';

      // Determine the base price to use (preferring promotional if active)
      let basePriceToUse = baseUSDPriceValue;
      if (isPromotionActive && (planKey === 'starter_yearly' || plan.key === 'starter_yealry')) {
        // If there's a promotional price in the DB, use it, otherwise apply a default 50% discount for starter yearly
        basePriceToUse = (plan as any).promotionalPrice_yearly || (baseUSDPriceValue / 2);
      } else if (isPromotionActive) {
        // For other plans, use their specific promotional prices if available
        basePriceToUse = (plan as any).promotionalPrice_yearly || (plan as any).promotionalPrice_monthly || (plan as any).promotionalPrice_one_time || baseUSDPriceValue;
      }

      // Calculate final price (converted or base)
      let finalPriceValue = basePriceToUse;
      let isConversionApplied = false;

      if (!isUSD && basePriceToUse > 0) {
        finalPriceValue = Math.round(LocationService.convertPrice(basePriceToUse, 'USD', userCurrency).convertedPrice);
        isConversionApplied = true;
      }

      const effectivePriceValue = finalPriceValue;

      // Metadata for duration
      let durationInfo = null;
      if (planKey.includes('monthly')) durationInfo = { durationInDays: 30, durationType: 'month', displayText: '1 month' };
      else if (planKey.includes('quarterly')) durationInfo = { durationInDays: 90, durationType: 'month', displayText: '3 months' };
      else if (planKey.includes('yearly')) durationInfo = { durationInDays: 365, durationType: 'year', displayText: '1 year' };
      else if (planKey.includes('lifetime')) durationInfo = { durationInDays: 9999, durationType: 'lifetime', displayText: 'Lifetime' };

      // Resolve currency and symbol
      const activePricing = countryPricing || defaultCountryPricing;
      const planCurrency = activePricing?.currency || userCurrency || 'USD';
      const planCurrencySymbol = activePricing?.currencySymbol || getCurrencySymbol(planCurrency);

      return {
        ...plan,
        currency: planCurrency,
        currencySymbol: planCurrencySymbol,
        price: effectivePriceValue,
        usdPrice: basePriceToUse, // Crucial for frontend checkout display - use the effective USD price
        baseUsdPrice: baseUSDPriceValue, // Original USD price before any discounts
        regionalPricing: {
          region: regionInfo?.countryCode || 'US',
          currency: planCurrency,
          currencySymbol: planCurrencySymbol,
          price: effectivePriceValue,
          displayPrice: planCurrency === 'USD' 
            ? `${planCurrencySymbol}${effectivePriceValue.toFixed(2)}` 
            : `${planCurrencySymbol}${effectivePriceValue}`,
          isApproximate: isConversionApplied
        },
        durationInfo,
        isPromotionActive,
        promotionDaysRemaining: isPromotionActive && (plan as any).promotionValidUntil ? Math.ceil((new Date((plan as any).promotionValidUntil).getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24)) : null
      };
    }));

    const responseData = {
      plans: enhancedPlans,
      region: {
        countryCode: regionInfo.countryCode,
        currency: regionInfo.currency,
        currencySymbol: regionInfo.currencySymbol
      }
    };

    pricingCache.set(cacheKey, { data: responseData, timestamp: now });

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Error in pricing-plans API:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
