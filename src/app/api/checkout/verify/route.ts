import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import { getConnection } from '@/lib/database';
import { User } from '@/models';
import PolarService from '@/lib/payment/polar';
import { getAdminPricingPlan } from '@/models/admin-models';
import subscriptionService from '@/lib/services/subscriptionService';

export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedUser(request);
    if (!authResult) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const checkoutId = searchParams.get('checkout_id') || searchParams.get('session_id');

    if (!checkoutId) {
      return NextResponse.json({ success: false, error: 'Checkout ID is required' }, { status: 400 });
    }

    await getConnection();
    const user = await User.findOne({ email: authResult.userEmail });
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    // Call Polar API to verify checkout status
    const checkoutRes = await PolarService.getCheckout(checkoutId);
    if (!checkoutRes.success || !checkoutRes.checkout) {
      return NextResponse.json({ success: false, error: 'Checkout session not found on Polar' }, { status: 404 });
    }

    const checkout = checkoutRes.checkout as any;
    console.log(`🔍 Verification Endpoint - Polar Checkout status for ${checkoutId}:`, checkout.status);

    if (checkout.status !== 'succeeded' && checkout.status !== 'confirmed') {
      return NextResponse.json({
        success: false,
        status: checkout.status,
        message: 'Checkout has not succeeded yet'
      });
    }

    // Map checkout to pricing plan using correct Polar field names
    const productId: string | null = checkout.productId ?? checkout.product?.id ?? null;
    const priceId: string | null = checkout.productPriceId ?? checkout.productPrice?.id ?? null;
    const PricingPlan = await getAdminPricingPlan();
    
    const plan = await PricingPlan.findOne({
      $or: [
        ...(productId ? [
          { polarProductId_monthly: productId },
          { polarProductId_yearly: productId },
          { polarProductId_quarterly: productId },
          { polarProductId_one_time: productId },
          { 'regionalPricing.polarProductId': productId }
        ] : []),
        ...(priceId ? [
          { polarPriceId_monthly: priceId },
          { polarPriceId_yearly: priceId },
          { polarPriceId_quarterly: priceId },
          { polarPriceId_one_time: priceId },
          { 'regionalPricing.polarPriceId': priceId }
        ] : [])
      ]
    });

    if (!productId && !priceId) {
      console.error('[POLAR VERIFY] No productId or priceId in checkout - cannot map plan:', checkoutId);
      return NextResponse.json({ success: false, error: 'Cannot determine plan from checkout - missing product/price IDs' }, { status: 422 });
    }

    console.log(`[POLAR VERIFY] Plan lookup: productId=${productId} priceId=${priceId}`);

    if (!plan) {
      // CRITICAL: Do NOT silently fall back to starter_monthly.
      // Log unmapped IDs so admin can fix PricingPlan product ID mapping.
      console.error(
        `[POLAR VERIFY] ⚠️ PLAN MAPPING FAILURE for checkout ${checkoutId}: ` +
        `productId=${productId} priceId=${priceId} matched no PricingPlan document. ` +
        'Fix: ensure PricingPlan docs have correct polarProductId_* / polarPriceId_* fields.'
      );
      return NextResponse.json({
        success: false,
        error: `Plan mapping failed. Payment was successful on Polar but internal plan could not be resolved for productId=${productId}. Please contact support.`
      }, { status: 422 });
    }

    const planKey = plan.key;
    const metadata: Record<string, any> = checkout.metadata || {};
    const interval = metadata.interval || 'monthly';
    const amount = (checkout.amount || 0) / 100;
    const currency = checkout.currency || 'USD';

    // Synchronously activate the subscription only if not already active
    const existingActive = user.subscription &&
      (user.subscription.status === 'active' || user.subscription.status === 'trialing') &&
      user.currentPlanKey !== 'free';

    if (!existingActive) {
      console.log(`✅ Verification Endpoint - Activating plan ${planKey} synchronously for ${user.email}`);
      
      // Use subscriptionId (correct Polar field name)
      let actualSubscriptionId: string | null = checkout.subscriptionId ?? null;
      if (!actualSubscriptionId) {
        try {
          const polar = (PolarService as any).getPolar();
          if (polar) {
            const polarSubscriptions = await polar.subscriptions.list({
              customerEmail: user.email,
              limit: 5
            });
            const activeSub = (polarSubscriptions.items || []).find(
              (s: any) => s.status === 'active' || s.status === 'trialing'
            );
            if (activeSub) {
              actualSubscriptionId = activeSub.id;
            }
          }
        } catch (err) {
          console.error('Failed to query actual Polar subscription ID in verify route:', err);
        }
      }
      actualSubscriptionId = actualSubscriptionId || checkoutId;

      await subscriptionService.createSubscription(
        user._id,
        plan ? plan._id : null,
        interval as 'monthly' | 'quarterly' | 'yearly' | 'one-time',
        amount,
        currency.toUpperCase(),
        'polar',
        actualSubscriptionId,
        null,
        0,
        {
          polarCustomerId: checkout.customerId ?? null,
          region: metadata.region
        }
      );
    }

    return NextResponse.json({
      success: true,
      status: checkout.status,
      planKey
    });
  } catch (error) {
    console.error('Checkout verification endpoint error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
