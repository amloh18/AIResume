import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import { getConnection } from '@/lib/database';
import { User } from '@/models';
import { getAdminSubscription, getAdminPricingPlan } from '@/models/admin-models';
import subscriptionService from '@/lib/services/subscriptionService';

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

    const effective = subscriptionService.getEffectivePlan(user);
    const { currentPlanKey, subscription: effectiveSub } = effective;

    // Get the current plan details from database
    const PricingPlan = await getAdminPricingPlan();
    const planDetails = await PricingPlan.findOne({ key: currentPlanKey }).lean();

    // If user has no subscription or it's free, return default free plan
    if (!effectiveSub || currentPlanKey === 'free') {
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
      planKey: effectiveSub.planKey || 'free',
      status: effectiveSub.status || 'active',
      credits: planDetails?.features?.maxCVs || 20,
      endDate: effectiveSub.endDate 
        ? new Date(effectiveSub.endDate).toLocaleDateString('en-US', {
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

export async function POST(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedUser(request);
    if (!authResult) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { planKey } = await request.json();
    if (planKey !== 'starter_monthly') {
      return NextResponse.json({ success: false, error: 'Only starter_monthly can be activated via this endpoint' }, { status: 400 });
    }

    await getConnection();
    const user = await User.findOne({ email: authResult.userEmail });
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    // Activate the free plan
    const PricingPlan = await getAdminPricingPlan();
    const plan = await PricingPlan.findOne({ key: 'starter_monthly' });
    if (!plan) {
      return NextResponse.json({ success: false, error: 'Starter plan not found' }, { status: 404 });
    }

    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setMonth(expiresAt.getMonth() + 1);

    await User.findByIdAndUpdate(user._id, {
      $set: {
        currentPlanKey: 'starter_monthly',
        'subscription.planKey': 'starter_monthly',
        'subscription.status': 'active',
        'subscription.startDate': now,
        'subscription.accessExpiresAt': expiresAt,
        'subscription.currentPeriodStart': now,
        'subscription.currentPeriodEnd': expiresAt,
        'subscription.usageResetDate': expiresAt,
        'subscription.provider': 'none',
        'subscription.interval': 'monthly',
        'subscription.purchasePrice': 0,
        'subscription.autoRenew': true
      }
    });

    // Initialize credits for the new plan
    const creditService = (await import('@/lib/services/creditService')).default;
    await creditService.initializeCredits(user._id.toString(), 'starter_monthly');

    return NextResponse.json({ success: true, message: 'Starter plan activated' });
  } catch (error) {
    console.error('Error activating starter plan:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

