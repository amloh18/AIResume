import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import { getConnection } from '@/lib/database';
import { User } from '@/models';
import { getAdminSubscription, getAdminPricingPlan } from '@/models/admin-models';

export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedUser(request);
    
    if (!authResult) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const userEmail = authResult.userEmail;
    
    if (!userEmail) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await getConnection();

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
    const PricingPlan = await getAdminPricingPlan();
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
