import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getConnection } from '@/lib/database';
import { User } from '@/models';
import {
  resolveStripePrice,
  detectRegion,
  qualifiesForLaunchTrial,
  getLaunchTrialMessage,
  type PlanKey,
  type BillingInterval,
  type Region,
} from '@/lib/billing/stripe-price-map';
import { getActivePaymentProvider } from '@/lib/payment/paymentProvider';

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
    const { plan, billingInterval, billingCountry } = body;

    // Validate required fields — we only need plan + interval + region
    if (!plan || !billingInterval) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: plan, billingInterval' },
        { status: 400 }
      );
    }

    // Validate plan keys
    const validPlans = ['starter', 'focused'];
    const validIntervals = ['monthly', 'yearly'];
    if (!validPlans.includes(plan)) {
      return NextResponse.json(
        { success: false, error: `Invalid plan: ${plan}. Must be one of: ${validPlans.join(', ')}` },
        { status: 400 }
      );
    }
    if (!validIntervals.includes(billingInterval)) {
      return NextResponse.json(
        { success: false, error: `Invalid billingInterval: ${billingInterval}. Must be one of: ${validIntervals.join(', ')}` },
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

    // Check for existing active subscription — prevent duplicate subscriptions
    if (user.subscription?.status === 'active' || user.subscription?.status === 'trialing') {
      const existingPlan = user.subscription.planKey;
      if (existingPlan && existingPlan !== 'free') {
        return NextResponse.json(
          {
            success: false,
            error: 'You already have an active subscription. Please manage it from your billing settings.',
            existingPlan,
          },
          { status: 409 }
        );
      }
    }

    // Detect region server-side from billing country
    const region: Region = detectRegion(billingCountry);

    // Resolve the canonical Stripe Price server-side (NEVER trust client price)
    const priceEntry = resolveStripePrice(plan as PlanKey, billingInterval as BillingInterval, region);
    if (!priceEntry) {
      return NextResponse.json(
        { success: false, error: `No price found for plan=${plan}, interval=${billingInterval}, region=${region}` },
        { status: 400 }
      );
    }

    // Check for launch trial eligibility
    const launchTrialActive = qualifiesForLaunchTrial(plan as PlanKey, billingInterval as BillingInterval);
    const launchTrialMessage = getLaunchTrialMessage(region);

    // Build success/cancel URLs
    const baseUrl = process.env.NEXTAUTH_URL || 'https://resume.morigrid.com';
    const successUrl = `${baseUrl}/dashboard?tab=billing&success=true`;
    const cancelUrl = `${baseUrl}/dashboard?tab=billing&cancelled=true`;

    // Use the active payment provider (Stripe or Razorpay)
    const provider = await getActivePaymentProvider();

    if (provider.name === 'stripe') {
      // Stripe checkout — pass region metadata for price resolution
      const result = await provider.createCheckoutSession({
        planKey: `${plan}_${billingInterval}`,
        billingCycle: billingInterval as BillingInterval,
        userId: user._id.toString(),
        userEmail: user.email,
        userName: `${user.firstName} ${user.lastName}`,
        successUrl,
        cancelUrl,
        metadata: {
          region,
          billingCountry: billingCountry || 'unknown',
        },
      });

      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error },
          { status: 400 }
        );
      }

      // Track checkout initiation
      try {
        const { getPostHogClient } = await import('@/lib/posthog-server');
        const posthog = getPostHogClient();
        posthog.capture({
          distinctId: user._id.toString(),
          event: 'checkout_initiated',
          properties: {
            plan,
            billing_interval: billingInterval,
            region,
            currency: priceEntry.currency,
            amount: priceEntry.amount,
            payment_provider: 'stripe',
            launch_trial: launchTrialActive,
          },
        });
      } catch (phError) {
        console.error('PostHog capture error:', phError);
      }

      return NextResponse.json({
        success: true,
        sessionId: result.sessionId,
        url: result.url,
        paymentMethod: 'stripe',
        launchTrial: launchTrialActive ? {
          active: true,
          message: launchTrialMessage,
          trialEnd: '2027-01-01T00:00:00Z',
        } : null,
        price: {
          currency: priceEntry.currency,
          amount: priceEntry.amount,
          displayAmount: priceEntry.currency === 'INR'
            ? `₹${(priceEntry.amount / 100).toFixed(0)}`
            : `$${(priceEntry.amount / 100).toFixed(2)}`,
          interval: priceEntry.interval,
        },
      });
    }

    // Fallback for other providers
    return NextResponse.json({
      success: false,
      error: 'Stripe is the active payment provider but could not be initialized',
    }, { status: 500 });

  } catch (error) {
    console.error('Error creating payment intent:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
