import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/database';
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
      await connectDB();
      const PricingPlan = await getAdminPricingPlan();
      const dbPlans = await PricingPlan.find(query)
        .sort({ sortOrder: 1, price: 1 })
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

    // Add promotional pricing and computed fields
    const now = new Date();
    const enhancedPlans = plans.map(plan => {
      // Check if promotion is active
      const isPromotionActive = plan.promotionValidFrom && plan.promotionValidUntil &&
        new Date(plan.promotionValidFrom) <= now && new Date(plan.promotionValidUntil) >= now;

      // Calculate effective prices
      const effectivePrice = {
        monthly: isPromotionActive && plan.promotionalPrice_monthly 
          ? plan.promotionalPrice_monthly 
          : plan.price_monthly,
        quarterly: isPromotionActive && plan.promotionalPrice_quarterly 
          ? plan.promotionalPrice_quarterly 
          : plan.price_quarterly,
        yearly: isPromotionActive && plan.promotionalPrice_yearly 
          ? plan.promotionalPrice_yearly 
          : plan.price_yearly,
        oneTime: isPromotionActive && plan.promotionalPrice_one_time 
          ? plan.promotionalPrice_one_time 
          : plan.price_one_time
      };

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
        // Add promotional fields
        isPromotionActive,
        effectivePrice,
        // Add days remaining for promotion
        promotionDaysRemaining: isPromotionActive && plan.promotionValidUntil 
          ? Math.ceil((new Date(plan.promotionValidUntil).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
          : null
      };
    });

    return NextResponse.json(enhancedPlans);
  } catch (error) {
    console.error('Error fetching pricing plans:', error);
    // Return fallback plans even on error
    return NextResponse.json(fallbackPlans);
  }
}
