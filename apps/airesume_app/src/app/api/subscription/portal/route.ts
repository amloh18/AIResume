import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getConnection } from '@/lib/database';
import { User } from '@/models';
import { StripeProvider } from '@/lib/payment/providers/stripe';
import { PORTAL_RETURN_URL } from '@/lib/billing/stripe-price-map';

/**
 * POST /api/subscription/portal
 *
 * Creates a Stripe Customer Portal session for managing subscriptions.
 * Always uses the authenticated user's Stripe customer ID.
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

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Must have a Stripe customer ID
    const customerId = user.subscription?.providerCustomerId;
    if (!customerId) {
      return NextResponse.json(
        { success: false, error: 'No billing account found. Please subscribe first.' },
        { status: 400 }
      );
    }

    // Must be a Stripe subscription
    if (user.subscription?.provider !== 'stripe') {
      return NextResponse.json(
        { success: false, error: 'Customer portal is only available for Stripe subscriptions.' },
        { status: 400 }
      );
    }

    const stripeProvider = new StripeProvider();
    const returnUrl = request.headers.get('referer') || PORTAL_RETURN_URL;

    const result = await stripeProvider.createPortalSession(customerId, returnUrl);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      url: result.url,
    });
  } catch (error) {
    console.error('Error creating portal session:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
