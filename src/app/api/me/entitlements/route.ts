import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getConnection } from '@/lib/database';
import { User } from '@/models';
import {
  SubscriptionState,
  FREE_SUBSCRIPTION,
  resolveEntitlements,
  EffectiveEntitlements,
} from '@/lib/entitlements';
import { ObjectId } from 'mongodb';

/**
 * GET /api/me/entitlements
 *
 * Returns the complete effective entitlements for the authenticated user.
 * This is the SINGLE source of truth for the frontend.
 *
 * Response shape:
 * {
 *   plan: "starter",
 *   subscription: { status: "trialing", billingInterval: "monthly" },
 *   features: { "build.cv": true, "apply.auto": true, ... },
 *   limits: { "auto_apply_daily": { limit: 10, used: 2, remaining: 8, ... } },
 *   credits: { "ai_credits": { limit: -1, used: 0, remaining: null, ... } }
 * }
 */
export async function GET(request: NextRequest) {
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

    // ─── Build SubscriptionState from User model ───────────────────────────
    const sub = user.subscription;
    let subscriptionState: SubscriptionState;

    if (!sub || sub.planKey === 'free' || !sub.provider || sub.provider === 'none') {
      subscriptionState = FREE_SUBSCRIPTION;
    } else {
      // Determine plan from stored plan key
      const planKey = resolvePlanKey(sub.planKey || user.currentPlanKey || 'free');

      // Determine status
      let status: SubscriptionState['status'] = 'active';
      if (sub.status === 'cancelled' || sub.status === 'inactive') {
        status = 'canceled';
      } else if (sub.status === 'expired') {
        status = 'incomplete_expired';
      } else if (sub.status === 'active' || sub.status === 'inactive') {
        // Check if subscription period has expired
        if (sub.currentPeriodEnd && new Date(sub.currentPeriodEnd) < new Date()) {
          status = 'past_due';
        } else {
          status = 'active';
        }
      }

      // Check for launch trial
      const isLaunchTrial = sub.planKey === 'starter_monthly' &&
        (sub.status === 'active' || sub.status === 'inactive') &&
        sub.trialEnd &&
        new Date(sub.trialEnd).getFullYear() === 2027;

      // During launch trial, status should be 'trialing'
      if (isLaunchTrial && sub.trialEnd && new Date(sub.trialEnd) > new Date()) {
        status = 'trialing';
      }

      subscriptionState = {
        plan: planKey,
        status,
        billingInterval: (sub.interval as any) || 'monthly',
        stripeCustomerId: sub.providerCustomerId || undefined,
        stripeSubscriptionId: sub.providerSubscriptionId || undefined,
        stripePriceId: undefined,
        currentPeriodStart: sub.currentPeriodStart ? new Date(sub.currentPeriodStart) : undefined,
        currentPeriodEnd: sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd) : undefined,
        cancelAtPeriodEnd: sub.autoRenew === false,
        trialStart: sub.trialStart ? new Date(sub.trialStart) : undefined,
        trialEnd: sub.trialEnd ? new Date(sub.trialEnd) : undefined,
        isLaunchTrial: isLaunchTrial || false,
        launchTrialEnd: isLaunchTrial ? new Date('2027-01-01T00:00:00Z') : undefined,
      };
    }

    // ─── Fetch live usage data ─────────────────────────────────────────────
    const usageData = await fetchUsageData(user._id.toString());

    // ─── Resolve effective entitlements ────────────────────────────────────
    const entitlements = resolveEntitlements(subscriptionState, usageData);

    return NextResponse.json({
      success: true,
      ...entitlements,
    });
  } catch (error) {
    console.error('[Entitlements] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function resolvePlanKey(stored: string): 'free' | 'starter' | 'focused' {
  const key = stored.toLowerCase();
  if (key.includes('focused')) return 'focused';
  if (key.includes('starter')) return 'starter';
  return 'free';
}

async function fetchUsageData(userId: string): Promise<{
  limits?: Record<string, number>;
  credits?: Record<string, number>;
}> {
  try {
    const { getDb } = await import('@/lib/db');
    const db = await getDb();

    const now = new Date();
    const dailyStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const monthlyStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const userObjectId = ObjectId.isValid(userId) ? new ObjectId(userId) : userId;

    // Use AutoApplyQuotaService for reservation-based auto-apply counts
    // This is the authoritative source for Auto-Apply usage
    const { AutoApplyQuotaService } = await import('@/lib/services/autoApplyQuotaService');
    const autoApplyUsage = await AutoApplyQuotaService.getUsage(userId);

    const appsCollection = db.collection('jobapplications');

    // Monthly applications count (manual + auto, excluding saved/draft)
    const applicationsMonthly = await appsCollection.countDocuments({
      $or: [{ userId: userObjectId }, { userId }],
      createdAt: { $gte: monthlyStart },
      status: { $nin: ['saved', 'draft'] },
    });

    // Active jobs count
    const activeJobs = await appsCollection.countDocuments({
      $or: [{ userId: userObjectId }, { userId }],
      $and: [
        { $or: [{ isArchived: { $exists: false } }, { isArchived: false }] },
      ],
    });

    // Journey CVs count
    const CV = (await import('@/models/CV')).default;
    const journeyCvs = await CV.countDocuments({
      userId: userObjectId,
      cvType: 'journey',
      documentState: { $ne: 'frozen' },
    });

    // Surgeon runs (from user.usage or credits)
    const surgeonRuns = 0; // TODO: track in usage_counters

    return {
      limits: {
        active_jobs: activeJobs,
        journey_cvs: journeyCvs,
        // Reservation-based counts: consumed + reserved = total in-progress
        auto_apply_daily: autoApplyUsage.dailyUsed,
        auto_apply_monthly: autoApplyUsage.total,
        applications_monthly: applicationsMonthly,
        ai_surgeon_runs_monthly: surgeonRuns,
      },
      credits: {
        job_credits: 0, // TODO: read from user.credits
        ai_credits: 0,
      },
    };
  } catch (error) {
    console.error('[Entitlements] Error fetching usage:', error);
    return {};
  }
}
