import { connectToDatabase } from '@/lib/database';
import User from '@/models/User';
import { getAdminPricingPlan } from '@/models/admin-models';
import creditService from './creditService';

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

      const subscription = user.subscription;

      // Allow free tier users to have access (they use credits, not subscription status)
      if (user.currentPlanKey === 'free') {
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

      // For day pass: check accessExpiresAt
      if (user.currentPlanKey === 'day_pass' && subscription.accessExpiresAt) {
        const expiresAt = new Date(subscription.accessExpiresAt);
        const hoursRemaining = Math.max(0, (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60));

        if (now > expiresAt) {
          // Check grace period
          const gracePeriodEndsAt = new Date(expiresAt.getTime() + GRACE_PERIOD_MS);
          if (now <= gracePeriodEndsAt) {
            return {
              hasAccess: true,
              isInGracePeriod: true,
              gracePeriodEndsAt,
              hoursRemaining: 0,
              subscription,
              reason: 'Day pass expired, in grace period'
            };
          }
          return {
            hasAccess: false,
            reason: 'Day pass has expired',
            expiredAt: expiresAt,
            hoursRemaining: 0,
            requiresRenewal: true
          };
        }

        return {
          hasAccess: true,
          hoursRemaining: Math.round(hoursRemaining * 10) / 10,
          subscription,
          expiredAt: expiresAt
        };
      }

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
      if (user.currentPlanKey === 'free') {
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

      // First check time-based access
      const timeCheck = await this.checkTimeBasedAccess(context.userId);
      if (!timeCheck.hasAccess) {
        return {
          allowed: false,
          reason: timeCheck.reason || 'Subscription access expired',
          currentUsage: 0,
          limit: 0
        };
      }

      const user = await User.findById(context.userId);
      if (!user) {
        return {
          allowed: false,
          reason: 'User not found',
          currentUsage: 0,
          limit: 0
        };
      }

      const PricingPlan = await getAdminPricingPlan();
      const plan = await PricingPlan.findOne({ key: user.currentPlanKey });
      if (!plan) {
        return {
          allowed: false,
          reason: 'Plan not found',
          currentUsage: 0,
          limit: 0
        };
      }

      // For day pass, also check using accessExpiresAt (more accurate than lastResetDate)
      if (user.currentPlanKey === 'day_pass' && user.subscription?.accessExpiresAt) {
        const expiresAt = new Date(user.subscription.accessExpiresAt);
        if (new Date() > expiresAt) {
          return {
            allowed: false,
            reason: 'Day pass has expired',
            currentUsage: 0,
            limit: 0
          };
        }
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
        resetTime: user.currentPlanKey === 'day_pass' && user.subscription?.accessExpiresAt
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
   * Reset usage for day pass users when their pass expires
   */
  async resetDayPassUsage(userId: string): Promise<boolean> {
    try {
      await connectToDatabase();

      const user = await User.findById(userId);
      if (!user || user.currentPlanKey !== 'day_pass') {
        return false;
      }

      await User.findByIdAndUpdate(userId, {
        $set: {
          'usage.cvJourneyCount': 0,
          'usage.cvCreatedCount': 0,
          'usage.exportCount': 0,
          'usage.atsCheckCount': 0,
          'usage.lastResetDate': new Date()
        }
      });

      return true;
    } catch (error) {
      console.error('Error resetting day pass usage:', error);
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
    dayPassExpiry?: Date;
  } | null> {
    try {
      await connectToDatabase();

      const user = await User.findById(userId);
      if (!user) {
        return null;
      }

      const PricingPlan = await getAdminPricingPlan();
      const plan = await PricingPlan.findOne({ key: user.currentPlanKey });
      if (!plan) {
        return null;
      }

      const result = {
        cvJourneyCount: user.usage.cvJourneyCount,
        cvCreatedCount: user.usage.cvCreatedCount,
        exportCount: user.usage.exportCount,
        atsCheckCount: user.usage.atsCheckCount,
        planLimits: {
          maxCVs: plan.maxCVs,
          maxExports: plan.maxExports,
          storageLimit: plan.storageLimit
        }
      };

      // Add day pass expiry if applicable
      if (user.currentPlanKey === 'day_pass' && plan.dayPassDuration) {
        const dayPassExpiry = new Date(user.usage.lastResetDate.getTime() + (plan.dayPassDuration * 60 * 60 * 1000));
        return { ...result, dayPassExpiry };
      }

      return result;
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
