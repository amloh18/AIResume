// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getConnection } from '@/lib/database';
import { getAdminPricingPlan } from '@/models/admin-models';
import User from '@/models/User';
import { getPolar, PolarService } from '@/lib/payment/polar';
import { detectUserRegion } from '@/lib/services/regionDetectionService';
import { getPricingForPlan } from '@/lib/services/countryPricingService';
import subscriptionService from '@/lib/services/subscriptionService';
import Coupon from '@/models/Coupon';
import DiscountCode from '@/models/DiscountCode';

// Helper to get country pricing for a plan using CountryPricing collection
// Returns full CountryPricing data including polarPriceIds
async function getCountryPricingForPlan(
  countryCode: string,
  planKey: 'free' | 'pro_monthly' | 'pro_quarterly' | 'pro_yearly' | 'pro_lifetime',
  billingCycle?: 'monthly' | 'quarterly' | 'yearly' | 'one-time'
): Promise<{
  price: number;
  currency: string;
  currencySymbol: string;
  planId: string;
  polarPriceIds?: { monthly?: string; quarterly?: string; yearly?: string; lifetime?: string };
} | null> {
  try {
    // Map billingCycle to planKey if not provided
    let finalPlanKey = planKey;
    if (!finalPlanKey && billingCycle) {
      const cycleToPlanKey: Record<string, string> = {
        'monthly': 'pro_monthly',
        'quarterly': 'pro_quarterly',
        'yearly': 'pro_yearly',
        'one-time': 'pro_lifetime'
      };
      finalPlanKey = (cycleToPlanKey[billingCycle] || 'pro_monthly') as any;
    }

    // Get full CountryPricing data
    const { getCountryPricing } = await import('@/lib/services/countryPricingService');
    let countryPricing = await getCountryPricing(countryCode);

    // For non-India countries, if pricing not found, fallback to GB (Polar-compatible)
    if (!countryPricing && countryCode !== 'IN') {
      console.log('No country pricing found for non-India country, falling back to GB (Polar-compatible):', {
        countryCode,
        planKey: finalPlanKey,
        fallbackTo: 'GB'
      });
      countryPricing = await getCountryPricing('GB');
    }

    // If still no pricing found, fallback to US pricing (USD/Polar)
    if (!countryPricing) {
      console.log('No GB pricing found, trying US as final fallback:', {
        countryCode,
        planKey: finalPlanKey,
        fallbackTo: 'US'
      });
      countryPricing = await getCountryPricing('US');

      if (!countryPricing) {
        console.error('No country pricing found (including GB and US fallbacks):', {
          countryCode,
          planKey: finalPlanKey
        });
        return null;
      }
    }

    // Map planKey to planPrices key
    const planKeyMap: Record<string, keyof typeof countryPricing.planPrices> = {
      'free': 'free',
      'pro_monthly': 'monthly',
      'pro_quarterly': 'quarterly',
      'pro_yearly': 'yearly',
      'pro_lifetime': 'lifetime'
    };

    const planPricesKey = planKeyMap[finalPlanKey];
    if (!planPricesKey) {
      return null;
    }

    const planPrice = countryPricing.planPrices[planPricesKey];

    const result = {
      price: planPrice.price,
      currency: countryPricing.currency,
      currencySymbol: countryPricing.currencySymbol,
      planId: planPrice.planId,
      polarPriceIds: countryPricing.polarPriceIds
    };

    console.log('Found country pricing:', {
      countryCode,
      planKey: finalPlanKey,
      price: result.price,
      currency: result.currency
    });

    return result;
  } catch (error) {
    console.error('Error getting country pricing for plan:', error);
    return null;
  }
}

type PaidPlanKey = 
  | 'starter_yealry' 
  | 'focused_monthly' 
  | 'focused_yearly' 
  | 'smart_quaterly' 
  | 'smart_yearly' 
  | 'pro_monthly' 
  | 'pro_quarterly' 
  | 'pro_yearly' 
  | 'pro_lifetime';

interface ZeroAmountActivationParams {
  user: any;
  planKey: PaidPlanKey;
  interval?: 'monthly' | 'quarterly' | 'yearly' | 'lifetime' | 'one-time';
  regionInfo?: any;
  currency?: string;
  couponDiscount?: any;
  priceInMinorUnits?: number;
}

async function activatePlanWithCoupon({
  user,
  planKey,
  interval = 'monthly',
  regionInfo,
  currency = 'GBP',
  couponDiscount,
  priceInMinorUnits = 0
}: ZeroAmountActivationParams) {
  if (!user?._id) {
    return NextResponse.json(
      { error: 'User not found for zero-amount activation' },
      { status: 400 }
    );
  }

  const regionCode = regionInfo?.countryCode || 'GB';
  const normalizedCurrency = (currency || 'GBP').toUpperCase();
  const paymentReference = `coupon-${couponDiscount?.code || 'zero'}-${Date.now()}`;
  const priceInPrimaryUnits = Math.max(0, priceInMinorUnits) / 100;

  const normalizedInterval: 'monthly' | 'quarterly' | 'yearly' | 'lifetime' | 'one-time' =
    interval === 'quarterly' ? 'quarterly' :
    interval === 'yearly' ? 'yearly' :
    interval === 'lifetime' || interval === 'one-time' ? 'one-time' : 'monthly';

  const activationResult = await subscriptionService.activateProPlan(
    user._id.toString(),
    planKey,
    normalizedInterval,
    paymentReference,
    regionCode,
    normalizedCurrency,
    priceInPrimaryUnits
  );

  if (!activationResult.success) {
    return NextResponse.json(
      { error: activationResult.error || 'Failed to activate plan with coupon' },
      { status: 400 }
    );
  }

  const updatedUser = await User.findById(user._id).select('currentPlanKey subscription').lean();

  return NextResponse.json({
    success: true,
    zero_amount: true,
    provider: 'coupon',
    planKey: updatedUser?.currentPlanKey || planKey,
    subscription: updatedUser?.subscription || null,
    message: couponDiscount
      ? `Coupon ${couponDiscount.code} covered the full amount. Plan activated without payment.`
      : 'Plan activated without payment.',
    coupon: couponDiscount ? { code: couponDiscount.code, id: couponDiscount.id } : null
  });
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await getConnection();

    const body = await request.json();
    console.log('Checkout session request body:', JSON.stringify(body, null, 2));

    const {
      planKey,
      interval,
      billingDetails,
      discountCode,
      couponCode,
      provider,
      returnUrl,
      triggerContext
    } = body;

    // Validate required fields
    if (!planKey) {
      return NextResponse.json({ error: 'Plan key is required' }, { status: 400 });
    }

    // Handle coupon/discount code - check both Coupon and DiscountCode collections
    let couponDiscount = null;
    if (couponCode || discountCode) {
      const code = (couponCode || discountCode).toUpperCase();
      console.log('Looking up coupon code:', code);

      // First, try to find in Coupon collection
      let coupon = await Coupon.findOne({ code });

      if (coupon) {
        console.log('Coupon found in Coupon collection:', {
          code: coupon.code,
          type: coupon.type,
          discountValue: coupon.discountValue,
          isActive: coupon.isActive
        });

        const validation = coupon.isValid();
        console.log('Coupon validation result:', validation);

        if (validation.valid) {
          // Check if coupon applies to this plan
          const isApplicable =
            (!coupon.applicablePlanKeys || coupon.applicablePlanKeys.length === 0 || coupon.applicablePlanKeys.includes(planKey)) &&
            (!coupon.applicablePlans || coupon.applicablePlans.length === 0 || coupon.applicablePlans.includes(planKey));

          console.log('Coupon applicability check:', {
            applicablePlanKeys: coupon.applicablePlanKeys,
            applicablePlans: coupon.applicablePlans,
            planKey,
            isApplicable
          });

          if (isApplicable) {
            couponDiscount = {
              code: coupon.code,
              type: coupon.type,
              value: coupon.discountValue || 0,
              id: coupon._id.toString()
            };
            console.log('Coupon discount created:', couponDiscount);
          } else {
            console.warn('Coupon found but not applicable to plan:', {
              code: coupon.code,
              planKey,
              applicablePlanKeys: coupon.applicablePlanKeys,
              applicablePlans: coupon.applicablePlans
            });
          }
        } else {
          console.warn('Coupon validation failed:', {
            code: coupon.code,
            reason: validation.reason
          });
        }
      } else {
        // If not found in Coupon collection, try DiscountCode collection
        console.log('Coupon not found in Coupon collection, checking DiscountCode collection...');
        const discountCodeDoc = await DiscountCode.findOne({
          code: code,
          isActive: true
        }).populate('applicablePlans', 'key _id');

        if (discountCodeDoc) {
          console.log('Discount code found in DiscountCode collection:', {
            code: discountCodeDoc.code,
            discountType: discountCodeDoc.discountType,
            discountValue: discountCodeDoc.discountValue,
            isActive: discountCodeDoc.isActive,
            validFrom: discountCodeDoc.validFrom,
            validUntil: discountCodeDoc.validUntil
          });

          // Validate discount code using the virtual isValid property
          // Note: DiscountCode model has a virtual 'isValid' getter
          const isValid = discountCodeDoc.isValid;

          if (!isValid) {
            // Check why it's invalid
            const now = new Date();
            if (!discountCodeDoc.isActive) {
              console.warn('Discount code is not active:', {
                code: discountCodeDoc.code
              });
            } else if (now < discountCodeDoc.validFrom) {
              console.warn('Discount code not yet valid:', {
                code: discountCodeDoc.code,
                validFrom: discountCodeDoc.validFrom,
                now
              });
            } else if (now > discountCodeDoc.validUntil) {
              console.warn('Discount code expired:', {
                code: discountCodeDoc.code,
                validUntil: discountCodeDoc.validUntil,
                now
              });
            } else if (discountCodeDoc.usedCount >= discountCodeDoc.maxUses) {
              console.warn('Discount code usage limit reached:', {
                code: discountCodeDoc.code,
                usedCount: discountCodeDoc.usedCount,
                maxUses: discountCodeDoc.maxUses
              });
            }
          } else {
            // Check if discount code applies to this plan
            const PricingPlan = await getAdminPricingPlan();
            const plan = await PricingPlan.findOne({ key: planKey });

            let isApplicable = true;

            // If applicablePlans is empty, code works sitewide (all plans)
            // If applicablePlans has entries, code only works for those specific plans
            if (discountCodeDoc.applicablePlans && discountCodeDoc.applicablePlans.length > 0) {
              isApplicable = false; // Default to false, will be true if plan matches

              if (plan) {
                // Special case: LAUNCH100 should only work for pro_monthly
                if (discountCodeDoc.code === 'LAUNCH100' && planKey !== 'pro_monthly') {
                  isApplicable = false;
                } else {
                  // Populate applicablePlans to check both IDs and keys
                  const populatedDiscount = await DiscountCode.findById(discountCodeDoc._id).populate('applicablePlans', 'key _id');

                  if (populatedDiscount && populatedDiscount.applicablePlans) {
                    // Check if code applies to plan ID or plan key
                    isApplicable = populatedDiscount.applicablePlans.some((planRef: any) => {
                      // If populated, planRef will be an object with _id and key
                      if (planRef && typeof planRef === 'object') {
                        // Check by plan key (preferred for plan-specific codes)
                        if (planRef.key && planRef.key === plan.key) return true;
                        // Check by plan ID
                        if (planRef._id) {
                          const planRefId = planRef._id.toString ? planRef._id.toString() : String(planRef._id);
                          if (planRefId === plan._id.toString()) return true;
                        }
                      }
                      // If not populated, planRef is an ObjectId
                      const planIdStr = planRef.toString ? planRef.toString() : String(planRef);
                      return planIdStr === plan._id.toString();
                    });
                  } else {
                    // Fallback: check without population
                    isApplicable = discountCodeDoc.applicablePlans.some((planRef: any) => {
                      const planIdStr = planRef.toString ? planRef.toString() : String(planRef);
                      return planIdStr === plan._id.toString();
                    });
                  }
                }
              } else {
                isApplicable = false;
              }
            }
            // If applicablePlans is empty or undefined, code works sitewide (isApplicable remains true)

            console.log('Discount code applicability check:', {
              code: discountCodeDoc.code,
              applicablePlans: discountCodeDoc.applicablePlans,
              planKey,
              planId: plan?._id.toString(),
              isApplicable
            });

            if (isApplicable) {
              // Map DiscountCode fields to couponDiscount format
              // DiscountCode uses 'discountType' (percentage/fixed), Coupon uses 'type'
              const discountType = discountCodeDoc.discountType === 'percentage' ? 'percentage' :
                discountCodeDoc.discountType === 'fixed' ? 'fixed' : 'percentage';

              couponDiscount = {
                code: discountCodeDoc.code,
                type: discountType, // Map discountType to type
                value: discountCodeDoc.discountValue || 0,
                id: discountCodeDoc._id.toString()
              };
              console.log('Discount code discount created:', couponDiscount);
            } else {
              console.warn('Discount code found but not applicable to plan:', {
                code: discountCodeDoc.code,
                planKey,
                applicablePlans: discountCodeDoc.applicablePlans
              });
            }
          }
        } else {
          console.warn('Coupon/Discount code not found in either collection:', code);
        }
      }
    } else {
      console.log('No coupon code provided in request');
    }

    // Validate plan key
    const validPlanKeys = [
      'free',
      'starter_monthly',
      'starter_yealry',
      'focused_monthly',
      'focused_yearly',
      'smart_quaterly',
      'smart_yearly',
      'pro_monthly',
      'pro_quarterly',
      'pro_yearly',
      'pro_lifetime'
    ];
    if (!validPlanKeys.includes(planKey)) {
      return NextResponse.json({ error: 'Invalid plan key' }, { status: 400 });
    }

    // Get the plan from database
    const PricingPlan = await getAdminPricingPlan();

    if (!PricingPlan) {
      console.error('PricingPlan model is not available');
      return NextResponse.json({ error: 'Database model not available' }, { status: 500 });
    }

    // First, try to find plan with status 'active' (no populate - we'll fetch CountryPricing manually)
    let plan = await PricingPlan.findOne({ key: planKey, status: 'active' }).lean();

    if (!plan) {
      // Try without lean() if lean() returns null (some setups don't support it)
      plan = await PricingPlan.findOne({ key: planKey, status: 'active' });
      if (plan && typeof plan.toObject === 'function') {
        plan = plan.toObject();
      }
    }

    // If still not found, try without status filter (plan might exist but status not set)
    if (!plan) {
      console.log(`Plan with key "${planKey}" and status "active" not found, trying without status filter...`);
      plan = await PricingPlan.findOne({ key: planKey }).lean();
      if (!plan) {
        plan = await PricingPlan.findOne({ key: planKey });
        if (plan && typeof plan.toObject === 'function') {
          plan = plan.toObject();
        }
      }

      if (plan) {
        console.log(`Found plan "${planKey}" but with status: "${plan.status || 'undefined'}"`);
        // If plan exists but is inactive, still allow it (or you can return error)
        // For now, we'll allow inactive plans to proceed
      }
    }

    if (!plan) {
      // Log all available plans for debugging
      const allPlans = await PricingPlan.find({}).select('key status name').lean();
      console.error(`Plan "${planKey}" not found. Available plans:`,
        allPlans.map((p: any) => ({ key: p.key, status: p.status, name: p.name }))
      );
      return NextResponse.json({
        error: 'Plan not found',
        details: `Plan with key "${planKey}" does not exist in the database. Available plans: ${allPlans.map((p: any) => p.key).join(', ')}`
      }, { status: 404 });
    }

    // Debug: Log plan structure with CountryPricing reference
    const defaultCountryPricingId = (plan as any).defaultCountryPricingId;
    console.log('Plan fetched from database:', {
      planKey: plan.key,
      planId: plan._id,
      billingCycle: plan.billingCycle, // This is the important field for payment frequency
      hasDefaultCountryPricingId: !!defaultCountryPricingId,
      defaultCountryPricingId: defaultCountryPricingId ? (typeof defaultCountryPricingId === 'object' ? defaultCountryPricingId._id : defaultCountryPricingId) : null,
      // Note: Prices and currency are now in CountryPricing collection, not in plan
    });

    // Get user
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Detect user region from IP or use provided region (robust with fallbacks)
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined;
    const regionInfo = await detectUserRegion(ip);

    // Get country pricing for user's region (primary source for currency and pricing)
    // This ensures currency and pricing are properly initialized from region
    let userCountryPricing = await getCountryPricingForPlan(
      regionInfo.countryCode,
      planKey as any,
      interval as any
    );

    // For non-India countries, if pricing not found, fallback to GB (Polar-compatible)
    if (!userCountryPricing && regionInfo.countryCode !== 'IN') {
      console.log('No pricing found for non-India country, falling back to GB for Polar:', {
        countryCode: regionInfo.countryCode,
        planKey,
        interval,
        fallbackTo: 'GB'
      });
      userCountryPricing = await getCountryPricingForPlan('GB', planKey as any, interval as any);
    }

    // Determine currency from region-based CountryPricing
    // Priority: 1. User's country pricing, 2. Region info, 3. Default (GBP)
    // For non-India countries, ensure currency is not INR
    let detectedCurrency = userCountryPricing?.currency?.toUpperCase()
      || regionInfo?.currency?.toUpperCase()
      || 'GBP';

    // Ensure non-India countries don't use INR currency
    if (detectedCurrency === 'INR' && regionInfo.countryCode !== 'IN') {
      console.warn('Non-India country detected with INR currency, using region currency instead:', {
        countryCode: regionInfo.countryCode,
        detectedCurrency,
        regionCurrency: regionInfo.currency
      });
      detectedCurrency = regionInfo?.currency?.toUpperCase() || 'GBP';
    }

    console.log('Region and currency detection:', {
      countryCode: regionInfo.countryCode,
      countryName: regionInfo.countryName,
      detectedCurrency,
      hasCountryPricing: !!userCountryPricing,
      regionPaymentPartner: regionInfo.paymentPartner
    });

    // Payment provider is always Polar
    const paymentProvider = 'polar';

    // VALIDATION: Ensure Polar is available
    {
      const polar = getPolar();
      if (!polar) {
        return NextResponse.json({
          error: 'Polar is not configured. Please add POLAR_ACCESS_TOKEN to your .env.local file.',
          requiresConfiguration: true,
          provider: 'polar',
          detectedCurrency
        }, { status: 500 });
      }
    }

    console.log('Final provider selection:', {
      provider: paymentProvider,
      currency: detectedCurrency,
      countryCode: regionInfo.countryCode
    });

    // Handle different plan types
    if (planKey === 'free') {
      // Free plan - no payment needed
      return NextResponse.json({
        success: true,
        message: 'Free plan activated',
        planKey: 'free'
      });
    }

    // Pro plans - monthly (recurring) or quarterly/yearly/lifetime (one-time)
    const finalInterval = interval || (planKey === 'pro_monthly' ? 'monthly' : planKey === 'pro_quarterly' ? 'quarterly' : planKey === 'pro_yearly' ? 'yearly' : 'one-time');
    console.log('Processing pro plan payment:', { planKey, interval: finalInterval, provider: paymentProvider });
    return await handleProPlanPayment(plan, user, finalInterval, billingDetails, returnUrl, regionInfo, couponDiscount);

  } catch (error) {
    console.error('Checkout session error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error('Error details:', { errorMessage, errorStack });
    return NextResponse.json({
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    }, { status: 500 });
  }
}

// Handle CORS preflight requests
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin');

  // Allow requests from same origin and configured origins
  const allowedOrigins = process.env.NODE_ENV === 'production'
    ? [
      'https://cvcircle.io',
      'https://www.cvcircle.io',
      'https://app.cvcircle.io',
    ]
    : [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
    ];

  const response = new NextResponse(null, { status: 200 });

  // Set CORS headers
  if (origin && (allowedOrigins.includes(origin) || origin.startsWith('chrome-extension://'))) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  } else if (process.env.NODE_ENV === 'development') {
    // In development, allow all origins for easier testing
    response.headers.set('Access-Control-Allow-Origin', origin || '*');
  }

  response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie');
  response.headers.set('Access-Control-Max-Age', '86400');

  return response;
}

async function handleProPlanPayment(
  plan: any,
  user: any,
  interval: string,
  billingDetails: any,
  returnUrl?: string,
  regionInfo?: any,
  couponDiscount?: any
) {
  const planKey = plan.key as PaidPlanKey;
  const countryCode = regionInfo?.countryCode || 'GB';
  const userCurrency = regionInfo?.currency || 'USD';

  // Find matching regional pricing in the plan
  let regionalPriceObj = plan.regionalPricing?.find((rp: any) => 
    rp.region?.toUpperCase() === countryCode.toUpperCase()
  );

  // If not found, look for fallback region (e.g. GB or US)
  if (!regionalPriceObj && countryCode !== 'GB') {
    regionalPriceObj = plan.regionalPricing?.find((rp: any) => 
      rp.region?.toUpperCase() === 'GB'
    );
  }
  if (!regionalPriceObj && countryCode !== 'US') {
    regionalPriceObj = plan.regionalPricing?.find((rp: any) => 
      rp.region?.toUpperCase() === 'US'
    );
  }
  // If still not found, use first element in regionalPricing or fallback to base plan details
  if (!regionalPriceObj && plan.regionalPricing?.length > 0) {
    regionalPriceObj = plan.regionalPricing[0];
  }

  // Determine the correct price based on planKey and interval
  let priceId: string | undefined = regionalPriceObj?.polarPriceId;
  let amount: number = regionalPriceObj ? (regionalPriceObj.price * 100) : 0;
  let currency: string = regionalPriceObj?.currency || 'USD';

  // Fallback to plan's default fields if not resolved
  if (amount === 0) {
    if (planKey.includes('monthly')) {
      amount = (plan.price_monthly || plan.price || 0) * 100;
      priceId = plan.polarPriceId_monthly;
    } else if (planKey.includes('quarterly') || planKey.includes('quaterly')) {
      amount = (plan.price_quarterly || plan.price || 0) * 100;
      priceId = plan.polarPriceId_quarterly;
    } else if (planKey.includes('yearly') || planKey.includes('yealry')) {
      amount = (plan.price_yearly || plan.price || 0) * 100;
      priceId = plan.polarPriceId_yearly;
    } else {
      amount = (plan.price_one_time || plan.price || 0) * 100;
      priceId = plan.polarPriceId_one_time;
    }
    currency = plan.currency || 'USD';
  }

  // Fallback to Polar Price IDs directly on plan if priceId still not set
  if (!priceId) {
    if (planKey.includes('monthly')) priceId = plan.polarPriceId_monthly;
    else if (planKey.includes('quarterly') || planKey.includes('quaterly')) priceId = plan.polarPriceId_quarterly;
    else if (planKey.includes('yearly') || planKey.includes('yealry')) priceId = plan.polarPriceId_yearly;
    else priceId = plan.polarPriceId_one_time;
  }

  // Log for debugging
  console.log('Polar pricing:', {
    planKey,
    interval,
    amount,
    currency,
    countryPricingFound: !!countryPricing,
    regionCode: regionInfo?.countryCode
  });

  // Apply coupon discount
  if (couponDiscount) {
    if (couponDiscount.type === 'percentage') {
      amount = Math.round(amount * (1 - couponDiscount.value / 100));
    } else if (couponDiscount.type === 'fixed') {
      amount = Math.max(0, amount - (couponDiscount.value * 100));
    }
  }

  if (amount <= 0) {
    console.log('Coupon covered full pro plan cost. Activating plan without payment.');
    return activatePlanWithCoupon({
      user,
      planKey,
      interval: interval as any,
      regionInfo,
      currency,
      couponDiscount,
      priceInMinorUnits: amount
    });
  }

  // Validate Polar configuration before creating payment
  const secretKey = process.env.POLAR_ACCESS_TOKEN;
  if (!secretKey) {
    console.error('❌ Polar Payment Creation Failed (Pro Plan): POLAR_ACCESS_TOKEN is missing');
    return NextResponse.json({
      error: 'Polar is currently unavailable. Please contact support.',
      details: 'Server configuration error'
    }, { status: 500 });
  }

  try {
    if (!priceId) {
      throw new Error(`No Polar Price ID found for the selected plan: ${planKey}`);
    }

    const checkoutResponse = await PolarService.createCheckout({
      productPriceId: priceId,
      customerEmail: billingDetails.email || user.email,
      customerName: billingDetails.name || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      successUrl: `${returnUrl || process.env.NEXTAUTH_URL}/dashboard?success=true&session_id={CHECKOUT_SESSION_ID}`,
      metadata: {
        planKey: planKey,
        userId: user._id.toString(),
        planId: plan._id.toString(),
        interval: interval,
        region: regionInfo?.countryCode || 'US',
        couponCode: couponDiscount?.code || '',
        couponId: couponDiscount?.id || ''
      }
    });

    if (!checkoutResponse.success || !checkoutResponse.url) {
      throw new Error(checkoutResponse.error || 'Failed to create Polar checkout session');
    }

    return NextResponse.json({
      provider: 'polar',
      redirect_url: checkoutResponse.url
    });

  } catch (error) {
    console.error('Polar Checkout Session error:', error);
    return NextResponse.json({
      error: 'Payment setup failed',
      details: process.env.NODE_ENV === 'development' ? String(error) : undefined
    }, { status: 500 });
  }
}

