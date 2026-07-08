export const revalidate = 3600;
import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import { getAdminPricingPlan } from '@/models/admin-models';
import { createErrorResponse } from '@/lib/api/error-handler';
import PolarService from '@/lib/payment/polar';

/**
 * GET /api/pricing-plans
 * 
 * SaaS best-practice: single USD source of truth.
 * Polar handles actual currency conversion at checkout.
 * The UI converts display prices client-side using the Intl API.
 * 
 * Returns active plans with their canonical USD prices + Polar product/price IDs.
 */

// In-memory cache
const pricingCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 min

/** Canonical USD prices — single source of truth. Matches Polar catalog. */
export const PLAN_USD_PRICES: Record<string, number> = {
  starter_monthly:  0,
  starter_yearly:   19.99,
  focused_monthly:  9.99,
  focused_yearly:   79.99,
  smart_quarterly:  59.99,
  smart_yearly:     199.00,
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('includeInactive') === 'true';
    const publicOnly      = searchParams.get('public') === 'true';

    const cacheKey = `plans-${includeInactive}-${publicOnly}`;
    const now = Date.now();
    const cached = pricingCache.get(cacheKey);
    if (cached && now - cached.timestamp < CACHE_TTL) {
      return NextResponse.json(cached.data, {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
          'X-Cache': 'HIT',
        },
      });
    }

    await getConnection();
    const PricingPlanModel = await getAdminPricingPlan();

    const query: any = {};
    if (!includeInactive) query.status = 'active';
    if (publicOnly) {
      query.displayOnLanding = true;
      query.targetAudience   = 'all';
    }

    const plans = await PricingPlanModel.find(query).sort({ sortOrder: 1 }).lean();

    if (!plans?.length) {
      throw new Error('No pricing plans found in database');
    }

    // Dynamic Sync from Polar Dashboard Products catalog
    try {
      const polarRes = await PolarService.listProducts();
      if (polarRes.success && polarRes.products) {
        const productsPayload = polarRes.products as any;
        const polarProducts = Array.isArray(productsPayload)
          ? productsPayload
          : Array.isArray(productsPayload?.items)
            ? productsPayload.items
            : [];
        for (const plan of plans) {
          const matchedProduct = polarProducts.find((p: any) => 
            p.metadata?.planKey === plan.key || 
            p.name?.toLowerCase().includes(plan.name?.toLowerCase()) ||
            p.name?.toLowerCase().replace(/\s+/g, '_') === plan.key
          );
          if (matchedProduct) {
            plan.polarProductId = matchedProduct.id;
            if (matchedProduct.prices && matchedProduct.prices.length > 0) {
              const priceObj = matchedProduct.prices[0];
              plan.polarPriceId = priceObj.id;
              if (priceObj.price_amount !== undefined) {
                const amountVal = priceObj.price_amount / 100;
                PLAN_USD_PRICES[plan.key] = amountVal;
              }
            }
          }
        }
      }
    } catch (polarSyncError) {
      console.error('Failed to sync pricing plans from Polar Dashboard API:', polarSyncError);
    }

    const currentDate = new Date();

    const enhancedPlans = plans.map((plan: any) => {
      const usdPrice = PLAN_USD_PRICES[plan.key] ?? 0;

      // Promotion check
      const isPromotionActive =
        plan.promotionValidFrom &&
        plan.promotionValidUntil &&
        new Date(plan.promotionValidFrom) <= currentDate &&
        new Date(plan.promotionValidUntil) >= currentDate;

      const effectiveUsdPrice = isPromotionActive
        ? (plan.promotionalPrice_yearly ??
           plan.promotionalPrice_monthly ??
           plan.promotionalPrice_one_time ??
           usdPrice)
        : usdPrice;

      // Duration metadata derived from plan key/billing cycle
      let durationInfo = null;
      if (plan.key?.includes('monthly'))  durationInfo = { durationInDays: 30,   durationType: 'month',    displayText: '1 month' };
      else if (plan.key?.includes('quarterly')) durationInfo = { durationInDays: 90, durationType: 'quarter', displayText: '3 months' };
      else if (plan.key?.includes('yearly'))   durationInfo = { durationInDays: 365, durationType: 'year',   displayText: '1 year' };

      // Dynamically add/remove "Mori AI chat" as feature for all plans except focused_monthly
      const currentFeatures = Array.isArray(plan.features) ? [...plan.features] : [];
      let updatedFeatures = currentFeatures;
      if (plan.key !== 'focused_monthly') {
        if (!currentFeatures.some((f: string) => f.toLowerCase().includes('mori'))) {
          updatedFeatures.push('Mori AI chat');
        }
      } else {
        updatedFeatures = currentFeatures.filter((f: string) => !f.toLowerCase().includes('mori'));
      }

      return {
        ...plan,
        features: updatedFeatures,
        // Canonical USD price — use this for checkout amount validation
        usdPrice: effectiveUsdPrice,
        baseUsdPrice: usdPrice,
        // Keep price field for backward compat
        price: effectiveUsdPrice,
        currency: 'USD',
        currencySymbol: '$',
        // Polar product/price IDs for checkout
        polarProductId: plan.key?.includes('monthly')   ? plan.polarProductId_monthly
                      : plan.key?.includes('quarterly')  ? plan.polarProductId_quarterly
                      : plan.key?.includes('yearly')     ? plan.polarProductId_yearly
                      : null,
        polarPriceId: plan.key?.includes('monthly')    ? plan.polarPriceId_monthly
                    : plan.key?.includes('quarterly')   ? plan.polarPriceId_quarterly
                    : plan.key?.includes('yearly')      ? plan.polarPriceId_yearly
                    : null,
        durationInfo,
        isPromotionActive,
        promotionDaysRemaining: isPromotionActive && plan.promotionValidUntil
          ? Math.ceil((new Date(plan.promotionValidUntil).getTime() - currentDate.getTime()) / 86400000)
          : null,
      };
    });

    const responseData = { plans: enhancedPlans };

    pricingCache.set(cacheKey, { data: responseData, timestamp: now });

    return NextResponse.json(responseData, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
    });
  } catch (error) {
    console.error('Error in pricing-plans API:', error);
    return createErrorResponse(error);
  }
}
