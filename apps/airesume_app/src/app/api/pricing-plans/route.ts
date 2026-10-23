export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import { getAdminPricingPlan } from '@/models/admin-models';
import { createErrorResponse } from '@/lib/api/error-handler';
import PolarService from '@/lib/payment/polar';
import { getCachedPricing, setCachedPricing } from '@/lib/services/pricingCache';

/**
 * GET /api/pricing-plans
 * 
 * SaaS best-practice: single USD source of truth.
 * Polar handles actual currency conversion at checkout.
 * The UI converts display prices client-side using the Intl API.
 * 
 * Returns active plans with their canonical USD prices + Polar product/price IDs.
 */

/** In-memory cache lives in @/lib/services/pricingCache (shared with admin API). */

/** Canonical USD prices — single source of truth. Matches Polar catalog. */
const PLAN_USD_PRICES: Record<string, number> = {
  starter_monthly:  0,     // Regular $4.99 (free for now)
  starter_yearly:   19.99, // $2/month ($19.99 total billed annually)
  focused_monthly:  9.99,  // $9.99/month
  focused_yearly:   79.99, // $7/month ($79.99 total billed annually)
};

const DEFAULT_PLANS = [
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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('includeInactive') === 'true';
    const publicOnly      = searchParams.get('public') === 'true';

    const cacheKey = `plans-${includeInactive}-${publicOnly}`;
    const cached = getCachedPricing<any>(cacheKey);
    if (cached) {
      return NextResponse.json(cached, {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
          'X-Cache': 'HIT',
        },
      });
    }

    let plans: any[] = [];

    try {
      await getConnection();
      const PricingPlanModel = await getAdminPricingPlan();

      const query: any = {};
      if (!includeInactive) query.status = 'active';
      if (publicOnly) {
        query.displayOnLanding = true;
        query.targetAudience   = 'all';
      }

      plans = await PricingPlanModel.find(query).sort({ sortOrder: 1 }).lean();

      if (!plans?.length) {
        console.warn('⚠️ No pricing plans found in database. Initializing default plans...');
        try {
          await PricingPlanModel.insertMany(DEFAULT_PLANS, { ordered: false });
          plans = await PricingPlanModel.find(query).sort({ sortOrder: 1 }).lean();
        } catch (seedErr) {
          plans = DEFAULT_PLANS as any;
        }
      }
    } catch (dbError) {
      console.warn('⚠️ Database connection or query failed for pricing plans. Using fallback default plans:', dbError);
      plans = DEFAULT_PLANS as any;
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
      // DB is the source of truth for price (admin-editable via /api/admin/plans).
      // The hardcoded map is only a fallback for seeds/fresh envs with no price set.
      const dbPrice =
        plan.key?.includes('quarterly') ? plan.price_quarterly
        : plan.key?.includes('yearly') ? plan.price_yearly
        : plan.key?.includes('monthly') ? plan.price_monthly
        : plan.price_one_time;
      const usdPrice =
        typeof dbPrice === 'number' ? dbPrice : (PLAN_USD_PRICES[plan.key] ?? 0);

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

      // DB features win when present (admin-editable). Fall back to the legacy
      // hardcoded lists only for plans that predate DB-backed feature lists.
      const dbFeatures = Array.isArray(plan.features) ? plan.features : [];
      let updatedFeatures: string[];
      if (dbFeatures.length > 0) {
        updatedFeatures = dbFeatures;
      } else if (plan.key === 'starter_monthly') {
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
        updatedFeatures = [];
      }

      return {
        ...plan,
        // DB flag wins; only default the badge for the known plan when unset.
        isPopular: typeof plan.isPopular === 'boolean' ? plan.isPopular : plan.key === 'focused_yearly',
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

    setCachedPricing(cacheKey, responseData);

    return NextResponse.json(responseData, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
    });
  } catch (error) {
    console.error('Error in pricing-plans API:', error);
    return createErrorResponse(error);
  }
}
