import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/database';
import { User, Subscription } from '@/models';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();

    // Find user and their subscription
    const user = await User.findOne({ email: session.user.email })
      .populate('subscription')
      .exec();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // If user has no subscription, return default free plan
    if (!user.subscription) {
      return NextResponse.json({
        success: true,
        subscription: {
          planName: 'Free Plan',
          status: 'active',
          credits: 20,
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          }),
          planId: null
        }
      });
    }

    // Format subscription data
    const subscription = {
      planName: user.subscription.planName || 'Free Plan',
      status: user.subscription.status || 'active',
      credits: user.subscription.credits || 20,
      endDate: user.subscription.endDate 
        ? new Date(user.subscription.endDate).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          }),
      planId: user.subscription.planId || null
    };

    return NextResponse.json({
      success: true,
      subscription
    });

  } catch (error) {
    console.error('Error fetching user subscription:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
