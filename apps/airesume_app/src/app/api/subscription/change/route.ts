import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getConnection } from '@/lib/database';
import { User } from '@/models';
import Stripe from 'stripe';
import {
  resolveStripePrice,
  detectRegion,
  type PlanKey,
  type BillingInterval,
  type Region,
} from '@/lib/billing/stripe-price-map';

/**
 * POST /api/subscription/change
 *
 * Secure subscription upgrade/downgrade endpoint.
 * Resolves target plan and currency server-side.
 * Never accepts arbitrary price IDs from the frontend.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    await getConnection();

    const body = await request.json();
    const { targetPlan, targetInterval } = body;

    // Validate inputs
    const validPlans = ['starter', 'focused'];
    const validIntervals = ['monthly', 'yearly'];
    if (!validPlans.includes(targetPlan) || !validIntervals.includes(targetInterval)) {
      return NextResponse.json(
        { success: false, error: 'Invalid target plan or interval' },
        { status: 400 }
      );
    }

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Must have an existing subscription to change
    if (!user.subscription?.providerSubscriptionId) {
      return NextResponse.json(
        { success: false, error: 'No active subscription found. Please subscribe first.' },
        { status: 400 }
      );
    }

    // Must be on Stripe
    if (user.subscription.provider !== 'stripe') {
      return NextResponse.json(
        { success: false, error: 'Subscription changes are only supported for Stripe subscriptions.' },
        { status: 400 }
      );
    }

    // Must have a valid subscription status
    const validStatuses = ['active', 'trialing'];
    if (!validStatuses.includes(user.subscription.status || '')) {
      return NextResponse.json(
        { success: false, error: `Cannot change subscription with status: ${user.subscription.status}` },
        { status: 400 }
      );
    }

    // Resolve region from existing subscription
    const region: Region = (user.subscription.purchaseRegion as Region) || 'ROW';

    // Resolve target price server-side
    const targetPrice = resolveStripePrice(targetPlan as PlanKey, targetInterval as BillingInterval, region);
    if (!targetPrice) {
      return NextResponse.json(
        { success: false, error: `No price found for ${targetPlan} ${targetInterval} in ${region}` },
        { status: 400 }
      );
    }

    // Get the current subscription's price for comparison
    const currentPrice = resolveStripePrice(
      (user.subscription.planKey || 'free').split('_')[0] as PlanKey,
      (user.subscription.interval as BillingInterval) || 'monthly',
      region
    );

    // Determine if this is an upgrade or downgrade
    const currentPriceAmount = currentPrice?.amount || 0;
    const isUpgrade = targetPrice.amount > currentPriceAmount;

    // Initialize Stripe
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      return NextResponse.json(
        { success: false, error: 'Stripe is not configured' },
        { status: 500 }
      );
    }

    const stripe = new Stripe(secretKey, {
      apiVersion: '2024-12-18.acacia' as any,
    });

    // Retrieve the current subscription
    let subscription: Stripe.Subscription;
    try {
      subscription = await stripe.subscriptions.retrieve(user.subscription.providerSubscriptionId);
    } catch (error: any) {
      return NextResponse.json(
        { success: false, error: `Could not retrieve subscription: ${error.message}` },
        { status: 400 }
      );
    }

    if (!subscription.items.data.length) {
      return NextResponse.json(
        { success: false, error: 'Subscription has no items' },
        { status: 400 }
      );
    }

    const currentItemId = subscription.items.data[0].id;

    // Update the subscription with the new price
    // Use safe proration behavior
    let updatedSubscription: Stripe.Subscription;
    try {
      updatedSubscription = await stripe.subscriptions.update(subscription.id, {
        items: [
          {
            id: currentItemId,
            price: targetPrice.priceId,
          },
        ],
        proration_behavior: 'create_prorations',
        metadata: {
          ...subscription.metadata,
          planKey: targetPlan,
          billingInterval: targetInterval,
          region,
          changedAt: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      console.error('[Subscription] Change failed:', error.message);
      return NextResponse.json(
        { success: false, error: `Subscription update failed: ${error.message}` },
        { status: 400 }
      );
    }

    // Track the change
    try {
      const { getPostHogClient } = await import('@/lib/posthog-server');
      const posthog = getPostHogClient();
      posthog.capture({
        distinctId: user._id.toString(),
        event: isUpgrade ? 'subscription_upgraded' : 'subscription_downgraded',
        properties: {
          from_plan: user.subscription.planKey,
          to_plan: `${targetPlan}_${targetInterval}`,
          from_price: currentPriceAmount,
          to_price: targetPrice.amount,
          region,
        },
      });
    } catch (phError) {
      console.error('PostHog capture error:', phError);
    }

    return NextResponse.json({
      success: true,
      subscriptionId: updatedSubscription.id,
      status: updatedSubscription.status,
      currentPeriodEnd: (updatedSubscription as any).current_period_end
        ? new Date((updatedSubscription as any).current_period_end * 1000).toISOString()
        : null,
      changeType: isUpgrade ? 'upgrade' : 'downgrade',
      newPlan: `${targetPlan}_${targetInterval}`,
    });
  } catch (error) {
    console.error('Error changing subscription:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
