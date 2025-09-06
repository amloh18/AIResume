import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/database';
import { User, Subscription, PricingPlan } from '@/models';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Check for Firebase user ID in headers or query params
    const firebaseUserId = request.headers.get('x-firebase-user-id') || 
                          request.nextUrl.searchParams.get('firebaseUserId');
    
    let userEmail: string | undefined;
    
    if (session?.user?.email) {
      // NextAuth user
      userEmail = session.user.email;
    } else if (firebaseUserId) {
      // Firebase user - get user by Firebase UID
      await connectDB();
      const firebaseUser = await User.findOne({ firebaseUid: firebaseUserId });
      if (firebaseUser) {
        userEmail = firebaseUser.email;
      }
    }
    
    if (!userEmail) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();

    // Find user and their subscription
    const user = await User.findOne({ email: userEmail })
      .populate('subscription')
      .exec();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Get the current plan details from database
    const currentPlanKey = user.currentPlanKey || 'free';
    const planDetails = await PricingPlan.findOne({ key: currentPlanKey }).lean();

    // If user has no subscription, return default free plan
    if (!user.subscription) {
      const freePlan = await PricingPlan.findOne({ key: 'free' }).lean();
      return NextResponse.json({
        success: true,
        subscription: {
          planName: freePlan?.name || 'Free Plan',
          planKey: 'free',
          status: 'active',
          credits: freePlan?.features?.maxCVs || 20,
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          }),
          planId: freePlan?._id || null,
          planDetails: freePlan
        }
      });
    }

    // Format subscription data with database plan details
    const subscription = {
      planName: planDetails?.name || 'Free Plan',
      planKey: user.subscription.planKey || 'free',
      status: user.subscription.status || 'active',
      credits: planDetails?.features?.maxCVs || 20,
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
      planId: planDetails?._id || null,
      planDetails: planDetails
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
