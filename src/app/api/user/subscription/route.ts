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
    let user = await User.findOne({ email: userEmail })
      .populate('subscription')
      .exec();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if there is a pending downgrade that should have taken effect
    if (user.subscription?.downgradeStatus === 'pending' && user.subscription.currentPeriodEnd) {
      const now = new Date();
      const renewalDate = new Date(user.subscription.currentPeriodEnd);
      if (now >= renewalDate) {
        await subscriptionService.applyPendingDowngrade(user._id.toString());
        // Re-fetch user to get updated data
        const updatedUser = await User.findOne({ email: userEmail })
          .populate('subscription')
          .exec();
        if (updatedUser) {
          user = updatedUser;
        }
      }
    }

    const hasActiveTrial = user.trialState?.token && user.trialState.expiresAt && new Date(user.trialState.expiresAt) > new Date();
    
    let currentPlanKey;
    let effectiveSub;
    
    if (hasActiveTrial) {
      currentPlanKey = 'starter_monthly';
      effectiveSub = {
        planKey: 'starter_monthly',
        status: 'active',
        endDate: user.trialState.expiresAt,
        currentPeriodStart: new Date(),
        currentPeriodEnd: user.trialState.expiresAt,
        purchasePrice: 0,
        downgradeStatus: 'none',
        pendingDowngradePlanKey: null
      };
    } else {
      // Live Polar fallback check
      let liveDetails: any = { hasActiveSub: false };
      try {
        const { default: PolarService } = await import('@/lib/payment/polar');
        liveDetails = await PolarService.getActiveSubscriptionDetails(user.email);
      } catch (polarErr) {
        console.error('Failed to query Polar details in subscription route:', polarErr);
      }

      if (liveDetails.hasActiveSub) {
        currentPlanKey = liveDetails.planKey || 'starter_monthly';
        effectiveSub = {
          planKey: currentPlanKey,
          status: 'active',
          endDate: liveDetails.subscription?.currentPeriodEnd || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          currentPeriodStart: liveDetails.subscription?.currentPeriodStart || new Date(),
          currentPeriodEnd: liveDetails.subscription?.currentPeriodEnd || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          purchasePrice: 0,
          downgradeStatus: 'none',
          pendingDowngradePlanKey: null
        };

        // Reconcile MongoDB in background
        const mongoActive = user.subscription && (user.subscription.status === 'active' || user.subscription.status === 'trialing') && user.currentPlanKey !== 'free';
        if (!mongoActive) {
          console.log(`🔄 Subscription API - Reconciling active Polar subscription for ${user.email} in MongoDB...`);
          await User.findByIdAndUpdate(user._id, {
            $set: {
              currentPlanKey,
              'subscription.planKey': currentPlanKey,
              'subscription.status': 'active',
              'subscription.accessExpiresAt': effectiveSub.currentPeriodEnd,
              'subscription.currentPeriodEnd': effectiveSub.currentPeriodEnd
            }
          });
        }
      } else {
        const effective = subscriptionService.getEffectivePlan(user);
        currentPlanKey = effective.currentPlanKey;
        effectiveSub = effective.subscription;
      }
    }

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
          planDetails: freePlan,
          downgradeStatus: user.subscription?.downgradeStatus || 'none',
          pendingDowngradePlanKey: user.subscription?.pendingDowngradePlanKey || null,
          currentPeriodStart: null,
          currentPeriodEnd: null,
          purchasePrice: 0
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
      planDetails: planDetails,
      downgradeStatus: effectiveSub.downgradeStatus || 'none',
      pendingDowngradePlanKey: effectiveSub.pendingDowngradePlanKey || null,
      currentPeriodStart: effectiveSub.currentPeriodStart || null,
      currentPeriodEnd: effectiveSub.currentPeriodEnd || null,
      purchasePrice: effectiveSub.purchasePrice || 0
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

    // Verify trial reuse loophole
    if (user.trialState?.hasConsumedTrial) {
      return NextResponse.json({
        success: false,
        error: 'Trial limit reached. You have already consumed your trial period.'
      }, { status: 403 });
    }

    // Find the Starter plan config
    const PricingPlan = await getAdminPricingPlan();
    const plan = await PricingPlan.findOne({ key: 'starter_monthly' });
    if (!plan) {
      return NextResponse.json({ success: false, error: 'Starter plan not found' }, { status: 404 });
    }

    const now = new Date();
    // 24 hour short-lived trial token
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const token = 'trial_' + Math.random().toString(36).substring(2, 15);

    await User.findByIdAndUpdate(user._id, {
      $set: {
        'trialState.token': token,
        'trialState.expiresAt': expiresAt,
        'trialState.hasConsumedTrial': true,
        'trialState.features': ['journeyCVs', 'coverLetterAI', 'jobTracker']
      }
    });

    // Initialize credits for the new trial plan
    const creditService = (await import('@/lib/services/creditService')).default;
    await creditService.initializeCredits(user._id.toString(), 'starter_monthly');

    // Build the updated subscription payload
    const trialSubscription = {
      planName: 'Starter Monthly (Trial)',
      planKey: 'starter_monthly',
      status: 'active',
      credits: plan?.features?.maxCVs || 20,
      endDate: expiresAt.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      planId: plan?._id || null,
      planDetails: plan,
      downgradeStatus: 'none',
      pendingDowngradePlanKey: null,
      currentPeriodStart: now,
      currentPeriodEnd: expiresAt,
      purchasePrice: 0
    };

    return NextResponse.json({
      success: true,
      message: 'Trial plan activated successfully',
      subscription: trialSubscription
    });
  } catch (error) {
    console.error('Error activating starter plan:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

