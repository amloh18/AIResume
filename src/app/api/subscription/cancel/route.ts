import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getConnection } from '@/lib/database';
import User from '@/models/User';
import { getPolar } from '@/lib/payment/polar';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await getConnection();

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const subscriptionId = user.subscription?.providerSubscriptionId;
    if (!subscriptionId) {
      return NextResponse.json({ error: 'No active payment provider subscription found' }, { status: 400 });
    }

    if (user.subscription.status !== 'active' && user.subscription.status !== 'trialing') {
      return NextResponse.json({ error: 'Subscription is not active' }, { status: 400 });
    }

    const polar = getPolar();
    if (!polar) {
      return NextResponse.json({ error: 'Payment gateway connection error' }, { status: 500 });
    }

    console.log(`Cancelling Polar subscription ${subscriptionId} for user ${user._id}`);
    
    // Revoke/cancel subscription in Polar
    await polar.subscriptions.revoke({
      id: subscriptionId,
    });

    console.log(`Polar subscription cancellation requested for ${subscriptionId}`);

    return NextResponse.json({
      success: true,
      message: 'Subscription cancellation request submitted successfully. Access will continue until the end of the billing period.'
    });

  } catch (error: any) {
    console.error('Subscription cancellation error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
