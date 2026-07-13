import { connectToDatabase } from '@/lib/database';
import User from '@/models/User';
import { getAdminPricingPlan } from '@/models/admin-models';
import creditService from './creditService';
import { isFreeTierPlan } from '@/lib/utils/subscription-helpers';

export interface UsageLimitResult {
  allowed: boolean;
  reason?: string;
  currentUsage: number;
  limit: number;
  resetTime?: Date;
}

export interface TimeBasedAccessResult {
  hasAccess: boolean;
  reason?: string;
  subscription?: any;
  expiredAt?: Date;
  hoursRemaining?: number;
  daysRemaining?: number;
  isInGracePeriod?: boolean;
  gracePeriodEndsAt?: Date;
  requiresRenewal?: boolean;
}

export interface ActionContext {
  userId: string;
  action: 'job_create' | 'ai_generation';
  deviceFingerprint?: string;
  ipAddress?: string;
}

/**
 * Plan keys that are never subject to usage limits.
 * We calculate/track their usage for analytics but never block them.
 */
const UNLIMITED_PLAN_KEYS = [
  'focused_monthly',
  'focused_yearly',
  'smart_quarterly',
  'smart_yearly',
  'pro_monthly',
  'pro_quarterly',
  'pro_yearly',
  'pro_lifetime',
  'pro',
  'starter_yearly',
];

class UsageLimitsService {
  /**
   * Check time-based access for a user's subscription
   * This checks if subscription has expired based on accessExpiresAt or currentPeriodEnd
   */
  async checkTimeBasedAccess(userId: string): Promise<TimeBasedAccessResult> {
    try {
      await connectToDatabase();

      const user = await User.findById(userId);
      if (!user) {
        return {
          hasAccess: false,
          reason: 'User not found'
        };
      }

      // Check active trial token state first
      const hasActiveTrial = user.trialState?.token && user.trialState.expiresAt && new Date(user.trialState.expiresAt) > new Date();
      if (hasActiveTrial) {
        return {
          hasAccess: true,
          reason: 'Active trial token access'
        };
      }

      // Consult Polar API as a runtime verification fallback
      try {
        const { default: PolarService } = await import('@/lib/payment/polar');
        const liveDetails = await PolarService.getActiveSubscriptionDetails(user.email);
        
        const mongoActive = user.subscription && (user.subscription.status === 'active' || user.subscription.status === 'trialing') && user.currentPlanKey !== 'free';
        
        if (liveDetails.hasActiveSub !== mongoActive) {
          console.log(`🔄 UsageLimitService - Stale MongoDB subscription state detected for ${user.email}. Reconciling...`);
          if (liveDetails.hasActiveSub) {
            const resolvedPlanKey = liveDetails.planKey || 'starter_monthly';
            await User.findByIdAndUpdate(user._id, {
              $set: {
                currentPlanKey: resolvedPlanKey,
                'subscription.planKey': resolvedPlanKey,
                'subscription.status': 'active',
                'subscription.accessExpiresAt': liveDetails.subscription?.currentPeriodEnd || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                'subscription.currentPeriodEnd': liveDetails.subscription?.currentPeriodEnd
              }
            });
            user.currentPlanKey = resolvedPlanKey;
            user.subscription = user.subscription || {};
            user.subscription.planKey = resolvedPlanKey;
            user.subscription.status = 'active';
          } else {
            if (user.currentPlanKey !== 'free') {
              await User.findByIdAndUpdate(user._id, {
                $set: {
                  currentPlanKey: 'free',
                  'subscription.status': 'inactive'
                }
              });
              user.currentPlanKey = 'free';
              if (user.subscription) {
                user.subscription.status = 'inactive';
              }
            }
          }
        }
      } catch (polarErr) {
        console.error('⚠️ UsageLimitService - Failed Polar runtime fallback reconciliation:', polarErr);
      }

      const subscription = user.subscription;

      // Allow free tier users to have access (they use credits, not subscription status)
      if (isFreeTierPlan(user.currentPlanKey)) {
        return {
          hasAccess: true,
          subscription,
          reason: 'Free tier access'
        };
      }

      // For paid plans, check subscription status
      // If user has a paid plan key but no active subscription, treat them as free tier
      if (!subscription || subscription.status === 'cancelled' || subscription.status === 'inactive') {
        // User has paid plan key but no active subscription - treat as free tier
        // This allows them to use free tier credits instead of blocking access completely
        return {
          hasAccess: true,
          subscription,
          reason: 'No active subscription, using free tier access'
        };
      }

      const now = new Date();
      const GRACE_PERIOD_DAYS = 3;
      const GRACE_PERIOD_MS = GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000;

      // For quarterly/yearly (one-time payments): check accessExpiresAt
      if ((user.currentPlanKey === 'pro_quarterly' || user.currentPlanKey === 'pro_lifetime' || user.currentPlanKey === 'pro_lifetime') && subscription.accessExpiresAt) {
        const expiresAt = new Date(subscription.accessExpiresAt);
        const daysRemaining = Math.max(0, (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        if (now > expiresAt) {
          // Check grace period
          const gracePeriodEndsAt = new Date(expiresAt.getTime() + GRACE_PERIOD_MS);
          if (now <= gracePeriodEndsAt) {
            return {
              hasAccess: true,
              isInGracePeriod: true,
              gracePeriodEndsAt,
              daysRemaining: 0,
              subscription,
              reason: 'Subscription expired, in grace period'
            };
          }
          return {
            hasAccess: false,
            reason: 'Subscription has expired',
            expiredAt: expiresAt,
            daysRemaining: 0,
            requiresRenewal: true
          };
        }

        return {
          hasAccess: true,
          daysRemaining: Math.round(daysRemaining * 10) / 10,
          subscription,
          expiredAt: expiresAt
        };
      }

      // For lifetime plan: always has access
      if (user.currentPlanKey === 'pro_lifetime') {
        return {
          hasAccess: true,
          subscription,
          reason: 'Lifetime access'
        };
      }

      // For monthly (recurring): check currentPeriodEnd
      if (user.currentPlanKey === 'pro_monthly' && subscription.currentPeriodEnd) {
        const periodEnd = new Date(subscription.currentPeriodEnd);
        const daysRemaining = Math.max(0, (periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        if (now > periodEnd) {
          // For monthly plans, check if auto-renew is enabled
          if (subscription.autoRenew && subscription.status === 'active') {
            // Subscription should auto-renew, but payment might have failed
            // Allow access for grace period
            const gracePeriodEndsAt = new Date(periodEnd.getTime() + GRACE_PERIOD_MS);
            if (now <= gracePeriodEndsAt) {
              return {
                hasAccess: true,
                isInGracePeriod: true,
                gracePeriodEndsAt,
                daysRemaining: 0,
                subscription,
                reason: 'Subscription renewal pending, in grace period'
              };
            }
          }

          return {
            hasAccess: false,
            reason: 'Subscription period has ended',
            expiredAt: periodEnd,
            daysRemaining: 0,
            requiresRenewal: true
          };
        }

        return {
          hasAccess: true,
          daysRemaining: Math.round(daysRemaining * 10) / 10,
          subscription,
          expiredAt: periodEnd
        };
      }

      // Free plan: always has access
      if (isFreeTierPlan(user.currentPlanKey)) {
        return {
          hasAccess: true,
          subscription
        };
      }

      // Default: no access if we can't determine expiry
      return {
        hasAccess: false,
        reason: 'Unable to determine subscription status',
        requiresRenewal: true
      };

    } catch (error) {
      console.error('Error checking time-based access:', error);
      return {
        hasAccess: false,
        reason: 'Internal error checking access'
      };
    }
  }

  /**
   * Check if a user can perform a specific action based on their plan limits
   * Now includes time-based access check first
   */
  async checkUsageLimit(context: ActionContext): Promise<UsageLimitResult> {
    try {
      await connectToDatabase();

      const user = await User.findById(context.userId);
      if (!user) {
        return {
          allowed: false,
          reason: 'User not found',
          currentUsage: 0,
          limit: 0
        };
      }

      const hasActiveTrial = user.trialState?.token && user.trialState.expiresAt && new Date(user.trialState.expiresAt) > new Date();
      const effectivePlanKey = hasActiveTrial ? 'starter_monthly' : user.currentPlanKey;

      // Focused / Smart / Pro / Starter-Yearly plans are NEVER usage-limited.
      // Subscription expiry is a separate concern handled by checkTimeBasedAccess.
      if (UNLIMITED_PLAN_KEYS.includes(effectivePlanKey)) {
        return {
          allowed: true,
          currentUsage: -1,
          limit: -1
        };
      }

      // For free / starter_monthly: check time-based access first
      const timeCheck = await this.checkTimeBasedAccess(context.userId);
      if (!timeCheck.hasAccess) {
        return {
          allowed: false,
          reason: timeCheck.reason || 'Subscription access expired',
          currentUsage: 0,
          limit: 0
        };
      }

      const PricingPlan = await getAdminPricingPlan();
      const plan = await PricingPlan.findOne({ key: effectivePlanKey });
      if (!plan) {
        return {
          allowed: false,
          reason: 'Plan not found',
          currentUsage: 0,
          limit: 0
        };
      }

      // Check job creation credits
      const creditCheck = await creditService.checkCreditAvailability(context.userId, 'job_create');

      const allowed = creditCheck.available;
      const currentUsage = creditCheck.limit === -1 ? -1 : creditCheck.limit - creditCheck.creditsRemaining;
      const limit = creditCheck.limit;

      return {
        allowed,
        reason: allowed ? undefined : `Plan limit exceeded. You have used ${currentUsage}/${limit === -1 ? 'unlimited' : limit} ${context.action.replace('_', ' ')}s`,
        currentUsage,
        limit,
        resetTime: user.subscription?.accessExpiresAt
          ? new Date(user.subscription.accessExpiresAt)
          : user.subscription?.currentPeriodEnd
            ? new Date(user.subscription.currentPeriodEnd)
            : undefined
      };

    } catch (error) {
      console.error('Error checking usage limit:', error);
      return {
        allowed: false,
        reason: 'Internal error',
        currentUsage: 0,
        limit: 0
      };
    }
  }

  /**
   * Spend credit for job creation (replaces incrementUsage)
   */
  async incrementUsage(context: ActionContext): Promise<boolean> {
    try {
      await connectToDatabase();

      if (context.action === 'job_create' || context.action === 'ai_generation') {
        return await creditService.spendCredit(context.userId, context.action);
      }

      return true;
    } catch (error) {
      console.error('Error incrementing usage:', error);
      return false;
    }
  }

  /**
   * Get current usage statistics for a user
   */
  async getUserUsage(userId: string): Promise<{
    cvJourneyCount: number;
    cvCreatedCount: number;
    exportCount: number;
    atsCheckCount: number;
    planLimits: {
      maxCVs: number;
      maxExports: number;
      storageLimit: number;
    };
  } | null> {
    try {
      await connectToDatabase();

      const user = await User.findById(userId);
      if (!user) {
        return null;
      }

      const hasActiveTrial = user.trialState?.token && user.trialState.expiresAt && new Date(user.trialState.expiresAt) > new Date();
      const effectivePlanKey = hasActiveTrial ? 'starter_monthly' : user.currentPlanKey;

      const PricingPlan = await getAdminPricingPlan();
      const plan = await PricingPlan.findOne({ key: effectivePlanKey });
      
      // Fallback defaults if plan is missing in database
      const maxCVs = plan ? plan.maxCVs : (effectivePlanKey === 'free' ? 1 : -1);
      const maxExports = plan ? plan.maxExports : (effectivePlanKey === 'free' ? 5 : -1);
      const storageLimit = plan ? plan.storageLimit : (effectivePlanKey === 'free' ? 50 : -1);

      return {
        cvJourneyCount: user.usage.cvJourneyCount,
        cvCreatedCount: user.usage.cvCreatedCount,
        exportCount: user.usage.exportCount,
        atsCheckCount: user.usage.atsCheckCount,
        planLimits: {
          maxCVs,
          maxExports,
          storageLimit
        }
      };
    } catch (error) {
      console.error('Error getting user usage:', error);
      return null;
    }
  }

  /**
   * Validate device fingerprint to prevent abuse
   */
  async validateDeviceFingerprint(userId: string, deviceFingerprint: string): Promise<boolean> {
    try {
      await connectToDatabase();

      const user = await User.findById(userId);
      if (!user) {
        return false;
      }

      // If user doesn't have a device fingerprint, set it
      if (!user.usage.deviceFingerprint) {
        await User.findByIdAndUpdate(userId, {
          $set: { 'usage.deviceFingerprint': deviceFingerprint }
        });
        return true;
      }

      // Check if device fingerprint matches
      return user.usage.deviceFingerprint === deviceFingerprint;
    } catch (error) {
      console.error('Error validating device fingerprint:', error);
      return false;
    }
  }

  /**
   * Check for suspicious activity patterns
   */
  async checkSuspiciousActivity(context: ActionContext): Promise<{
    suspicious: boolean;
    reason?: string;
  }> {
    try {
      await connectToDatabase();

      // Check for rapid-fire requests (more than 10 actions in 1 minute)
      const oneMinuteAgo = new Date(Date.now() - 60 * 1000);

      // This would require additional logging/tracking in a real implementation
      // For now, we'll implement basic checks

      const user = await User.findById(context.userId);
      if (!user) {
        return { suspicious: false };
      }

      // Check if user is trying to exceed limits rapidly
      const usageCheck = await this.checkUsageLimit(context);
      if (!usageCheck.allowed && usageCheck.currentUsage > 0) {
        return {
          suspicious: true,
          reason: 'Attempting to exceed plan limits'
        };
      }

      return { suspicious: false };
    } catch (error) {
      console.error('Error checking suspicious activity:', error);
      return { suspicious: false };
    }
  }

  /**
   * Get the MongoDB field name for a specific action
   */
  private getUsageField(action: string): string | null {
    switch (action) {
      case 'job_create':
        return 'journeysCreated'; // Jobs create journeys
      default:
        return null;
    }
  }
}

export default new UsageLimitsService();
