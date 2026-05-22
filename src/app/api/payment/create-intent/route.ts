import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getConnection } from '@/lib/database';
import { User } from '@/models';
import PolarService from '@/lib/payment/polar';
import { LocationService } from '@/lib/payment/locationService';

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
    const { planName, amount, currency, paymentMethod, billingCycle, productPriceId, returnUrl } = body;

    if (!planName || !amount || !currency || !paymentMethod) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
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

    const partner = 'polar';

    // Track checkout initiation server-side
    try {
      const { getPostHogClient } = await import('@/lib/posthog-server');
      const posthog = getPostHogClient();
      posthog.capture({
        distinctId: user._id.toString(),
        event: 'checkout_initiated',
        properties: {
          plan_name: planName,
          billing_cycle: billingCycle || 'one-time',
          amount,
          currency,
          payment_provider: partner,
        },
      });
    } catch (phError) {
      console.error('PostHog capture error (checkout_initiated):', phError);
    }

    if (partner === 'polar') {
      if (!productPriceId) {
        return NextResponse.json(
          { success: false, error: 'Product price ID is required for Polar' },
          { status: 400 }
        );
      }

      const polarResult = await PolarService.createCheckout({
        productPriceId: productPriceId,
        customerEmail: user.email,
        customerName: `${user.firstName} ${user.lastName}`,
        successUrl: returnUrl || `${process.env.NEXTAUTH_URL}/dashboard?success=true`,
        metadata: {
          userId: user._id.toString(),
          planName: planName,
          billingCycle: billingCycle || 'one-time'
        }
      });

      if (!polarResult.success) {
        return NextResponse.json(
          { success: false, error: polarResult.error },
          { status: 400 }
        );
      }

return NextResponse.json({
        success: true,
        checkoutId: polarResult.checkoutId,
        checkoutUrl: polarResult.checkoutUrl,
        paymentMethod: 'polar'
      });
    }

    return NextResponse.json({
      success: false,
      error: 'No valid payment provider available'
    }, { status: 500 });

  } catch (error) {
    console.error('Error creating payment intent:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
