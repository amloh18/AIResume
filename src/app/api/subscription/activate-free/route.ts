import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/database';
import { User } from '@/models';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    await connectDB();

    // Get user
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if user already has an active subscription
    if (user.subscription && user.subscription.status === 'active') {
      return NextResponse.json(
        { success: false, error: 'User already has an active subscription' },
        { status: 400 }
      );
    }

    // Update user subscription to free plan
    const updateResult = await User.findByIdAndUpdate(
      user._id,
      {
        $set: {
          'subscription.plan': 'Free Plan',
          'subscription.status': 'active',
          'subscription.startDate': new Date(),
          'subscription.endDate': new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
          'subscription.billingCycle': 'one-time',
          'subscription.amount': 0,
          'subscription.currency': 'EUR',
          'subscription.paymentMethod': 'free',
          'subscription.paymentProviderId': 'free_plan',
          'subscription.finalAmount': 0,
          'subscription.metadata': {
            activatedAt: new Date(),
            source: 'free_activation'
          }
        }
      },
      { new: true }
    );

    if (!updateResult) {
      return NextResponse.json(
        { success: false, error: 'Failed to activate free plan' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Free plan activated successfully',
      subscription: {
        plan: 'Free Plan',
        status: 'active',
        startDate: updateResult.subscription?.startDate,
        endDate: updateResult.subscription?.endDate
      }
    });

  } catch (error) {
    console.error('Error activating free plan:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
