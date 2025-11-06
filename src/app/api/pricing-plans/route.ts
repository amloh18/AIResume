import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import { PricingPlan } from '@/models';
import { detectUserRegion, getPricingForRegion } from '@/lib/services/regionDetectionService';
import { getAdminPricingPlan } from '@/models/admin-models';

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

    // Detect user region from IP
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined;
    let regionInfo;
    try {
      regionInfo = await detectUserRegion(ip);
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
    const now = new Date();
    const enhancedPlans = plans.map(plan => {
      // Get regional pricing for this plan
      const regionalPricing = getPricingForRegion(plan, regionInfo.countryCode);
      
      // Check if promotion is active
      const isPromotionActive = (plan as any).promotionValidFrom && (plan as any).promotionValidUntil &&
        new Date((plan as any).promotionValidFrom) <= now && new Date((plan as any).promotionValidUntil) >= now;

      // Calculate effective prices (use regional if available, otherwise use plan defaults)
      const basePrice = {
        monthly: regionalPricing?.price || plan.price_monthly,
        quarterly: regionalPricing?.price || plan.price_quarterly,
        yearly: regionalPricing?.price || plan.price_yearly,
        oneTime: regionalPricing?.price || plan.price_one_time
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
        // Regional pricing info
        regionalPricing: {
          ...regionalPricing,
          region: regionInfo.countryCode,
          regionName: regionInfo.countryName,
          currency: regionalPricing?.currency || regionInfo.currency,
          currencySymbol: regionInfo.currencySymbol
        },
        // Time-based metadata
        durationInfo,
        // Add promotional fields
        isPromotionActive,
        effectivePrice,
        // Add days remaining for promotion
        promotionDaysRemaining: isPromotionActive && (plan as any).promotionValidUntil
          ? Math.ceil((new Date((plan as any).promotionValidUntil).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
          : null
      };
    });

    return NextResponse.json({
      plans: enhancedPlans,
      region: {
        countryCode: regionInfo.countryCode,
        countryName: regionInfo.countryName,
        currency: regionInfo.currency,
        currencySymbol: regionInfo.currencySymbol,
        paymentPartner: regionInfo.paymentPartner
      }
    });
  } catch (error) {
    console.error('Error fetching pricing plans:', error);
    // Return fallback plans even on error
    return NextResponse.json(fallbackPlans);
  }
}
