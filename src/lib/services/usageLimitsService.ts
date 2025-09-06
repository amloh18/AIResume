import { connectToDatabase } from '@/lib/database';
import User from '@/models/User';
import PricingPlan from '@/models/PricingPlan';

export interface UsageLimitResult {
  allowed: boolean;
  reason?: string;
  currentUsage: number;
  limit: number;
  resetTime?: Date;
}

export interface ActionContext {
  userId: string;
  action: 'cv_journey' | 'cv_create' | 'export' | 'ats_check';
  deviceFingerprint?: string;
  ipAddress?: string;
}

class UsageLimitsService {
  /**
   * Check if a user can perform a specific action based on their plan limits
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

      const plan = await PricingPlan.findOne({ key: user.currentPlanKey });
      if (!plan) {
        return {
          allowed: false,
          reason: 'Plan not found',
          currentUsage: 0,
          limit: 0
        };
      }

      // Check if day pass has expired
      if (user.currentPlanKey === 'day_pass' && plan.dayPassDuration) {
        const dayPassExpiry = new Date(user.usage.lastResetDate.getTime() + (plan.dayPassDuration * 60 * 60 * 1000));
        if (new Date() > dayPassExpiry) {
          return {
            allowed: false,
            reason: 'Day pass has expired',
            currentUsage: user.usage.cvJourneyCount,
            limit: plan.maxCVs
          };
        }
      }

      // Get current usage and limit based on action type
      let currentUsage: number;
      let limit: number;

      switch (context.action) {
        case 'cv_journey':
          currentUsage = user.usage.cvJourneyCount;
          limit = plan.maxCVs;
          break;
        case 'cv_create':
          currentUsage = user.usage.cvCreatedCount;
          limit = plan.maxCVs;
          break;
        case 'export':
          currentUsage = user.usage.exportCount;
          limit = plan.maxExports;
          break;
        case 'ats_check':
          currentUsage = user.usage.atsCheckCount;
          limit = plan.maxCVs; // ATS checks typically count as CV usage
          break;
        default:
          return {
            allowed: false,
            reason: 'Invalid action',
            currentUsage: 0,
            limit: 0
          };
      }

      // Check if limit is exceeded
      const allowed = limit === -1 || currentUsage < limit;

      return {
        allowed,
        reason: allowed ? undefined : `Plan limit exceeded. You have used ${currentUsage}/${limit === -1 ? 'unlimited' : limit} ${context.action.replace('_', ' ')}s`,
        currentUsage,
        limit,
        resetTime: user.currentPlanKey === 'day_pass' && plan.dayPassDuration 
          ? new Date(user.usage.lastResetDate.getTime() + (plan.dayPassDuration * 60 * 60 * 1000))
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
   * Increment usage counter for a specific action
   */
  async incrementUsage(context: ActionContext): Promise<boolean> {
    try {
      await connectToDatabase();

      const updateField = this.getUsageField(context.action);
      if (!updateField) {
        return false;
      }

      await User.findByIdAndUpdate(context.userId, {
        $inc: { [`usage.${updateField}`]: 1 }
      });

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
      case 'cv_journey':
        return 'cvJourneyCount';
      case 'cv_create':
        return 'cvCreatedCount';
      case 'export':
        return 'exportCount';
      case 'ats_check':
        return 'atsCheckCount';
      default:
        return null;
    }
  }
}

export default new UsageLimitsService();
