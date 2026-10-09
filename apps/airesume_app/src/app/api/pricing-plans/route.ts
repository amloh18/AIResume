export const dynamic = 'force-dynamic';
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
const PLAN_USD_PRICES: Record<string, number> = {
  starter_monthly:  0,     // Regular $4.99 (free for now)
  starter_yearly:   19.99, // $2/month ($19.99 total billed annually)
  focused_monthly:  9.99,  // $9.99/month
  focused_yearly:   79.99, // $7/month ($79.99 total billed annually)
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

    let plans = await PricingPlanModel.find(query).sort({ sortOrder: 1 }).lean();

    if (!plans?.length) {
      console.warn('⚠️ No pricing plans found in database. Initializing default plans...');
      const defaultPlans = [
        {
          key: 'starter_monthly',
          name: 'Starter Monthly',
          description: 'Essential tools for resume creation and editing',
          billingCycle: 'monthly',
          price_monthly: 0,
          price: 0,
          sortOrder: 1,
          status: 'active',
          displayOnLanding: true,
          targetAudience: 'all',
          storageLimit: 100,
          features: [
            'Access to ALL templates and snippets',
            'Unlimited CV & Cover Letter Edits',
            'Real-time ATS Scoring & Editor',
            'AI Cover Letter Generator',
            'PDF & DOCX Downloads',
            'Mori AI chat',
            '10 Auto Job Applications (includes CV generation & Journeys)',
          ],
          credits: { jobCredits: 10, resetSchedule: 'monthly' },
          isPopular: false,
          isBestValue: false,
        },
        {
          key: 'starter_yearly',
          name: 'Starter Yearly',
          description: 'Annual plan for ongoing resume improvements',
          billingCycle: 'yearly',
          price_yearly: 19.99,
          price: 19.99,
          sortOrder: 2,
          status: 'active',
          displayOnLanding: true,
          targetAudience: 'all',
          storageLimit: 250,
          features: [
            'Access to ALL templates and snippets',
            'Unlimited CV & Cover Letter Edits',
            'Real-time ATS Scoring & Editor',
            'AI Cover Letter Generator',
            'PDF & DOCX Downloads',
            'Mori AI chat',
          ],
          credits: { jobCredits: 50, resetSchedule: 'yearly' },
          isPopular: false,
          isBestValue: false,
        },
        {
          key: 'focused_monthly',
          name: 'Focused Monthly',
          description: 'Complete suite for active job hunters and interview prep',
          billingCycle: 'monthly',
          price_monthly: 9.99,
          price: 9.99,
          sortOrder: 3,
          status: 'active',
          displayOnLanding: true,
          targetAudience: 'all',
          storageLimit: 500,
          features: [
            'Unlimited CV & Cover Letter Edits',
            'Real-time ATS Scoring & Editor',
            'AI Cover Letter Generator',
            'LinkedIn Enhancer',
            'AI Interview Coach Mock Simulator',
            'Application Tracker (Full Kanban access)',
            'All features unlimited',
          ],
          credits: { jobCredits: -1, resetSchedule: 'monthly' },
          isPopular: false,
          isBestValue: false,
        },
        {
          key: 'focused_yearly',
          name: 'Focused Yearly',
          description: 'Ultimate package with priority features for high-growth careers',
          billingCycle: 'yearly',
          price_yearly: 79.99,
          price: 79.99,
          sortOrder: 4,
          status: 'active',
          displayOnLanding: true,
          targetAudience: 'all',
          storageLimit: 1000,
          features: [
            'Unlimited CV & Cover Letter Edits',
            'Real-time ATS Scoring & Editor',
            'AI Cover Letter Generator',
            'LinkedIn Enhancer',
            'AI Interview Coach Mock Simulator',
            'Application Tracker (Full Kanban access)',
            'All features unlimited',
          ],
          credits: { jobCredits: -1, resetSchedule: 'yearly' },
          isPopular: true,
          isBestValue: true,
        },
      ];

      try {
        await PricingPlanModel.insertMany(defaultPlans, { ordered: false });
        plans = await PricingPlanModel.find(query).sort({ sortOrder: 1 }).lean();
      } catch (seedErr) {
        plans = defaultPlans as any;
      }
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

    // Filter out smart plans completely
    const filteredDbPlans = plans.filter((plan: any) => !plan.key?.includes('smart'));

    const enhancedPlans = filteredDbPlans.map((plan: any) => {
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
      else if (plan.key?.includes('yearly'))   durationInfo = { durationInDays: 365, durationType: 'year',   displayText: '1 year' };

      // Set canonical features for each of the 4 plans
      let updatedFeatures: string[] = [];
      if (plan.key === 'starter_monthly') {
        updatedFeatures = [
          'Access to ALL templates and snippets',
          'Unlimited CV & Cover Letter Edits',
          'Real-time ATS Scoring & Editor',
          'AI Cover Letter Generator',
          'PDF & DOCX Downloads',
          'Mori AI chat',
          '10 Auto Job Applications (includes CV generation & Journeys)'
        ];
      } else if (plan.key === 'starter_yearly') {
        updatedFeatures = [
          'Access to ALL templates and snippets',
          'Unlimited CV & Cover Letter Edits',
          'Real-time ATS Scoring & Editor',
          'AI Cover Letter Generator',
          'PDF & DOCX Downloads',
          'Mori AI chat'
        ];
      } else if (plan.key === 'focused_monthly' || plan.key === 'focused_yearly') {
        updatedFeatures = [
          'Unlimited CV & Cover Letter Edits',
          'Real-time ATS Scoring & Editor',
          'AI Cover Letter Generator',
          'LinkedIn Enhancer',
          'AI Interview Coach Mock Simulator',
          'Application Tracker (Full Kanban access)',
          'All features unlimited'
        ];
      } else {
        updatedFeatures = Array.isArray(plan.features) ? [...plan.features] : [];
      }

      return {
        ...plan,
        isPopular: plan.key === 'focused_yearly',
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
