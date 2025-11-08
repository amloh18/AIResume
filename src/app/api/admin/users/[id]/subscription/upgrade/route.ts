import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import type { MyJwtPayload } from '@/types/jwt-payload';
import { getConnection } from '@/lib/database';
import { User } from '@/models';
import { getAdminPricingPlan } from '@/models/admin-models';
import { ActivityLogService } from '@/lib/services/activityLogService';
import { getAdminContext } from '@/lib/utils/adminAuth';
import creditService from '@/lib/services/creditService';
import { invalidateConfigCache } from '@/lib/config/adminConfig';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const startTime = Date.now();
  let adminContext: { adminUserId?: string; adminEmail?: string; adminRole?: string } | null = null;

  try {
    // Verify admin authentication
    const cookieStore = await cookies();
    const adminToken = cookieStore.get('admin-token');

    if (!adminToken) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    try {
      const decoded = jwt.verify(adminToken.value, process.env.NEXTAUTH_SECRET || 'fallback-secret') as MyJwtPayload;
      adminContext = {
        adminUserId: decoded.id,
        adminEmail: decoded.email,
        adminRole: decoded.role
      };
    } catch (jwtError) {
      return NextResponse.json(
        { success: false, error: 'Invalid admin token' },
        { status: 401 }
      );
    }

    await getConnection();

    const userId = params.id;
    const body = await request.json();
    const { planKey, interval, reason } = body;

    // Validate input
    if (!planKey) {
      return NextResponse.json(
        { success: false, error: 'Plan key is required' },
        { status: 400 }
      );
    }

    // Get user
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Get the plan
    const PricingPlan = await getAdminPricingPlan();
    const plan = await PricingPlan.findOne({ key: planKey, status: 'active' });
    if (!plan) {
      return NextResponse.json(
        { success: false, error: 'Plan not found or inactive' },
        { status: 404 }
      );
    }

    // Calculate end date based on interval
    const startDate = new Date();
    let endDate = new Date();
    let currentPeriodEnd = new Date();

    if (interval === 'monthly' || planKey === 'pro_monthly') {
      endDate.setMonth(endDate.getMonth() + 1);
      currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);
    } else if (interval === 'quarterly' || planKey === 'pro_quarterly') {
      endDate.setMonth(endDate.getMonth() + 3);
      currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 3);
    } else if (interval === 'yearly' || planKey === 'pro_yearly') {
      endDate.setFullYear(endDate.getFullYear() + 1);
      currentPeriodEnd.setFullYear(currentPeriodEnd.getFullYear() + 1);
    } else if (planKey === 'day_pass') {
      endDate.setHours(endDate.getHours() + (plan.dayPassDuration || 24));
      currentPeriodEnd.setHours(currentPeriodEnd.getHours() + (plan.dayPassDuration || 24));
    } else if (planKey === 'free') {
      // Free plan doesn't expire
      endDate = new Date('2099-12-31');
      currentPeriodEnd = new Date('2099-12-31');
    }

    // Update user subscription
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        currentPlanKey: planKey,
        subscription: {
          planKey: planKey,
          status: 'active',
          startDate: startDate,
          endDate: endDate,
          currentPeriodStart: startDate,
          currentPeriodEnd: currentPeriodEnd,
          provider: 'admin',
          interval: interval || (planKey === 'day_pass' ? 'one-time' : 'monthly'),
          seats: plan.maxCVs === -1 ? 1 : plan.maxCVs,
          storageUsed: 0
        }
      },
      { new: true }
    );

    if (!updatedUser) {
      return NextResponse.json(
        { success: false, error: 'Failed to update user subscription' },
        { status: 500 }
      );
    }

    // Handle credits on plan change
    const oldPlanKey = user.currentPlanKey || 'free';
    const isUpgrade = planKey !== oldPlanKey;
    
    if (isUpgrade) {
      // Initialize credits for new plan
      await creditService.initializeCredits(userId, planKey);
    } else {
      // If same plan, just ensure credits are initialized
      const creditStatus = await creditService.getCreditStatus(userId);
      if (!creditStatus || creditStatus.cvCredits === 0) {
        await creditService.initializeCredits(userId, planKey);
      }
    }

    const responseTime = Date.now() - startTime;

    // Invalidate config cache since plan usage may have changed
    invalidateConfigCache();

    // Log admin action
    if (adminContext) {
      await ActivityLogService.logAdminAction({
        adminUserId: adminContext.adminUserId!,
        adminEmail: adminContext.adminEmail,
        action: `granted_plan_${planKey}`,
        targetUserId: userId,
        actionType: 'subscription_upgrade',
        resourceType: 'user',
        resourceId: userId,
        status: 'success',
        metadata: {
          planKey,
          interval,
          reason,
          previousPlan: user.currentPlanKey
        }
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Plan granted successfully',
      subscription: {
        planKey: updatedUser.currentPlanKey,
        status: updatedUser.subscription?.status,
        startDate: updatedUser.subscription?.startDate,
        endDate: updatedUser.subscription?.endDate,
        currentPeriodEnd: updatedUser.subscription?.currentPeriodEnd,
        provider: updatedUser.subscription?.provider,
        interval: updatedUser.subscription?.interval
      }
    });

  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    console.error('Error granting plan:', error);

    // Log failed admin action
    if (adminContext) {
      await ActivityLogService.logAdminAction({
        adminUserId: adminContext.adminUserId!,
        adminEmail: adminContext.adminEmail,
        action: 'grant_plan_failed',
        targetUserId: params.id,
        actionType: 'subscription_upgrade',
        resourceType: 'user',
        resourceId: params.id,
        status: 'failed',
        metadata: {
          error: error.message
        }
      });
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

