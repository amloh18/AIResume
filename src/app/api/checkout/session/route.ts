import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getConnection } from '@/lib/database';
import { getAdminPricingPlan } from '@/models/admin-models';
import User from '@/models/User';
import { getPolar, PolarService } from '@/lib/payment/polar';
import { getRazorpay } from '@/lib/payment/razorpay';
import { detectUserRegion } from '@/lib/services/regionDetectionService';
import { getPricingForPlan } from '@/lib/services/countryPricingService';
import subscriptionService from '@/lib/services/subscriptionService';

// Helper to get country pricing for a plan using CountryPricing collection
// Returns full CountryPricing data including stripePriceIds and razorpayPlanIds
async function getCountryPricingForPlan(
  countryCode: string,
  planKey: 'free' | 'day_pass' | 'pro_monthly' | 'pro_quarterly' | 'pro_lifetime',
  billingCycle?: 'monthly' | 'quarterly' | 'yearly' | 'one-time'
): Promise<{
  price: number;
  currency: string;
  currencySymbol: string;
  planId: string;
  stripePriceIds?: { dayPass?: string; monthly?: string; quarterly?: string; yearly?: string };
  razorpayPlanIds?: { dayPass?: string; monthly?: string; quarterly?: string; yearly?: string };
} | null> {
  try {
    // Map billingCycle to planKey if not provided
    let finalPlanKey = planKey;
    if (!finalPlanKey && billingCycle) {
      const cycleToPlanKey: Record<string, string> = {
        'monthly': 'pro_monthly',
        'quarterly': 'pro_quarterly',
        'yearly': 'pro_yearly',
        'one-time': 'pro_lifetime' // lifetime is one-time
      };
      finalPlanKey = (cycleToPlanKey[billingCycle] || 'pro_monthly') as any;
    }

    // Get full CountryPricing data (not just the plan-specific pricing)
    const { getCountryPricing } = await import('@/lib/services/countryPricingService');
    let countryPricing = await getCountryPricing(countryCode);

    // For non-India countries, if pricing not found, fallback to GB (Stripe-compatible)
    // This ensures Stripe works for all eligible countries
    if (!countryPricing && countryCode !== 'IN') {
      console.log('No country pricing found for non-India country, falling back to GB (Stripe-compatible):', {
        countryCode,
        planKey: finalPlanKey,
        fallbackTo: 'GB'
      });
      countryPricing = await getCountryPricing('GB');
    }

    // For India, if pricing not found, return null (should use Razorpay with INR)
    if (!countryPricing) {
      if (countryCode === 'IN') {
        console.log('No INR pricing found for India:', {
          countryCode,
          planKey: finalPlanKey
        });
        return null;
      }
      // Final fallback for non-India: try US pricing (USD/Stripe)
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
      'day_pass': 'dayPass',
      'pro_monthly': 'monthly',
      'pro_quarterly': 'quarterly',
      'pro_yearly': 'dayPass',
      'pro_lifetime': 'yearly'
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
      stripePriceIds: countryPricing.stripePriceIds,
      razorpayPlanIds: countryPricing.razorpayPlanIds
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
import Coupon from '@/models/Coupon';
import DiscountCode from '@/models/DiscountCode';

type PaidPlanKey = 'day_pass' | 'pro_monthly' | 'pro_quarterly' | 'pro_lifetime';

interface ZeroAmountActivationParams {
  user: any;
  planKey: PaidPlanKey;
  interval?: 'monthly' | 'quarterly' | 'yearly' | 'one-time';
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
  currency = 'INR',
  couponDiscount,
  priceInMinorUnits = 0
}: ZeroAmountActivationParams) {
  if (!user?._id) {
    return NextResponse.json(
      { error: 'User not found for zero-amount activation' },
      { status: 400 }
    );
  }

  const regionCode = regionInfo?.countryCode || 'IN';
  const normalizedCurrency = (currency || 'INR').toUpperCase();
  const paymentReference = `coupon-${couponDiscount?.code || 'zero'}-${Date.now()}`;
  const priceInPrimaryUnits = Math.max(0, priceInMinorUnits) / 100;

  let activationResult;

  if (planKey === 'day_pass') {
    activationResult = await subscriptionService.activateDayPass(
      user._id.toString(),
      paymentReference,
      regionCode,
      normalizedCurrency,
      priceInPrimaryUnits
    );
  } else {
    const normalizedInterval: 'monthly' | 'quarterly' | 'yearly' =
      interval === 'quarterly' ? 'quarterly' : interval === 'yearly' ? 'yearly' : 'monthly';

    const proPlanKey: 'pro_monthly' | 'pro_quarterly' | 'pro_yearly' | 'pro_lifetime' =
      planKey === 'pro_quarterly'
        ? 'pro_quarterly'
        : planKey === 'pro_yearly'
          ? 'pro_yearly'
          : planKey === 'pro_lifetime'
            ? 'pro_lifetime'
            : 'pro_monthly';

    activationResult = await subscriptionService.activateProPlan(
      user._id.toString(),
      proPlanKey,
      normalizedInterval,
      paymentReference,
      regionCode,
      normalizedCurrency,
      priceInPrimaryUnits
    );
  }

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
    const validPlanKeys = ['free', 'day_pass', 'pro_monthly', 'pro_quarterly', 'pro_lifetime'];
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

    // For non-India countries, if pricing not found, fallback to GB (Stripe-compatible)
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

    // ENFORCE: Razorpay = INR only (India), Polar = all other currencies (all other countries)
    // Determine payment provider based on country code and currency
    let paymentProvider = provider;

    if (!paymentProvider) {
      // Auto-select provider based on country code first, then currency
      // India (IN) = Razorpay, all other countries = Polar
      if (regionInfo.countryCode === 'IN' && detectedCurrency === 'INR') {
        paymentProvider = 'razorpay';
      } else {
        // All non-India countries use Polar
        paymentProvider = 'polar';
        // Ensure currency is not INR for non-India countries
        if (detectedCurrency === 'INR' && regionInfo.countryCode !== 'IN') {
          console.warn('Non-India country detected with INR currency, using region currency instead:', {
            countryCode: regionInfo.countryCode,
            detectedCurrency,
            regionCurrency: regionInfo.currency
          });
          // Use region currency instead of INR
          const correctedCurrency = regionInfo.currency || 'GBP';
          // Update userCountryPricing if needed
          if (userCountryPricing && userCountryPricing.currency === 'INR') {
            const { getCountryPricing } = await import('@/lib/services/countryPricingService');
            const fallbackPricing = await getCountryPricing(regionInfo.countryCode);
            if (fallbackPricing) {
              userCountryPricing = await getCountryPricingForPlan(
                regionInfo.countryCode,
                planKey as any,
                interval as any
              );
            }
          }
        }
      }
    }

    // VALIDATION: Enforce Razorpay = INR only
    if (paymentProvider === 'razorpay') {
      // Razorpay ONLY supports INR - reject any other currency
      if (detectedCurrency !== 'INR') {
        console.warn('Razorpay selected but currency is not INR:', {
          requestedProvider: 'razorpay',
          detectedCurrency,
          countryCode: regionInfo.countryCode,
          fallingBackTo: 'stripe'
        });

        // Force switch to Polar for non-INR currencies
        const polar = getPolar();
        if (!polar) {
          return NextResponse.json({
            error: 'Razorpay only supports INR currency. Polar is required for other currencies but is not configured.',
            unsupportedCurrency: true,
            detectedCurrency,
            requiresPolar: true,
            requiresConfiguration: true
          }, { status: 400 });
        }
        paymentProvider = 'polar';
      }

      // Additional validation: Ensure we have INR pricing
      if (!userCountryPricing || userCountryPricing.currency !== 'INR') {
        // Try to get India pricing explicitly
        const indiaPricing = await getCountryPricingForPlan('IN', planKey as any, interval as any);
        if (!indiaPricing || indiaPricing.currency !== 'INR') {
          console.warn('No INR pricing found for Razorpay, switching to Polar');
          const polar = getPolar();
          if (!polar) {
            return NextResponse.json({
              error: 'INR pricing not available. Polar is required but not configured.',
              requiresPolar: true,
              requiresConfiguration: true
            }, { status: 400 });
          }
          paymentProvider = 'polar';
        }
      }
    }

    // VALIDATION: Ensure Polar is available for non-INR currencies
    if (paymentProvider === 'polar') {
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
      countryCode: regionInfo.countryCode,
      reason: paymentProvider === 'razorpay' ? 'INR currency' : 'Non-INR currency or explicit Polar selection'
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

    if (planKey === 'day_pass') {
      // Day Pass - one-time payment
      return await handleDayPassPayment(plan, user, billingDetails, paymentProvider, regionInfo, couponDiscount);
    } else {
      // Pro plans - monthly (recurring) or quarterly/yearly (one-time)
      // Default interval to 'monthly' if not provided for pro plans
      const finalInterval = interval || 'monthly';
      console.log('Processing pro plan payment:', { planKey, interval: finalInterval, provider: paymentProvider });
      return await handleProPlanPayment(plan, user, finalInterval, billingDetails, paymentProvider, returnUrl, regionInfo, couponDiscount);
    }

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

async function handleDayPassPayment(
  plan: any,
  user: any,
  billingDetails: any,
  provider: string,
  regionInfo: any,
  couponDiscount?: any
) {
  // ENFORCE: Razorpay = INR only, get India pricing explicitly
  // Polar = use region-based pricing
  let countryPricing;
  if (provider === 'razorpay') {
    // Razorpay ONLY supports INR - get India pricing explicitly
    countryPricing = await getCountryPricingForPlan('IN', 'day_pass', 'one-time');

    // Validate INR currency
    if (!countryPricing || countryPricing.currency !== 'INR') {
      console.error('Razorpay requires INR pricing but not found:', {
        hasPricing: !!countryPricing,
        currency: countryPricing?.currency
      });
      throw new Error('INR pricing not available for Razorpay');
    }
  } else {
    // Polar: Use region-based pricing (supports all currencies)
    // For non-India countries, ensure we get Stripe-compatible pricing
    const countryCode = regionInfo?.countryCode || 'GB';
    countryPricing = await getCountryPricingForPlan(
      countryCode,
      'day_pass',
      'one-time'
    );

    // If no pricing found for non-India country, fallback to GB (Stripe-compatible)
    if (!countryPricing && countryCode !== 'IN') {
      console.log('No pricing found for country, falling back to GB for Polar:', {
        countryCode,
        fallbackTo: 'GB'
      });
      countryPricing = await getCountryPricingForPlan('GB', 'day_pass', 'one-time');
    }
  }

  // All prices MUST come from CountryPricing - no legacy fallbacks
  let amount: number;
  let currency: string;

  if (countryPricing) {
    amount = countryPricing.price * 100; // Convert to cents/paisa
    // ENFORCE: Razorpay = INR only, Polar = actual currency from CountryPricing
    if (provider === 'razorpay') {
      currency = 'INR'; // Force INR for Razorpay
      // Validate amount is in INR (should already be from India pricing)
      if (countryPricing.currency !== 'INR') {
        throw new Error('Razorpay requires INR currency but got: ' + countryPricing.currency);
      }
    } else {
      currency = countryPricing.currency; // Use actual currency for Stripe
    }
  } else {
    // If no country pricing found, try to get from plan's defaultCountryPricingId
    const planDefaultPricingId = (plan as any).defaultCountryPricingId;
    if (planDefaultPricingId) {
      const { getCountryPricingById } = await import('@/lib/services/countryPricingService');
      const defaultPricing = await getCountryPricingById(planDefaultPricingId);
      if (defaultPricing) {
        // Get day pass price from default pricing
        const dayPassPrice = defaultPricing.planPrices.dayPass?.price || 0;
        amount = dayPassPrice * 100;
        currency = provider === 'razorpay' ? 'INR' : defaultPricing.currency;
      } else {
        // Final fallback: Use GB pricing (our default)
        const { getCountryPricing } = await import('@/lib/services/countryPricingService');
        const gbPricing = await getCountryPricing('GB');
        if (gbPricing) {
          const dayPassPrice = gbPricing.planPrices.dayPass?.price || 0;
          amount = dayPassPrice * 100;
          // ENFORCE: Razorpay = INR only (must get India pricing), Polar = GB currency
          if (provider === 'razorpay') {
            // For Razorpay, we MUST have INR - try India pricing
            const indiaPricing = await getCountryPricing('IN');
            if (indiaPricing && indiaPricing.planPrices.dayPass) {
              amount = indiaPricing.planPrices.dayPass.price * 100;
              currency = 'INR';
            } else {
              throw new Error('INR pricing not available for Razorpay');
            }
          } else {
            currency = gbPricing.currency; // Use GB currency for Stripe
          }
        } else {
          // Absolute fallback
          amount = 0;
          if (provider === 'razorpay') {
            throw new Error('INR pricing not available for Razorpay');
          }
          currency = 'GBP'; // Default for Stripe
        }
      }
    } else {
      // No defaultCountryPricingId - use region-based pricing
      if (provider === 'razorpay') {
        // Razorpay MUST use INR - get India pricing
        const { getCountryPricing } = await import('@/lib/services/countryPricingService');
        const indiaPricing = await getCountryPricing('IN');
        if (indiaPricing && indiaPricing.planPrices.dayPass) {
          amount = indiaPricing.planPrices.dayPass.price * 100;
          currency = 'INR';
        } else {
          throw new Error('INR pricing not available for Razorpay');
        }
      } else {
        // Polar: Use GB as fallback
        const { getCountryPricing } = await import('@/lib/services/countryPricingService');
        const gbPricing = await getCountryPricing('GB');
        if (gbPricing && gbPricing.planPrices.dayPass) {
          amount = gbPricing.planPrices.dayPass.price * 100;
          currency = gbPricing.currency;
        } else {
          amount = 0;
          currency = 'GBP';
        }
      }
    }
  }

  // Log for debugging
  console.log('Day pass pricing:', {
    amount,
    currency,
    countryPricingFound: !!countryPricing,
    regionCode: regionInfo?.countryCode
  });

  // Apply coupon discount BEFORE creating order
  const originalDayPassAmount = amount;
  if (couponDiscount) {
    console.log('Applying coupon discount to Day Pass Razorpay order:', {
      couponCode: couponDiscount.code,
      discountType: couponDiscount.type,
      discountValue: couponDiscount.value,
      originalAmount: amount,
      originalAmountInINR: (amount / 100).toFixed(2)
    });

    if (couponDiscount.type === 'percentage') {
      amount = Math.round(amount * (1 - couponDiscount.value / 100));
      console.log('Percentage discount applied (Day Pass):', {
        discountPercent: couponDiscount.value,
        discountedAmount: amount,
        discountedAmountInINR: (amount / 100).toFixed(2),
        savings: ((originalDayPassAmount - amount) / 100).toFixed(2)
      });
    } else if (couponDiscount.type === 'fixed') {
      // Fixed discount: subtract from amount (discountValue is in INR, convert to paise)
      const discountInPaise = Math.round(couponDiscount.value * 100);
      amount = Math.max(0, amount - discountInPaise);
      console.log('Fixed discount applied (Day Pass):', {
        discountInINR: couponDiscount.value,
        discountInPaise: discountInPaise,
        discountedAmount: amount,
        discountedAmountInINR: (amount / 100).toFixed(2),
        savings: ((originalDayPassAmount - amount) / 100).toFixed(2)
      });
    }
  } else {
    console.log('No coupon discount applied to Day Pass Razorpay order');
  }

  if (amount <= 0) {
    console.log('Coupon covered full day pass cost. Activating plan without payment.');
    return activatePlanWithCoupon({
      user,
      planKey: 'day_pass',
      interval: 'one-time',
      regionInfo,
      currency,
      couponDiscount,
      priceInMinorUnits: amount
    });
  }

  if (provider === 'polar') {
    if (amount <= 0) {
      console.log('Coupon covered full pro plan cost (Stripe). Activating subscription without payment.');
      return activatePlanWithCoupon({
        user,
        planKey,
        interval: interval as 'monthly' | 'quarterly' | 'yearly',
        regionInfo,
        currency,
        couponDiscount,
        priceInMinorUnits: amount
      });
    }

    // Validate Polar configuration before creating payment
    const secretKey = process.env.POLAR_ACCESS_TOKEN;

    if (!secretKey) {
      console.error('❌ Polar Payment Creation Failed (Day Pass): POLAR_ACCESS_TOKEN is missing');
      console.error('   → This is the MOST COMMON issue on Vercel deployments');
      console.error('   → Check Vercel Dashboard → Project → Settings → Environment Variables');
      console.error('   → Ensure POLAR_ACCESS_TOKEN is set (without NEXT_PUBLIC_ prefix)');
      console.error('   → Redeploy after adding environment variables');
      return NextResponse.json({
        error: 'Polar is currently unavailable. Please contact support.',
        details: 'Server configuration error'
      }, { status: 500 });
    }

    try {
      // Use Polar price ID from plan or country pricing
      const polarPriceId = countryPricing?.stripePriceIds?.dayPass || plan.stripePriceId_one_time;

      if (!polarPriceId) {
        throw new Error('No Polar Price ID found for Day Pass');
      }

      const checkoutResponse = await PolarService.createCheckout({
        productPriceId: polarPriceId,
        customerEmail: billingDetails.email || user.email,
        customerName: billingDetails.name || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        successUrl: `${process.env.NEXTAUTH_URL || ''}/dashboard?success=true&session_id={CHECKOUT_SESSION_ID}`,
        metadata: {
          planKey: plan.key,
          userId: user._id.toString(),
          planId: plan._id.toString(),
          type: 'day_pass',
          region: regionInfo.countryCode
        }
      });

      if (!checkoutResponse.success || !checkoutResponse.url) {
        throw new Error(checkoutResponse.error || 'Failed to create Polar checkout session');
      }

      return NextResponse.json({
        provider: 'polar',
        redirect_url: checkoutResponse.url
      });

    } catch (error: any) {
      console.error('Polar Checkout error:', error);
      return NextResponse.json({
        error: error.message || 'Payment setup failed',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }, { status: 500 });
    }

  } else if (provider === 'razorpay') {
    const razorpayInstance = getRazorpay();
    if (!razorpayInstance) {
      return NextResponse.json({ error: 'Razorpay is not configured' }, { status: 500 });
    }
    try {
      // Use country-specific Razorpay plan ID if available, otherwise create order
      const razorpayPlanId = countryPricing?.razorpayPlanIds?.dayPass;

      if (razorpayPlanId) {
        // Create Razorpay subscription for one-time payment (total_count: 1)
        const subscription = await razorpayInstance.subscriptions.create({
          plan_id: razorpayPlanId,
          total_count: 1, // One-time payment
          customer_notify: 1,
          notes: {
            planKey: plan.key,
            userId: user._id.toString(),
            planId: plan._id.toString(),
            type: 'day_pass',
            region: regionInfo.countryCode
          }
        });

        // Get subscription invoice amount for Day Pass
        let subscriptionAmount = 0;
        let subscriptionCurrency = 'INR';

        try {
          const invoices = await razorpayInstance.invoices.all({
            subscription_id: subscription.id,
            count: 1
          });

          if (invoices.items && invoices.items.length > 0) {
            const invoice = invoices.items[0];
            subscriptionAmount = invoice.amount || 0;
            subscriptionCurrency = invoice.currency || 'INR';
          } else {
            subscriptionAmount = Math.round(amount);
            subscriptionCurrency = 'INR';
          }
        } catch (error) {
          console.warn('Could not fetch subscription invoice details:', error);
          subscriptionAmount = Math.round(amount);
          subscriptionCurrency = 'INR';
        }

        return NextResponse.json({
          provider: 'razorpay',
          subscription_id: subscription.id,
          plan_id: razorpayPlanId,
          amount: subscriptionAmount,
          currency: subscriptionCurrency,
          key_id: process.env.RAZORPAY_KEY_ID,
          checkout: true
        });
      }

      // Fallback: Create Razorpay Order for one-time payment
      // ENFORCE: Razorpay = INR only - strict validation
      // Razorpay expects uppercase 'INR' (not lowercase 'inr')
      const normalizedCurrency = currency.toUpperCase().trim();
      const finalAmount = Math.round(amount);

      // Validate currency is exactly 'INR' (Razorpay ONLY supports INR)
      if (normalizedCurrency !== 'INR') {
        console.error('Razorpay currency validation failed (day pass):', {
          provided: currency,
          normalized: normalizedCurrency,
          expected: 'INR'
        });
        return NextResponse.json({
          error: `Razorpay only supports INR currency. Got: ${currency}. Please use Stripe for other currencies.`,
          unsupportedCurrency: true,
          providedCurrency: currency,
          suggestedProvider: 'stripe'
        }, { status: 400 });
      }

      // Razorpay minimum amount validation
      if (normalizedCurrency === 'INR' && finalAmount < 100) {
        console.error('Amount too small for Razorpay:', finalAmount);
        return NextResponse.json({ error: 'Amount must be at least ₹1.00' }, { status: 400 });
      }

      // Generate receipt (max 40 characters per Razorpay requirement)
      const shortUserId = user._id.toString().substring(0, 10);
      const timestamp = Date.now().toString().slice(-8);
      const receipt = `dp_${shortUserId}_${timestamp}`.substring(0, 40);

      // Ensure currency is exactly 'INR' - Razorpay is strict about this
      const finalCurrency = 'INR'; // Always use 'INR' for Razorpay

      console.log('Creating Razorpay order (day pass):', {
        amount: finalAmount,
        amountInINR: (finalAmount / 100).toFixed(2),
        originalAmount: originalDayPassAmount,
        originalAmountInINR: (originalDayPassAmount / 100).toFixed(2),
        discountApplied: !!couponDiscount,
        couponCode: couponDiscount?.code || null,
        discountType: couponDiscount?.type || null,
        discountValue: couponDiscount?.value || null,
        currency: finalCurrency,
        normalizedCurrency: normalizedCurrency,
        originalCurrency: currency,
        receipt: receipt,
        currencyType: typeof finalCurrency,
        currencyLength: finalCurrency.length
      });

      // Razorpay API requires exactly 'INR' (uppercase, 3 characters)
      const orderParams = {
        amount: finalAmount, // This should be the discounted amount
        currency: finalCurrency, // Hardcode to 'INR' to ensure it's correct
        receipt: receipt,
        notes: {
          planKey: plan.key,
          userId: user._id.toString(),
          planId: plan._id.toString(),
          type: 'day_pass',
          region: regionInfo.countryCode
        }
      };

      console.log('Razorpay order params (day pass - FINAL - before creating order):', {
        amount: orderParams.amount,
        amountInINR: (orderParams.amount / 100).toFixed(2),
        originalAmount: originalDayPassAmount,
        originalAmountInINR: (originalDayPassAmount / 100).toFixed(2),
        discountApplied: !!couponDiscount,
        discountAmount: couponDiscount ? (originalDayPassAmount - finalAmount) : 0,
        discountAmountInINR: couponDiscount ? ((originalDayPassAmount - finalAmount) / 100).toFixed(2) : '0.00',
        currency: orderParams.currency,
        couponCode: couponDiscount?.code || null
      });
      console.log('Full order params JSON (day pass):', JSON.stringify(orderParams, null, 2));

      // Validate Razorpay configuration before creating order
      const keyId = process.env.RAZORPAY_KEY_ID;
      const keySecret = process.env.RAZORPAY_KEY_SECRET;

      if (!keySecret) {
        console.error('❌ Razorpay Order Creation Failed (Day Pass): RAZORPAY_KEY_SECRET is missing');
        console.error('   → This is the MOST COMMON issue on Vercel deployments');
        console.error('   → Check Vercel Dashboard → Project → Settings → Environment Variables');
        console.error('   → Ensure RAZORPAY_KEY_SECRET is set (without NEXT_PUBLIC_ prefix)');
        console.error('   → Redeploy after adding environment variables');
        return NextResponse.json({
          error: 'Razorpay is currently unavailable. Please contact support.',
          details: 'Server configuration error'
        }, { status: 500 });
      }

      if (!keyId) {
        console.error('❌ Razorpay Order Creation Failed (Day Pass): RAZORPAY_KEY_ID is missing');
        return NextResponse.json({
          error: 'Razorpay is currently unavailable. Please contact support.',
          details: 'Server configuration error'
        }, { status: 500 });
      }

      const razorpayInstance = getRazorpay();
      if (!razorpayInstance) {
        console.error('❌ Razorpay instance initialization failed (Day Pass)');
        return NextResponse.json({
          error: 'Razorpay is currently unavailable. Please contact support.',
          details: 'Server configuration error'
        }, { status: 500 });
      }

      let order;
      try {
        order = await razorpayInstance.orders.create(orderParams);
      } catch (orderError: any) {
        console.error('❌ Razorpay order creation failed (Day Pass):', orderError);

        // Extract detailed error information
        if (orderError?.error) {
          const razorpayError = orderError.error;
          console.error('Razorpay API Error Details:', {
            code: razorpayError.code,
            description: razorpayError.description,
            field: razorpayError.field,
            source: razorpayError.source,
            step: razorpayError.step,
            reason: razorpayError.reason,
          });

          // Check for common errors
          if (razorpayError.description?.toLowerCase().includes('key') ||
            razorpayError.description?.toLowerCase().includes('secret')) {
            console.error('⚠️  This error suggests RAZORPAY_KEY_SECRET may be incorrect or missing');
            console.error('   → Verify the secret key in Vercel Environment Variables');
            console.error('   → Ensure it matches your Razorpay Dashboard (Test vs Live mode)');
          }
        }

        throw orderError; // Re-throw to be caught by outer catch block
      }

      // Verify the order was created with the correct amount
      console.log('Razorpay order created (day pass) - verification:', {
        orderId: order.id,
        orderAmount: order.amount,
        orderAmountInINR: (order.amount / 100).toFixed(2),
        expectedAmount: finalAmount,
        expectedAmountInINR: (finalAmount / 100).toFixed(2),
        amountsMatch: order.amount === finalAmount
      });

      return NextResponse.json({
        provider: 'razorpay',
        order_id: order.id,
        amount: order.amount,
        currency: order.currency,
        key_id: process.env.RAZORPAY_KEY_ID,
        checkout: true, // Use Razorpay Checkout
        coupon: couponDiscount ? {
          code: couponDiscount.code,
          id: couponDiscount.id
        } : null
      });

    } catch (error: any) {
      console.error('Razorpay Order error (day pass):', error);
      console.error('Full error object:', JSON.stringify(error, null, 2));

      // Extract detailed error information from Razorpay API
      let errorMessage = 'Payment setup failed';
      let errorCode = null;
      let errorDescription = null;
      let errorField = null;
      let errorSource = null;
      let errorStep = null;
      let errorReason = null;

      if (error instanceof Error) {
        errorMessage = error.message;
      }

      // Razorpay SDK errors often have additional properties
      if (error?.error) {
        const razorpayError = error.error;
        errorCode = razorpayError.code;
        errorDescription = razorpayError.description || razorpayError.message;
        errorField = razorpayError.field;
        errorSource = razorpayError.source;
        errorStep = razorpayError.step;
        errorReason = razorpayError.reason;

        console.error('Razorpay API error (day pass):', {
          code: errorCode,
          description: errorDescription,
          field: errorField,
          source: errorSource,
          step: errorStep,
          reason: errorReason,
          fullError: razorpayError
        });

        // Use Razorpay's error description if available
        errorMessage = errorDescription || errorMessage;

        // Check if it's a currency error
        if (errorField === 'currency' || errorDescription?.toLowerCase().includes('currency')) {
          console.error('Currency error detected. Check Razorpay account configuration for INR support.');
          errorMessage = `Currency error: ${errorDescription || 'INR currency may not be enabled in your Razorpay account. Please check your Razorpay dashboard settings.'}`;
        }
      }

      return NextResponse.json({
        error: errorMessage,
        code: errorCode,
        details: process.env.NODE_ENV === 'development' ? {
          description: errorDescription,
          field: errorField,
          source: errorSource,
          step: errorStep,
          reason: errorReason
        } : undefined
      }, { status: 500 });
    }
  }

  return NextResponse.json({ error: 'Unsupported payment provider' }, { status: 400 });
}

// Note: extractNumericPrice function removed - prices are now numeric from database

async function handleProPlanPayment(
  plan: any,
  user: any,
  interval: string,
  billingDetails: any,
  provider: string,
  returnUrl?: string,
  regionInfo?: any,
  couponDiscount?: any
) {
  // Map interval to planKey
  const intervalToPlanKey: Record<string, 'pro_monthly' | 'pro_quarterly' | 'pro_lifetime'> = {
    'monthly': 'pro_monthly',
    'quarterly': 'pro_quarterly',
    'yearly': 'pro_lifetime'
  };
  const planKey = intervalToPlanKey[interval] || 'pro_monthly';

  // Get country pricing from CountryPricing collection
  // For Stripe (non-India), ensure we get pricing or fallback to GB
  const countryCode = regionInfo?.countryCode || 'GB';
  let countryPricing = await getCountryPricingForPlan(countryCode, planKey, interval as any);

  // If no pricing found for non-India country, fallback to GB (Stripe-compatible)
  if (!countryPricing && countryCode !== 'IN' && provider === 'polar') {
    console.log('No pricing found for country, falling back to GB for Polar:', {
      countryCode,
      planKey,
      interval,
      fallbackTo: 'GB'
    });
    countryPricing = await getCountryPricingForPlan('GB', planKey, interval as any);
  }

  // Determine the correct price based on interval - use CountryPricing collection
  let priceId: string | undefined;
  // Initialize with defaults - will be set from CountryPricing or plan fallback
  let amount: number = 0;
  let currency: string = 'USD';
  let paymentMode: 'payment' | 'subscription' = 'subscription'; // Default to subscription

  // All pro plans (monthly, quarterly, yearly) are recurring subscriptions
  // Day Pass is one-time payment (handled separately)
  // Monthly = recurring monthly subscription
  // Quarterly = recurring every 3 months subscription
  // Yearly = recurring yearly subscription
  // All use 'subscription' mode for automatic recurring charges

  if (provider === 'polar') {
    // Polar: Use country pricing from CountryPricing collection (supports all currencies)
    // All prices and currency come from CountryPricing collection
    if (interval === 'monthly') {
      priceId = countryPricing?.stripePriceIds?.monthly || plan.stripePriceId_monthly;
      if (countryPricing) {
        amount = countryPricing.price * 100;
        currency = countryPricing.currency; // Use actual currency from CountryPricing
      } else {
        // Fallback to plan's defaultCountryPricingId
        const planDefaultPricingId = (plan as any).defaultCountryPricingId;
        if (planDefaultPricingId) {
          const { getCountryPricingById } = await import('@/lib/services/countryPricingService');
          const defaultPricing = await getCountryPricingById(planDefaultPricingId);
          if (defaultPricing) {
            amount = defaultPricing.planPrices.monthly.price * 100;
            currency = defaultPricing.currency;
          } else {
            // Final fallback: GB pricing
            const { getCountryPricing } = await import('@/lib/services/countryPricingService');
            const gbPricing = await getCountryPricing('GB');
            amount = gbPricing?.planPrices.monthly.price ? gbPricing.planPrices.monthly.price * 100 : 0;
            currency = gbPricing?.currency || 'GBP'; // Use GB currency for Stripe
          }
        } else {
          // No defaultCountryPricingId - use GB pricing
          const { getCountryPricing } = await import('@/lib/services/countryPricingService');
          const gbPricing = await getCountryPricing('GB');
          amount = gbPricing?.planPrices.monthly.price ? gbPricing.planPrices.monthly.price * 100 : 0;
          currency = gbPricing?.currency || 'GBP'; // Use GB currency for Stripe
        }
      }
    } else if (interval === 'quarterly') {
      priceId = countryPricing?.stripePriceIds?.quarterly || plan.stripePriceId_quarterly;
      if (countryPricing) {
        amount = countryPricing.price * 100;
        currency = countryPricing.currency; // Use actual currency from CountryPricing
      } else {
        // Fallback to plan's defaultCountryPricingId
        const planDefaultPricingId = (plan as any).defaultCountryPricingId;
        if (planDefaultPricingId) {
          const { getCountryPricingById } = await import('@/lib/services/countryPricingService');
          const defaultPricing = await getCountryPricingById(planDefaultPricingId);
          if (defaultPricing) {
            amount = defaultPricing.planPrices.quarterly.price * 100;
            currency = defaultPricing.currency; // Use actual currency for Stripe
          } else {
            const { getCountryPricing } = await import('@/lib/services/countryPricingService');
            const gbPricing = await getCountryPricing('GB');
            amount = gbPricing?.planPrices.quarterly.price ? gbPricing.planPrices.quarterly.price * 100 : 0;
            currency = gbPricing?.currency || 'GBP'; // Use GB currency for Stripe
          }
        } else {
          const { getCountryPricing } = await import('@/lib/services/countryPricingService');
          const gbPricing = await getCountryPricing('GB');
          amount = gbPricing?.planPrices.quarterly.price ? gbPricing.planPrices.quarterly.price * 100 : 0;
          currency = gbPricing?.currency || 'GBP'; // Use GB currency for Stripe
        }
      }
    } else if (interval === 'yearly') {
      priceId = countryPricing?.stripePriceIds?.yearly || plan.stripePriceId_yearly;
      if (countryPricing) {
        amount = countryPricing.price * 100;
        currency = countryPricing.currency; // Use actual currency from CountryPricing
      } else {
        // Fallback to plan's defaultCountryPricingId
        const planDefaultPricingId = (plan as any).defaultCountryPricingId;
        if (planDefaultPricingId) {
          const { getCountryPricingById } = await import('@/lib/services/countryPricingService');
          const defaultPricing = await getCountryPricingById(planDefaultPricingId);
          if (defaultPricing) {
            amount = defaultPricing.planPrices.yearly.price * 100;
            currency = defaultPricing.currency; // Use actual currency for Stripe
          } else {
            const { getCountryPricing } = await import('@/lib/services/countryPricingService');
            const gbPricing = await getCountryPricing('GB');
            amount = gbPricing?.planPrices.yearly.price ? gbPricing.planPrices.yearly.price * 100 : 0;
            currency = gbPricing?.currency || 'GBP'; // Use GB currency for Stripe
          }
        } else {
          const { getCountryPricing } = await import('@/lib/services/countryPricingService');
          const gbPricing = await getCountryPricing('GB');
          amount = gbPricing?.planPrices.yearly.price ? gbPricing.planPrices.yearly.price * 100 : 0;
          currency = gbPricing?.currency || 'GBP'; // Use GB currency for Stripe
        }
      }
    }

    // Log for debugging
    console.log('Stripe pricing:', {
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

    // Validate Polar configuration before creating payment
    const secretKey = process.env.POLAR_ACCESS_TOKEN;

    if (!secretKey) {
      console.error('❌ Polar Payment Creation Failed (Pro Plan): POLAR_ACCESS_TOKEN is missing');
      console.error('   → This is the MOST COMMON issue on Vercel deployments');
      console.error('   → Check Vercel Dashboard → Project → Settings → Environment Variables');
      console.error('   → Ensure POLAR_ACCESS_TOKEN is set (without NEXT_PUBLIC_ prefix)');
      console.error('   → Redeploy after adding environment variables');
      return NextResponse.json({
        error: 'Polar is currently unavailable. Please contact support.',
        details: 'Server configuration error'
      }, { status: 500 });
    }

    try {
      if (!priceId) {
        throw new Error('No Polar Price ID found for the selected plan and interval');
      }

      const checkoutResponse = await PolarService.createCheckout({
        productPriceId: priceId,
        customerEmail: billingDetails.email || user.email,
        customerName: billingDetails.name || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        successUrl: `${returnUrl || process.env.NEXTAUTH_URL}/dashboard?success=true&session_id={CHECKOUT_SESSION_ID}`,
        metadata: {
          planKey: plan.key,
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

    } catch (error: any) {
      console.error('Polar Checkout Session error:', error);
      return NextResponse.json({
        error: error.message || 'Payment setup failed',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }, { status: 500 });
    }

  } else if (provider === 'razorpay') {
    // ENFORCE: Razorpay = INR only
    // Get India (IN) pricing explicitly - Razorpay ONLY supports INR
    let countryPricingRazorpay = await getCountryPricingForPlan('IN', planKey, interval as any);

    // Validate INR currency - Razorpay REQUIRES INR
    if (!countryPricingRazorpay || countryPricingRazorpay.currency !== 'INR') {
      console.error('Razorpay requires INR pricing but not found:', {
        hasPricing: !!countryPricingRazorpay,
        currency: countryPricingRazorpay?.currency,
        planKey,
        interval
      });
      throw new Error('INR pricing not available for Razorpay. Razorpay only supports INR currency.');
    }

    // Log coupon discount info for debugging
    console.log('Razorpay payment - Coupon discount check:', {
      hasCouponDiscount: !!couponDiscount,
      couponDiscount: couponDiscount ? {
        code: couponDiscount.code,
        type: couponDiscount.type,
        value: couponDiscount.value,
        id: couponDiscount.id
      } : null,
      planKey,
      interval
    });

    // Initialize amount and currency - ENFORCE INR
    let razorpayAmount: number;
    let razorpayCurrency: string = 'INR'; // ALWAYS INR for Razorpay

    // Razorpay MUST use INR pricing from India CountryPricing
    razorpayAmount = countryPricingRazorpay.price * 100; // Convert to paise
    razorpayCurrency = 'INR'; // Force INR (should already be INR from validation above)

    // Double-check currency is INR
    if (countryPricingRazorpay.currency !== 'INR') {
      throw new Error(`Razorpay requires INR but got: ${countryPricingRazorpay.currency}`);
    }

    // Log for debugging
    console.log('Razorpay pricing:', {
      interval,
      amount: razorpayAmount,
      currency: razorpayCurrency,
      countryPricingFound: !!countryPricingRazorpay,
      regionCode: regionInfo?.countryCode
    });

    // Validate amount
    if (!razorpayAmount || razorpayAmount <= 0) {
      console.error('Invalid amount for Razorpay - activating plan without payment:', razorpayAmount);
      return activatePlanWithCoupon({
        user,
        planKey,
        interval: interval as 'monthly' | 'quarterly' | 'yearly',
        regionInfo,
        currency: razorpayCurrency,
        couponDiscount,
        priceInMinorUnits: razorpayAmount || 0
      });
    }

    // Apply coupon discount BEFORE creating order
    const originalAmount = razorpayAmount;
    if (couponDiscount) {
      console.log('Applying coupon discount to Razorpay order:', {
        couponCode: couponDiscount.code,
        discountType: couponDiscount.type,
        discountValue: couponDiscount.value,
        originalAmount: razorpayAmount,
        originalAmountInINR: (razorpayAmount / 100).toFixed(2)
      });

      if (couponDiscount.type === 'percentage') {
        razorpayAmount = Math.round(razorpayAmount * (1 - couponDiscount.value / 100));
        console.log('Percentage discount applied:', {
          discountPercent: couponDiscount.value,
          discountedAmount: razorpayAmount,
          discountedAmountInINR: (razorpayAmount / 100).toFixed(2),
          savings: ((originalAmount - razorpayAmount) / 100).toFixed(2)
        });
      } else if (couponDiscount.type === 'fixed') {
        // Fixed discount: subtract from amount (discountValue is in INR, convert to paise)
        const discountInPaise = Math.round(couponDiscount.value * 100);
        razorpayAmount = Math.max(0, razorpayAmount - discountInPaise);
        console.log('Fixed discount applied:', {
          discountInINR: couponDiscount.value,
          discountInPaise: discountInPaise,
          discountedAmount: razorpayAmount,
          discountedAmountInINR: (razorpayAmount / 100).toFixed(2),
          savings: ((originalAmount - razorpayAmount) / 100).toFixed(2)
        });
      }
    } else {
      console.log('No coupon discount applied to Razorpay order');
    }

    // Get Razorpay instance
    const razorpayInstance = getRazorpay();
    if (!razorpayInstance) {
      return NextResponse.json({ error: 'Razorpay is not configured' }, { status: 500 });
    }

    // Validate RAZORPAY_KEY_ID is available
    if (!process.env.RAZORPAY_KEY_ID) {
      console.error('RAZORPAY_KEY_ID is not set');
      return NextResponse.json({ error: 'Razorpay key ID not configured' }, { status: 500 });
    }

    try {
      // Check if Razorpay plan ID exists for this interval (use subscription instead of order)
      const intervalMap: Record<string, 'monthly' | 'quarterly' | 'yearly'> = {
        'monthly': 'monthly',
        'quarterly': 'quarterly',
        'yearly': 'yearly'
      };

      const razorpayPlanId = countryPricingRazorpay?.razorpayPlanIds?.[intervalMap[interval]];

      if (razorpayPlanId) {
        // Create Razorpay subscription using plan ID
        console.log('Creating Razorpay subscription with plan ID:', {
          planId: razorpayPlanId,
          interval: interval,
          planKey: plan.key
        });

        // For recurring subscriptions, set total_count to maximum allowed (100)
        // Razorpay requires total_count when end_at is not present, max is 100
        const subscription = await razorpayInstance.subscriptions.create({
          plan_id: razorpayPlanId,
          total_count: 100, // Maximum allowed by Razorpay (100 billing cycles)
          customer_notify: 1,
          notes: {
            planKey: plan.key,
            userId: user._id.toString(),
            planId: plan._id.toString(),
            interval: interval,
            region: regionInfo?.countryCode || 'IN',
            couponCode: couponDiscount?.code || '',
            couponId: couponDiscount?.id || ''
          }
        });

        console.log('Razorpay subscription created successfully:', {
          subscriptionId: subscription.id,
          planId: razorpayPlanId,
          status: subscription.status
        });

        // Get subscription details to get the first invoice amount
        let subscriptionAmount = 0;
        let subscriptionCurrency = 'INR';

        try {
          // Fetch the subscription to get invoice details
          const subscriptionDetails = await razorpayInstance.subscriptions.fetch(subscription.id);

          // Get the first invoice for this subscription
          const invoices = await razorpayInstance.invoices.all({
            subscription_id: subscription.id,
            count: 1
          });

          if (invoices.items && invoices.items.length > 0) {
            const invoice = invoices.items[0];
            subscriptionAmount = invoice.amount || 0; // Amount in paise
            subscriptionCurrency = invoice.currency || 'INR';
          } else {
            // Fallback to plan amount if invoice not available yet
            subscriptionAmount = razorpayAmount;
            subscriptionCurrency = 'INR';
          }
        } catch (error) {
          console.warn('Could not fetch subscription invoice details, using plan amount:', error);
          subscriptionAmount = razorpayAmount;
          subscriptionCurrency = 'INR';
        }

        return NextResponse.json({
          provider: 'razorpay',
          subscription_id: subscription.id,
          plan_id: razorpayPlanId,
          amount: subscriptionAmount, // Amount in paise for display
          currency: subscriptionCurrency,
          key_id: process.env.RAZORPAY_KEY_ID,
          checkout: true, // Use Razorpay Checkout
          coupon: couponDiscount ? {
            code: couponDiscount.code,
            id: couponDiscount.id
          } : null,
          metadata: {
            planKey: plan.key,
            interval: interval,
            userId: user._id.toString()
          }
        });
      }

      // Fallback: Create Razorpay Order if plan ID not found
      console.log('Razorpay plan ID not found, falling back to order creation:', {
        interval: interval,
        availablePlanIds: countryPricingRazorpay?.razorpayPlanIds
      });

      // ENFORCE: Razorpay = INR only - strict validation
      // Razorpay expects uppercase 'INR' (not lowercase 'inr')
      const normalizedCurrency = razorpayCurrency.toUpperCase().trim();

      // Validate currency is exactly 'INR' (Razorpay ONLY supports INR)
      if (normalizedCurrency !== 'INR') {
        console.error('Razorpay currency validation failed:', {
          provided: razorpayCurrency,
          normalized: normalizedCurrency,
          expected: 'INR'
        });
        return NextResponse.json({
          error: `Razorpay only supports INR currency. Got: ${razorpayCurrency}. Please use Stripe for other currencies.`,
          unsupportedCurrency: true,
          providedCurrency: razorpayCurrency,
          suggestedProvider: 'stripe'
        }, { status: 400 });
      }

      // Ensure amount is a positive integer (Razorpay requires amount in smallest currency unit)
      // IMPORTANT: Use the discounted razorpayAmount (discount was applied above)
      const finalAmount = Math.round(razorpayAmount);

      // Final validation: Ensure we're using the discounted amount
      if (couponDiscount && finalAmount === originalAmount) {
        console.error('WARNING: Discount was not applied!', {
          originalAmount,
          finalAmount,
          couponDiscount: {
            code: couponDiscount.code,
            type: couponDiscount.type,
            value: couponDiscount.value
          }
        });
      }

      if (isNaN(finalAmount) || finalAmount <= 0) {
        console.error('Invalid amount for Razorpay order - activating plan without payment:', finalAmount);
        return activatePlanWithCoupon({
          user,
          planKey,
          interval: interval as 'monthly' | 'quarterly' | 'yearly',
          regionInfo,
          currency: razorpayCurrency,
          couponDiscount,
          priceInMinorUnits: isNaN(finalAmount) ? 0 : finalAmount
        });
      }

      // Razorpay minimum amount validation (minimum 1 INR = 100 paise)
      if (normalizedCurrency === 'INR' && finalAmount < 100) {
        console.error('Amount too small for Razorpay:', finalAmount);
        return NextResponse.json({ error: 'Amount must be at least ₹1.00' }, { status: 400 });
      }

      // Generate receipt (max 40 characters per Razorpay requirement)
      // Format: order_<shortUserId>_<timestamp>
      const shortUserId = user._id.toString().substring(0, 10); // Use first 10 chars of user ID
      const timestamp = Date.now().toString().slice(-8); // Use last 8 digits of timestamp
      const receipt = `ord_${shortUserId}_${timestamp}`.substring(0, 40); // Ensure max 40 chars

      // Ensure currency is exactly 'INR' - Razorpay is strict about this
      const finalCurrency = 'INR'; // Always use 'INR' for Razorpay

      console.log('Creating Razorpay order:', {
        amount: finalAmount,
        amountInINR: (finalAmount / 100).toFixed(2),
        originalAmount: originalAmount,
        originalAmountInINR: (originalAmount / 100).toFixed(2),
        discountApplied: !!couponDiscount,
        couponCode: couponDiscount?.code || null,
        discountType: couponDiscount?.type || null,
        discountValue: couponDiscount?.value || null,
        currency: finalCurrency,
        normalizedCurrency: normalizedCurrency,
        originalCurrency: razorpayCurrency,
        planKey: plan.key,
        interval: interval,
        receipt: receipt,
        currencyType: typeof finalCurrency,
        currencyLength: finalCurrency.length
      });

      // Create Razorpay Order for Checkout
      // Razorpay API requires exactly 'INR' (uppercase, 3 characters)
      const orderParams = {
        amount: finalAmount, // This should be the discounted amount
        currency: finalCurrency, // Hardcode to 'INR' to ensure it's correct
        receipt: receipt,
        notes: {
          planKey: plan.key,
          userId: user._id.toString(),
          planId: plan._id.toString(),
          interval: interval,
          region: regionInfo?.countryCode || 'IN',
          couponCode: couponDiscount?.code || '',
          couponId: couponDiscount?.id || ''
        }
      };

      console.log('Razorpay order params (FINAL - before creating order):', {
        amount: orderParams.amount,
        amountInINR: (orderParams.amount / 100).toFixed(2),
        originalAmount: originalAmount,
        originalAmountInINR: (originalAmount / 100).toFixed(2),
        discountApplied: !!couponDiscount,
        discountAmount: couponDiscount ? (originalAmount - finalAmount) : 0,
        discountAmountInINR: couponDiscount ? ((originalAmount - finalAmount) / 100).toFixed(2) : '0.00',
        currency: orderParams.currency,
        couponCode: couponDiscount?.code || null
      });
      console.log('Full order params JSON:', JSON.stringify(orderParams, null, 2));

      // Validate Razorpay configuration before creating order
      const keyId = process.env.RAZORPAY_KEY_ID;
      const keySecret = process.env.RAZORPAY_KEY_SECRET;

      if (!keySecret) {
        console.error('❌ Razorpay Order Creation Failed (Pro Plan): RAZORPAY_KEY_SECRET is missing');
        console.error('   → This is the MOST COMMON issue on Vercel deployments');
        console.error('   → Check Vercel Dashboard → Project → Settings → Environment Variables');
        console.error('   → Ensure RAZORPAY_KEY_SECRET is set (without NEXT_PUBLIC_ prefix)');
        console.error('   → Redeploy after adding environment variables');
        return NextResponse.json({
          error: 'Razorpay is currently unavailable. Please contact support.',
          details: 'Server configuration error'
        }, { status: 500 });
      }

      if (!keyId) {
        console.error('❌ Razorpay Order Creation Failed (Pro Plan): RAZORPAY_KEY_ID is missing');
        return NextResponse.json({
          error: 'Razorpay is currently unavailable. Please contact support.',
          details: 'Server configuration error'
        }, { status: 500 });
      }

      // Reuse razorpayInstance already declared above, but validate it exists
      if (!razorpayInstance) {
        console.error('❌ Razorpay instance initialization failed (Pro Plan)');
        return NextResponse.json({
          error: 'Razorpay is currently unavailable. Please contact support.',
          details: 'Server configuration error'
        }, { status: 500 });
      }

      let order;
      try {
        order = await razorpayInstance.orders.create(orderParams);
      } catch (orderError: any) {
        console.error('❌ Razorpay order creation failed (Pro Plan):', orderError);

        // Extract detailed error information
        if (orderError?.error) {
          const razorpayError = orderError.error;
          console.error('Razorpay API Error Details:', {
            code: razorpayError.code,
            description: razorpayError.description,
            field: razorpayError.field,
            source: razorpayError.source,
            step: razorpayError.step,
            reason: razorpayError.reason,
          });

          // Check for common errors
          if (razorpayError.description?.toLowerCase().includes('key') ||
            razorpayError.description?.toLowerCase().includes('secret')) {
            console.error('⚠️  This error suggests RAZORPAY_KEY_SECRET may be incorrect or missing');
            console.error('   → Verify the secret key in Vercel Environment Variables');
            console.error('   → Ensure it matches your Razorpay Dashboard (Test vs Live mode)');
          }
        }

        throw orderError; // Re-throw to be caught by outer catch block
      }

      // Verify the order was created with the correct amount
      console.log('Razorpay order created - verification:', {
        orderId: order.id,
        orderAmount: order.amount,
        orderAmountInINR: (order.amount / 100).toFixed(2),
        expectedAmount: finalAmount,
        expectedAmountInINR: (finalAmount / 100).toFixed(2),
        amountsMatch: order.amount === finalAmount
      });

      console.log('Razorpay order created successfully:', order.id);

      return NextResponse.json({
        provider: 'razorpay',
        order_id: order.id,
        amount: order.amount,
        currency: order.currency,
        key_id: process.env.RAZORPAY_KEY_ID,
        checkout: true, // Use Razorpay Checkout
        coupon: couponDiscount ? {
          code: couponDiscount.code,
          id: couponDiscount.id
        } : null,
        metadata: {
          planKey: plan.key,
          interval: interval,
          userId: user._id.toString()
        }
      });

    } catch (error: any) {
      console.error('Razorpay Order error:', error);
      console.error('Full error object:', JSON.stringify(error, null, 2));

      // Extract detailed error information from Razorpay API
      let errorMessage = 'Payment setup failed';
      let errorCode = null;
      let errorDescription = null;
      let errorField = null;
      let errorSource = null;
      let errorStep = null;
      let errorReason = null;

      if (error instanceof Error) {
        errorMessage = error.message;
        console.error('Error message:', errorMessage);
        console.error('Error stack:', error.stack);
      }

      // Razorpay SDK errors often have additional properties
      if (error?.error) {
        errorCode = error.error.code;
        errorDescription = error.error.description || error.error.message;
        errorField = error.error.field;
        errorSource = error.error.source;
        errorStep = error.error.step;
        errorReason = error.error.reason;

        console.error('Razorpay API error:', {
          code: errorCode,
          description: errorDescription,
          field: errorField,
          source: errorSource,
          step: errorStep,
          reason: errorReason,
          fullError: error.error
        });

        // Use Razorpay's error description if available, otherwise use code or message
        errorMessage = errorDescription || errorCode || errorMessage;

        // Check if it's a currency error
        if (errorField === 'currency' || errorDescription?.toLowerCase().includes('currency')) {
          console.error('Currency error detected. Check Razorpay account configuration for INR support.');
          errorMessage = `Currency error: ${errorDescription || 'INR currency may not be enabled in your Razorpay account. Please check your Razorpay dashboard settings and ensure your account supports INR transactions.'}`;
        }
      }

      // Log full error object for debugging
      try {
        console.error('Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
      } catch (e) {
        console.error('Could not stringify error object:', e);
      }

      return NextResponse.json({
        error: errorMessage,
        code: errorCode,
        details: process.env.NODE_ENV === 'development' ? {
          description: errorDescription,
          field: errorField,
          source: errorSource,
          step: errorStep,
          reason: errorReason
        } : undefined
      }, { status: 500 });
    }
  }

  return NextResponse.json({ error: 'Unsupported payment provider' }, { status: 400 });
}
