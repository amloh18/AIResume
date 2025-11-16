import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getConnection } from '@/lib/database';
import { getAdminPricingPlan } from '@/models/admin-models';
import User from '@/models/User';
import { stripe } from '@/lib/payment/stripe';
import { razorpay } from '@/lib/payment/razorpay';
import { detectUserRegion } from '@/lib/services/regionDetectionService';
import { getPricingForPlan } from '@/lib/services/countryPricingService';

// Helper to get country pricing for a plan using CountryPricing collection
// Returns full CountryPricing data including stripePriceIds and razorpayPlanIds
async function getCountryPricingForPlan(
  countryCode: string,
  planKey: 'free' | 'day_pass' | 'pro_monthly' | 'pro_quarterly' | 'pro_yearly',
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
      const cycleToPlanKey: Record<string, 'free' | 'day_pass' | 'pro_monthly' | 'pro_quarterly' | 'pro_yearly'> = {
        'monthly': 'pro_monthly',
        'quarterly': 'pro_quarterly',
        'yearly': 'pro_yearly',
        'one-time': 'day_pass'
      };
      finalPlanKey = cycleToPlanKey[billingCycle] || 'pro_monthly';
    }

    // Get full CountryPricing data (not just the plan-specific pricing)
    const { getCountryPricing } = await import('@/lib/services/countryPricingService');
    const countryPricing = await getCountryPricing(countryCode);
    
    if (!countryPricing) {
      console.log('No country pricing found:', {
        countryCode,
        planKey: finalPlanKey
      });
      return null;
    }

    // Map planKey to planPrices key
    const planKeyMap: Record<string, keyof typeof countryPricing.planPrices> = {
      'free': 'free',
      'day_pass': 'dayPass',
      'pro_monthly': 'monthly',
      'pro_quarterly': 'quarterly',
      'pro_yearly': 'yearly'
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
    
    // Handle coupon/discount code
    let couponDiscount = null;
    if (couponCode || discountCode) {
      const code = (couponCode || discountCode).toUpperCase();
      const coupon = await Coupon.findOne({ code });
      
      if (coupon) {
        const validation = coupon.isValid();
        if (validation.valid) {
          // Check if coupon applies to this plan
          const isApplicable = 
            (!coupon.applicablePlanKeys || coupon.applicablePlanKeys.length === 0 || coupon.applicablePlanKeys.includes(planKey)) &&
            (!coupon.applicablePlans || coupon.applicablePlans.length === 0 || coupon.applicablePlans.includes(planKey));
          
          if (isApplicable) {
            couponDiscount = {
              code: coupon.code,
              type: coupon.type,
              value: coupon.discountValue || 0,
              id: coupon._id.toString()
            };
          }
        }
      }
    }

    // Validate plan key
    const validPlanKeys = ['free', 'day_pass', 'pro_monthly', 'pro_quarterly', 'pro_yearly'];
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
    const userCountryPricing = await getCountryPricingForPlan(
      regionInfo.countryCode, 
      planKey as any, 
      interval as any
    );
    
    // Determine currency from region-based CountryPricing
    // Priority: 1. User's country pricing, 2. Region info, 3. Default (GBP)
    const detectedCurrency = userCountryPricing?.currency?.toUpperCase() 
      || regionInfo?.currency?.toUpperCase() 
      || 'GBP';
    
    console.log('Region and currency detection:', {
      countryCode: regionInfo.countryCode,
      countryName: regionInfo.countryName,
      detectedCurrency,
      hasCountryPricing: !!userCountryPricing,
      regionPaymentPartner: regionInfo.paymentPartner
    });
    
    // ENFORCE: Razorpay = INR only, Stripe = all other currencies
    // Determine payment provider based on currency (not just region)
    let paymentProvider = provider;
    
    if (!paymentProvider) {
      // Auto-select provider based on currency
      if (detectedCurrency === 'INR') {
        paymentProvider = 'razorpay';
      } else {
        paymentProvider = 'stripe';
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
        
        // Force switch to Stripe for non-INR currencies
        if (!stripe) {
          return NextResponse.json({ 
            error: 'Razorpay only supports INR currency. Stripe is required for other currencies but is not configured.',
            unsupportedCurrency: true,
            detectedCurrency,
            requiresStripe: true,
            requiresConfiguration: true
          }, { status: 400 });
        }
        paymentProvider = 'stripe';
      }
      
      // Additional validation: Ensure we have INR pricing
      if (!userCountryPricing || userCountryPricing.currency !== 'INR') {
        // Try to get India pricing explicitly
        const indiaPricing = await getCountryPricingForPlan('IN', planKey as any, interval as any);
        if (!indiaPricing || indiaPricing.currency !== 'INR') {
          console.warn('No INR pricing found for Razorpay, switching to Stripe');
          if (!stripe) {
            return NextResponse.json({ 
              error: 'INR pricing not available. Stripe is required but not configured.',
              requiresStripe: true,
              requiresConfiguration: true
            }, { status: 400 });
          }
          paymentProvider = 'stripe';
        }
      }
    }
    
    // VALIDATION: Ensure Stripe is available for non-INR currencies
    if (paymentProvider === 'stripe' && !stripe) {
      return NextResponse.json({ 
        error: 'Stripe is not configured. Please add STRIPE_SECRET_KEY to your .env.local file.',
        requiresConfiguration: true,
        provider: 'stripe',
        detectedCurrency
      }, { status: 500 });
    }
    
    console.log('Final provider selection:', {
      provider: paymentProvider,
      currency: detectedCurrency,
      countryCode: regionInfo.countryCode,
      reason: paymentProvider === 'razorpay' ? 'INR currency' : 'Non-INR currency or explicit Stripe selection'
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

async function handleDayPassPayment(
  plan: any, 
  user: any, 
  billingDetails: any, 
  provider: string,
  regionInfo: any,
  couponDiscount?: any
) {
  // ENFORCE: Razorpay = INR only, get India pricing explicitly
  // Stripe = use region-based pricing
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
    // Stripe: Use region-based pricing (supports all currencies)
    countryPricing = await getCountryPricingForPlan(
      regionInfo?.countryCode || 'GB', 
      'day_pass', 
      'one-time'
    );
  }
  
  // All prices MUST come from CountryPricing - no legacy fallbacks
  let amount: number;
  let currency: string;
  
  if (countryPricing) {
    amount = countryPricing.price * 100; // Convert to cents/paisa
    // ENFORCE: Razorpay = INR only, Stripe = actual currency from CountryPricing
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
          // ENFORCE: Razorpay = INR only (must get India pricing), Stripe = GB currency
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
        // Stripe: Use GB as fallback
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
  
  // Apply coupon discount
  if (couponDiscount && couponDiscount.type === 'percentage') {
    amount = Math.round(amount * (1 - couponDiscount.value / 100));
  } else if (couponDiscount && couponDiscount.type === 'fixed') {
    amount = Math.max(0, amount - (couponDiscount.value * 100));
  }

  if (provider === 'stripe') {
    if (!stripe) {
      return NextResponse.json({ error: 'Stripe is not configured' }, { status: 500 });
    }
    try {
      // Use Stripe price ID from plan or country pricing
      const stripePriceId = countryPricing?.stripePriceIds?.dayPass || plan.stripePriceId_one_time;
      
      if (stripePriceId) {
        // Use existing Stripe price
        const session = await stripe.checkout.sessions.create({
          customer: user.subscription?.providerCustomerId || undefined,
          payment_method_types: ['card'],
          line_items: [{
            price: stripePriceId,
            quantity: 1,
          }],
          mode: 'payment', // One-time payment
          success_url: `${process.env.NEXTAUTH_URL || ''}/dashboard?success=true&session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${process.env.NEXTAUTH_URL || ''}/dashboard/settings?canceled=true`,
          metadata: {
            planKey: plan.key,
            userId: user._id.toString(),
            planId: plan._id.toString(),
            type: 'day_pass',
            region: regionInfo.countryCode
          }
        });

        return NextResponse.json({
          provider: 'stripe',
          redirect_url: session.url
        });
      }

      // Fallback: Create PaymentIntent for one-time payment
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount),
        currency: currency.toLowerCase(),
        metadata: {
          planKey: plan.key,
          userId: user._id.toString(),
          planId: plan._id.toString(),
          type: 'day_pass',
          region: regionInfo.countryCode
        },
        customer: user.subscription?.providerCustomerId || undefined,
        description: `Day Pass - ${plan.name}`,
        receipt_email: billingDetails.email || user.email
      });

      return NextResponse.json({
        provider: 'stripe',
        client_secret: paymentIntent.client_secret,
        payment_intent_id: paymentIntent.id
      });

    } catch (error: any) {
      console.error('Stripe PaymentIntent error:', error);
      
      // Extract detailed error information from Stripe API
      let errorMessage = 'Payment setup failed';
      let errorCode = null;
      let errorType = null;
      
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      // Stripe errors have a specific structure
      if (error?.type) {
        errorType = error.type;
        errorCode = error.code;
        errorMessage = error.message || errorMessage;
        
        console.error('Stripe API error:', {
          type: errorType,
          code: errorCode,
          message: errorMessage,
          param: error.param,
          decline_code: error.decline_code
        });
      }
      
      return NextResponse.json({ 
        error: errorMessage,
        code: errorCode || errorType,
        details: process.env.NODE_ENV === 'development' ? {
          type: errorType,
          code: errorCode,
          param: error?.param,
          decline_code: error?.decline_code
        } : undefined
      }, { status: 500 });
    }

  } else if (provider === 'razorpay') {
    if (!razorpay) {
      return NextResponse.json({ error: 'Razorpay is not configured' }, { status: 500 });
    }
    try {
      // Use country-specific Razorpay plan ID if available, otherwise create order
      const razorpayPlanId = countryPricing?.razorpayPlanIds?.dayPass;
      
      if (razorpayPlanId) {
        // Create Razorpay subscription for one-time payment (total_count: 1)
        const subscription = await razorpay.subscriptions.create({
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

        return NextResponse.json({
          provider: 'razorpay',
          subscription_id: subscription.id,
          plan_id: razorpayPlanId
        });
      }

      // Fallback: Create Razorpay Order for one-time payment
      // ENFORCE: Razorpay = INR only - strict validation
      const validCurrency = currency.toLowerCase().trim();
      const finalAmount = Math.round(amount);
      
      // Validate currency is exactly 'inr' (Razorpay ONLY supports INR)
      if (validCurrency !== 'inr') {
        console.error('Razorpay currency validation failed (day pass):', {
          provided: currency,
          normalized: validCurrency,
          expected: 'inr'
        });
        return NextResponse.json({ 
          error: `Razorpay only supports INR currency. Got: ${currency.toUpperCase()}. Please use Stripe for other currencies.`,
          unsupportedCurrency: true,
          providedCurrency: currency,
          suggestedProvider: 'stripe'
        }, { status: 400 });
      }
      
      // Razorpay minimum amount validation
      if (validCurrency === 'inr' && finalAmount < 100) {
        console.error('Amount too small for Razorpay:', finalAmount);
        return NextResponse.json({ error: 'Amount must be at least ₹1.00' }, { status: 400 });
      }
      
      // Generate receipt (max 40 characters per Razorpay requirement)
      const shortUserId = user._id.toString().substring(0, 10);
      const timestamp = Date.now().toString().slice(-8);
      const receipt = `dp_${shortUserId}_${timestamp}`.substring(0, 40);
      
      console.log('Creating Razorpay order (day pass):', { 
        amount: finalAmount, 
        currency: validCurrency,
        originalCurrency: currency,
        receipt: receipt
      });
      
      const order = await razorpay.orders.create({
        amount: finalAmount,
        currency: validCurrency,
        receipt: receipt,
        notes: {
          planKey: plan.key,
          userId: user._id.toString(),
          planId: plan._id.toString(),
          type: 'day_pass',
          region: regionInfo.countryCode
        }
      });

      return NextResponse.json({
        provider: 'razorpay',
        order_id: order.id,
        amount: order.amount,
        currency: order.currency,
        key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        checkout: true, // Use Razorpay Checkout
        coupon: couponDiscount ? {
          code: couponDiscount.code,
          id: couponDiscount.id
        } : null
      });

    } catch (error: any) {
      console.error('Razorpay Order error (day pass):', error);
      
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
          reason: errorReason
        });
        
        // Use Razorpay's error description if available
        errorMessage = errorDescription || errorMessage;
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
  const intervalToPlanKey: Record<string, 'pro_monthly' | 'pro_quarterly' | 'pro_yearly'> = {
    'monthly': 'pro_monthly',
    'quarterly': 'pro_quarterly',
    'yearly': 'pro_yearly'
  };
  const planKey = intervalToPlanKey[interval] || 'pro_monthly';
  
  // Get country pricing from CountryPricing collection
  const countryPricing = await getCountryPricingForPlan(regionInfo?.countryCode || 'US', planKey, interval as any);
  
  // Determine the correct price based on interval - use CountryPricing collection
  let priceId: string | undefined;
  // Initialize with defaults - will be set from CountryPricing or plan fallback
  let amount: number = 0;
  let currency: string = 'USD';
  let paymentMode: 'payment' | 'subscription' = 'subscription'; // Default to subscription
  
  // Monthly = recurring subscription, Quarterly/Yearly = one-time payment
  if (interval === 'quarterly' || interval === 'yearly') {
    paymentMode = 'payment'; // One-time payment
  }

  if (provider === 'stripe') {
    // Stripe: Use country pricing from CountryPricing collection (supports all currencies)
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

    if (!stripe) {
      return NextResponse.json({ error: 'Stripe is not configured' }, { status: 500 });
    }
    try {
      // Create or get Stripe customer
      let customerId = user.subscription?.providerCustomerId;
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          name: billingDetails.name || `${user.firstName} ${user.lastName}`,
          metadata: {
            userId: user._id.toString()
          }
        });
        customerId = customer.id;
        
        // Update user with customer ID
        await User.findByIdAndUpdate(user._id, {
          'subscription.providerCustomerId': customerId
        });
      }

      // For one-time payments (quarterly/yearly), use line_items with amount to ensure correct currency
      // For subscriptions (monthly), use priceId if available, otherwise use line_items with amount
      const sessionConfig: any = {
        customer: customerId,
        payment_method_types: ['card'],
        mode: paymentMode,
        success_url: `${returnUrl || process.env.NEXTAUTH_URL}/dashboard?success=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${returnUrl || process.env.NEXTAUTH_URL}/dashboard/settings?canceled=true`,
        metadata: {
          planKey: plan.key,
          userId: user._id.toString(),
          planId: plan._id.toString(),
          interval: interval,
          region: regionInfo?.countryCode || 'US',
          couponCode: couponDiscount?.code || '',
          couponId: couponDiscount?.id || ''
        }
      };

      // For one-time payments (quarterly/yearly), use amount directly to ensure correct currency
      if (paymentMode === 'payment') {
        sessionConfig.line_items = [
          {
            price_data: {
              currency: currency.toLowerCase(),
              product_data: {
                name: `${plan.name} - ${interval === 'quarterly' ? '90 days' : '365 days'}`,
                description: interval === 'quarterly' 
                  ? 'Quarterly plan - 90 days access charged together'
                  : 'Yearly plan - 365 days access charged together'
              },
              unit_amount: amount, // Already in cents
            },
            quantity: 1,
          },
        ];
      } else {
        // For subscriptions (monthly), try to use priceId if available and currency matches
        // Otherwise use price_data to ensure correct currency
        if (priceId) {
          // Check if we can use the priceId (only if currency matches)
          // For now, use price_data to ensure correct regional currency
          sessionConfig.line_items = [
            {
              price_data: {
                currency: currency.toLowerCase(),
                product_data: {
                  name: `${plan.name} - Monthly`,
                  description: 'Monthly subscription plan'
                },
                recurring: {
                  interval: 'month',
                },
                unit_amount: amount, // Already in cents
              },
              quantity: 1,
            },
          ];
        } else {
          sessionConfig.line_items = [
            {
              price_data: {
                currency: currency.toLowerCase(),
                product_data: {
                  name: `${plan.name} - Monthly`,
                  description: 'Monthly subscription plan'
                },
                recurring: {
                  interval: 'month',
                },
                unit_amount: amount, // Already in cents
              },
              quantity: 1,
            },
          ];
        }
      }

      // For subscriptions (monthly), add subscription_data
      if (paymentMode === 'subscription') {
        sessionConfig.subscription_data = {
          metadata: {
            planKey: plan.key,
            userId: user._id.toString(),
            planId: plan._id.toString(),
            interval: interval,
            region: regionInfo?.countryCode || 'US'
          }
        };
      }

      const session = await stripe.checkout.sessions.create(sessionConfig);

      return NextResponse.json({
        provider: 'stripe',
        redirect_url: session.url
      });

    } catch (error: any) {
      console.error('Stripe Checkout Session error:', error);
      
      // Extract detailed error information from Stripe API
      let errorMessage = 'Payment setup failed';
      let errorCode = null;
      let errorType = null;
      
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      // Stripe errors have a specific structure
      if (error?.type) {
        errorType = error.type;
        errorCode = error.code;
        errorMessage = error.message || errorMessage;
        
        console.error('Stripe API error:', {
          type: errorType,
          code: errorCode,
          message: errorMessage,
          param: error.param,
          decline_code: error.decline_code
        });
      }
      
      return NextResponse.json({ 
        error: errorMessage,
        code: errorCode || errorType,
        details: process.env.NODE_ENV === 'development' ? {
          type: errorType,
          code: errorCode,
          param: error?.param,
          decline_code: error?.decline_code
        } : undefined
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
      console.error('Invalid amount for Razorpay:', razorpayAmount);
      return NextResponse.json({ error: 'Invalid payment amount' }, { status: 400 });
    }
    
    // Apply coupon discount
    if (couponDiscount) {
      if (couponDiscount.type === 'percentage') {
        razorpayAmount = Math.round(razorpayAmount * (1 - couponDiscount.value / 100));
      } else if (couponDiscount.type === 'fixed') {
        razorpayAmount = Math.max(0, razorpayAmount - (couponDiscount.value * 100));
      }
    }

    if (!razorpay) {
      return NextResponse.json({ error: 'Razorpay is not configured' }, { status: 500 });
    }

    // Validate NEXT_PUBLIC_RAZORPAY_KEY_ID is available
    if (!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID) {
      console.error('NEXT_PUBLIC_RAZORPAY_KEY_ID is not set');
      return NextResponse.json({ error: 'Razorpay key ID not configured' }, { status: 500 });
    }

    try {
      // ENFORCE: Razorpay = INR only - strict validation
      const validCurrency = razorpayCurrency.toLowerCase().trim();
      
      // Validate currency is exactly 'inr' (Razorpay ONLY supports INR)
      if (validCurrency !== 'inr') {
        console.error('Razorpay currency validation failed:', {
          provided: razorpayCurrency,
          normalized: validCurrency,
          expected: 'inr'
        });
        return NextResponse.json({ 
          error: `Razorpay only supports INR currency. Got: ${razorpayCurrency.toUpperCase()}. Please use Stripe for other currencies.`,
          unsupportedCurrency: true,
          providedCurrency: razorpayCurrency,
          suggestedProvider: 'stripe'
        }, { status: 400 });
      }
      
      // Ensure amount is a positive integer (Razorpay requires amount in smallest currency unit)
      const finalAmount = Math.round(razorpayAmount);
      if (isNaN(finalAmount) || finalAmount <= 0) {
        console.error('Invalid amount for Razorpay order:', finalAmount);
        return NextResponse.json({ error: 'Invalid payment amount' }, { status: 400 });
      }
      
      // Razorpay minimum amount validation (minimum 1 INR = 100 paise)
      if (validCurrency === 'inr' && finalAmount < 100) {
        console.error('Amount too small for Razorpay:', finalAmount);
        return NextResponse.json({ error: 'Amount must be at least ₹1.00' }, { status: 400 });
      }
      
      // Generate receipt (max 40 characters per Razorpay requirement)
      // Format: order_<shortUserId>_<timestamp>
      const shortUserId = user._id.toString().substring(0, 10); // Use first 10 chars of user ID
      const timestamp = Date.now().toString().slice(-8); // Use last 8 digits of timestamp
      const receipt = `ord_${shortUserId}_${timestamp}`.substring(0, 40); // Ensure max 40 chars
      
      console.log('Creating Razorpay order:', { 
        amount: finalAmount, 
        currency: validCurrency, 
        planKey: plan.key,
        interval: interval,
        originalCurrency: razorpayCurrency,
        receipt: receipt
      });
      
      // Create Razorpay Order for Checkout
      const order = await razorpay.orders.create({
        amount: finalAmount,
        currency: validCurrency,
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
      });
      
      console.log('Razorpay order created successfully:', order.id);

      return NextResponse.json({
        provider: 'razorpay',
        order_id: order.id,
        amount: order.amount,
        currency: order.currency,
        key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
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
      
      // Extract detailed error information from Razorpay API
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
          reason: errorReason
        });
        
        // Use Razorpay's error description if available, otherwise use code or message
        errorMessage = errorDescription || errorCode || errorMessage;
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
