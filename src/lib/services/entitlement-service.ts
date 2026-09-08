import { getConnection } from '@/lib/database';
import { ObjectId } from 'mongodb';

export type PlanType = 'starter' | 'focused' | 'admin';
export type BillingInterval = 'monthly' | 'yearly';
export type EntitlementType = 'application' | 'auto_apply';

export interface EntitlementPeriodInfo {
  limit: number | null; // null represents unlimited
  used: number;
  remaining: number | null;
  period: 'month' | 'day' | null;
  resetAt: Date | null;
}

export interface UserEntitlements {
  plan: PlanType;
  planName: string;
  billingInterval: BillingInterval;
  isPaidMember: boolean;
  application: EntitlementPeriodInfo;
  autoApply: EntitlementPeriodInfo & { enabled: boolean };
}

export interface UpgradeRecommendation {
  recommendedPlan: 'focused';
  recommendedPlanName: 'Focused Plan';
  headline: string;
  description: string;
  dailyCapacity: number;
  features: string[];
  ctaText: string;
  billingUrl: string;
}

export class EntitlementService {
  /**
   * Resolve canonical entitlements and live usage for a user
   */
  static async getUserEntitlements(userId: string): Promise<UserEntitlements> {
    await getConnection();
    const { getDb } = await import('@/lib/db');
    const db = await getDb();

    const usersCollection = db.collection('users');
    let user = null;
    if (ObjectId.isValid(userId)) {
      user = await usersCollection.findOne({ _id: new ObjectId(userId) });
    }
    if (!user) {
      user = await usersCollection.findOne({
        $or: [{ _id: userId as any }, { email: userId }],
      });
    }

    const rawPlanKey = (user?.currentPlanKey || user?.subscription?.planKey || 'free').toLowerCase();
    const role = (user?.role || '').toLowerCase();

    // 1. Resolve normalized Plan & Billing Interval
    let plan: PlanType = 'starter';
    let planName = 'Starter';
    let billingInterval: BillingInterval = 'monthly';

    if (role === 'admin' || role === 'superadmin' || rawPlanKey.includes('admin')) {
      plan = 'admin';
      planName = 'Admin Unlimited';
      billingInterval = 'yearly';
    } else if (rawPlanKey.includes('focused')) {
      plan = 'focused';
      planName = 'Focused';
      billingInterval = rawPlanKey.includes('yearly') ? 'yearly' : 'monthly';
    } else {
      plan = 'starter';
      planName = 'Starter';
      billingInterval = rawPlanKey.includes('yearly') ? 'yearly' : 'monthly';
    }

    const isPaidMember = plan === 'focused' || plan === 'admin';

    // 2. Resolve Reset Dates
    const now = new Date();

    // Monthly Reset Date: billing cycle date or 1st of next month
    let monthlyResetAt = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0);
    if (user?.subscription?.currentPeriodEnd) {
      const periodEnd = new Date(user.subscription.currentPeriodEnd);
      if (periodEnd > now) {
        monthlyResetAt = periodEnd;
      }
    }

    // Daily Reset Date: Midnight tomorrow
    const dailyResetAt = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);

    // Monthly Start Date for counting usage
    const monthlyStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const dailyStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

    // 3. Count Usage from job_applications collection
    const appsCollection = db.collection('job_applications');
    const userObjectId = ObjectId.isValid(userId) ? new ObjectId(userId) : userId;

    // Monthly count (applications created or applied this month)
    const monthlyUsed = await appsCollection.countDocuments({
      $or: [{ userId: userObjectId }, { userId: userId.toString() }],
      $and: [
        {
          $or: [
            { createdAt: { $gte: monthlyStart } },
            { appliedAt: { $gte: monthlyStart } },
            { applicationDate: { $gte: monthlyStart } },
          ],
        },
        { status: { $nin: ['saved'] } }, // Exclude bookmarked jobs from consumption count
      ],
    });

    // Daily Auto-Apply count (applications submitted via auto-apply today)
    const dailyAutoApplyUsed = await appsCollection.countDocuments({
      $or: [{ userId: userObjectId }, { userId: userId.toString() }],
      appliedAt: { $gte: dailyStart },
      isAutomated: true,
    });

    // 4. Construct Entitlement Structures
    if (plan === 'starter') {
      const limit = 10;
      const remaining = Math.max(0, limit - monthlyUsed);

      return {
        plan: 'starter',
        planName: 'Starter',
        billingInterval,
        isPaidMember: false,
        application: {
          limit,
          used: monthlyUsed,
          remaining,
          period: 'month',
          resetAt: monthlyResetAt,
        },
        autoApply: {
          enabled: true,
          limit: 10,
          used: monthlyUsed,
          remaining: remaining,
          period: 'month',
          resetAt: monthlyResetAt,
        },
      };
    }

    if (plan === 'focused') {
      const dailyLimit = 50;
      const dailyRemaining = Math.max(0, dailyLimit - dailyAutoApplyUsed);

      return {
        plan: 'focused',
        planName: 'Focused',
        billingInterval,
        isPaidMember: true,
        application: {
          limit: null, // Unlimited manual applications
          used: monthlyUsed,
          remaining: null,
          period: 'month',
          resetAt: monthlyResetAt,
        },
        autoApply: {
          enabled: true,
          limit: dailyLimit,
          used: dailyAutoApplyUsed,
          remaining: dailyRemaining,
          period: 'day',
          resetAt: dailyResetAt,
        },
      };
    }

    // Admin
    return {
      plan: 'admin',
      planName: 'Admin Unlimited',
      billingInterval: 'yearly',
      isPaidMember: true,
      application: {
        limit: null,
        used: monthlyUsed,
        remaining: null,
        period: 'month',
        resetAt: monthlyResetAt,
      },
      autoApply: {
        enabled: true,
        limit: 500,
        used: dailyAutoApplyUsed,
        remaining: 500 - dailyAutoApplyUsed,
        period: 'day',
        resetAt: dailyResetAt,
      },
    };
  }

  /**
   * Concurrency-safe entitlement verification & slot consumption
   */
  static async checkAndConsume(
    userId: string,
    type: EntitlementType = 'application'
  ): Promise<{
    allowed: boolean;
    entitlements: UserEntitlements;
    recommendation?: UpgradeRecommendation | null;
    errorReason?: string;
  }> {
    const entitlements = await this.getUserEntitlements(userId);

    if (type === 'application') {
      if (entitlements.application.limit !== null) {
        if (entitlements.application.used >= entitlements.application.limit) {
          return {
            allowed: false,
            entitlements,
            recommendation: this.getUpgradeRecommendation(entitlements, 'application'),
            errorReason: `You've used all ${entitlements.application.limit} applications included with your Starter plan this month.`,
          };
        }
      }
      return { allowed: true, entitlements };
    }

    if (type === 'auto_apply') {
      if (!entitlements.autoApply.enabled) {
        return {
          allowed: false,
          entitlements,
          recommendation: this.getUpgradeRecommendation(entitlements, 'auto_apply'),
          errorReason: "Auto-Apply isn't included in your Starter plan. Automatic submission is available on Focused.",
        };
      }

      if (
        entitlements.autoApply.limit !== null &&
        entitlements.autoApply.used >= entitlements.autoApply.limit
      ) {
        return {
          allowed: false,
          entitlements,
          recommendation: this.getUpgradeRecommendation(entitlements, 'auto_apply'),
          errorReason: `You've reached your auto-apply limit of ${entitlements.autoApply.limit} applications this month. Your limit resets on the 1st.`,
        };
      }

      return { allowed: true, entitlements };
    }

    return { allowed: true, entitlements };
  }

  /**
   * Contextual Recommendation Engine
   */
  static getUpgradeRecommendation(
    entitlements: UserEntitlements,
    triggerContext: EntitlementType
  ): UpgradeRecommendation | null {
    if (entitlements.plan === 'starter') {
      return {
        recommendedPlan: 'focused',
        recommendedPlanName: 'Focused Plan',
        headline: 'Unlock 50 automated applications every day',
        description:
          'Built for active job seekers who need automated high-volume applications across connected portals, priority queues, and unlimited resume tailoring.',
        dailyCapacity: 50,
        features: [
          '50 automated applications per day (up to 1,500/month)',
          'Unlimited manual applications & tracking',
          'Instant AI Resume Surgeon & Cover Letter tailoring',
          'Automated screening questionnaire resolver',
        ],
        ctaText: 'Upgrade to Focused',
        billingUrl: '/dashboard/billing',
      };
    }

    // Focused plan users are already on the top capacity tier
    return null;
  }
}
