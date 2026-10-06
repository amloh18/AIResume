import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getConnection } from '@/lib/database';
import { getAdminPricingPlan } from '@/models/admin-models';
import User from '@/models/User';
import { getActivePaymentProvider, getActiveProviderName } from '@/lib/payment/paymentProvider';
import { detectUserRegion } from '@/lib/services/regionDetectionService';
import subscriptionService from '@/lib/services/subscriptionService';
import Coupon from '@/models/Coupon';
import DiscountCode from '@/models/DiscountCode';

type PaidPlanKey =
  | 'starter_monthly'
  | 'starter_yearly'
  | 'focused_monthly'
  | 'focused_yearly';

interface ZeroAmountActivationParams {
  user: any;
  planKey: PaidPlanKey;
  interval?: 'monthly' | 'quarterly' | 'yearly' | 'one-time';
  regionInfo?: any;
  currency?: string;
  couponDiscount?: any;
  priceInMinorUnits?: number;
  returnUrl?: string;
}

async function activatePlanWithCoupon({
  user,
  planKey,
  interval = 'monthly',
  regionInfo,
  currency = 'GBP',
  couponDiscount,
  priceInMinorUnits = 0,
  returnUrl
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

  const normalizedInterval: 'monthly' | 'quarterly' | 'yearly' | 'one-time' =
    interval === 'quarterly' ? 'quarterly' :
    interval === 'yearly' ? 'yearly' :
    interval === 'one-time' ? 'one-time' : 'monthly';

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

  const successRedirectUrl = constructSuccessUrl(
    returnUrl || `${process.env.NEXTAUTH_URL || ''}/dashboard`,
    { success: 'true', activated: 'true' }
  );

  return NextResponse.json({
    success: true,
    zero_amount: true,
    provider: couponDiscount ? 'coupon' : 'free',
    planKey: (updatedUser as any)?.currentPlanKey || planKey,
    subscription: (updatedUser as any)?.subscription || null,
    url: successRedirectUrl,
    redirect_url: successRedirectUrl,
    message: couponDiscount
      ? `Coupon ${couponDiscount.code} covered the full amount. Plan activated without payment.`
      : 'Plan activated successfully.',
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

    let body: any;
    try {
      body = await request.json();
    } catch (e) {
      console.warn('⚠️ Checkout session: Invalid or empty request body received.');
      return NextResponse.json({ error: 'Invalid or empty request body' }, { status: 400 });
    }

    if (!body) {
      return NextResponse.json({ error: 'Request body is required' }, { status: 400 });
    }

    console.log('Checkout session request body:', JSON.stringify(body, null, 2));

    const {
      planKey,
      interval,
      billingDetails,
      discountCode,
      couponCode,
      returnUrl
    } = body;

    if (!planKey) {
      return NextResponse.json({ error: 'Plan key is required' }, { status: 400 });
    }

    // Handle coupon/discount code
    let couponDiscount = null;
    const code = (couponCode || discountCode)?.toUpperCase();
    if (code) {
      const coupon = await Coupon.findOne({ code });
      if (coupon && coupon.isValid().valid) {
        couponDiscount = { code: coupon.code, type: coupon.type, value: coupon.discountValue || 0, id: coupon._id.toString() };
      } else {
        const discount = await DiscountCode.findOne({ code, isActive: true });
        if (discount && discount.isValid) {
          couponDiscount = { code: discount.code, type: discount.discountType, value: discount.discountValue || 0, id: discount._id.toString() };
        }
      }
    }

    const PricingPlan = await getAdminPricingPlan();
    const plan = await PricingPlan.findOne({ key: planKey, status: 'active' }).lean();

    if (!plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined;
    const regionInfo = await detectUserRegion(ip);

    if (planKey === 'free') {
      return NextResponse.json({ success: true, message: 'Free plan activated', planKey: 'free' });
    }

    const finalInterval = interval || (planKey.includes('monthly') ? 'monthly' : planKey.includes('yearly') ? 'yearly' : 'quarterly');

    return await handleProPlanPayment(plan, user, finalInterval, billingDetails, returnUrl, regionInfo, couponDiscount);

  } catch (error) {
    console.error('Checkout session error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
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
  const countryCode = regionInfo?.countryCode || 'US';

  // Analyze transition type (upgrade, downgrade, cross-cycle, none)
  const transition = subscriptionService.analyzeSubscriptionTransition(
    user.currentPlanKey || 'free',
    planKey,
    user.subscription?.interval,
    interval
  );

  if (transition.isDowngrade) {
    await User.findByIdAndUpdate(user._id, {
      $set: {
        'subscription.downgradeStatus': 'pending',
        'subscription.pendingDowngradePlanKey': planKey
      }
    });

    return NextResponse.json({
      success: true,
      downgrade_scheduled: true,
      planKey: planKey,
      message: `Your subscription has been scheduled to downgrade to ${plan.name} at the end of your current billing cycle.`
    });
  }

  // Calculate proration credit if upgrade/cross-cycle
  const prorationCredit = subscriptionService.calculateProrationCredit(
    user.subscription?.currentPeriodStart,
    user.subscription?.currentPeriodEnd,
    user.subscription?.purchasePrice
  );

  // Compute discount amount (provider-agnostic)
  let amount = 0;
  if (interval === 'monthly') amount = (plan.price_monthly || 0) * 100;
  else if (interval === 'yearly') amount = (plan.price_yearly || 0) * 100;
  else if (interval === 'quarterly') amount = (plan.price_quarterly || 0) * 100;
  else if (interval === 'one-time') amount = (plan.price_one_time || 0) * 100;

  // Apply regional pricing override if available
  const regionalPriceObj = plan.regionalPricing?.find((rp: any) =>
    rp.region?.toUpperCase() === countryCode.toUpperCase()
  ) || plan.regionalPricing?.find((rp: any) =>
    rp.region?.toUpperCase() === 'US'
  ) || plan.regionalPricing?.[0];

  if (regionalPriceObj && regionalPriceObj.price > 0) {
    amount = (regionalPriceObj.price * 100);
  }

  if (couponDiscount) {
    if (couponDiscount.type === 'percentage') amount = Math.round(amount * (1 - couponDiscount.value / 100));
    else if (couponDiscount.type === 'fixed') amount = Math.max(0, amount - (couponDiscount.value * 100));
  }

  if (amount <= 0) {
    return activatePlanWithCoupon({
      user,
      planKey,
      interval: interval as 'monthly' | 'quarterly' | 'yearly' | 'one-time',
      regionInfo,
      currency: regionalPriceObj?.currency || 'USD',
      couponDiscount,
      priceInMinorUnits: amount,
      returnUrl
    });
  }

  // Get active payment provider and create checkout
  try {
    const activeProvider = await getActivePaymentProvider();
    const activeProviderName = await getActiveProviderName();

    const successUrl = constructSuccessUrl(
      returnUrl || `${process.env.NEXTAUTH_URL || ''}/dashboard`,
      { success: 'true', session_id: '{CHECKOUT_SESSION_ID}' }
    );

    const cancelUrl = constructSuccessUrl(
      returnUrl || `${process.env.NEXTAUTH_URL || ''}/dashboard/settings?tab=billing`,
      { cancelled: 'true' }
    );

    const result = await activeProvider.createCheckoutSession({
      planKey,
      billingCycle: interval as any,
      userId: user._id.toString(),
      userEmail: billingDetails?.email || user.email,
      userName: billingDetails?.name || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      successUrl,
      cancelUrl,
      couponCode: couponDiscount?.code,
      metadata: {
        planId: plan._id.toString(),
        region: countryCode,
        prorationCreditApplied: prorationCredit.toString(),
        transitionType: transition.type,
      },
    });

    if (!result.success || !result.url) {
      throw new Error(result.error || 'Failed to create checkout session');
    }

    return NextResponse.json({
      provider: activeProviderName,
      redirect_url: result.url,
      url: result.url,
    });

  } catch (error) {
    console.error('Checkout Session error:', error);
    return NextResponse.json({ error: 'Payment setup failed' }, { status: 500 });
  }
}

// Helper to construct success URLs by safely appending query parameters without malforming paths
function constructSuccessUrl(base: string, params: Record<string, string>): string {
  try {
    const isRelative = !base.startsWith('http://') && !base.startsWith('https://');
    const url = new URL(base, isRelative ? 'http://localhost' : undefined);

    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }

    return isRelative ? `${url.pathname}${url.search}${url.hash}` : url.toString();
  } catch (e) {
    const separator = base.includes('?') ? '&' : '?';
    const queryStr = Object.entries(params)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&');
    return `${base}${separator}${queryStr}`;
  }
}
