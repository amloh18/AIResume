import { connectToDatabase } from '@/lib/database';
import User from '@/models/User';
import { getAdminPricingPlan } from '@/models/admin-models';

export type CreditActionType = 'job_create';
export type CreditResetSchedule = 'monthly' | 'quarterly' | 'yearly' | 'one-time' | 'never';

export interface CreditStatus {
  jobCredits: number;
  lastResetDate: Date;
  nextResetDate?: Date;
  resetSchedule: CreditResetSchedule;
  planKey: string;
}

export interface PlanCreditAllocation {
  jobCredits: number;
}

class CreditService {
  /**
   * Get credit allocation for a specific plan
   * Free: 1 job credit per month
   * Day Pass: 5 job credits (24 hours, no reset)
   * Monthly/Quarterly/Yearly: Unlimited (-1) as long as subscription is active
   */
  async getPlanCredits(planKey: string): Promise<PlanCreditAllocation> {
    try {
      // Credit allocation based on plan
      switch (planKey) {
        case 'free':
          return { jobCredits: 1 }; // 1 credit per month
        case 'day_pass':
          return { jobCredits: 5 }; // 5 credits (24 hours)
        case 'pro_monthly':
        case 'pro_quarterly':
        case 'pro_yearly':
          return { jobCredits: -1 }; // Unlimited
        default:
          return { jobCredits: 1 }; // Default to free plan
      }
    } catch (error) {
      console.error('Error getting plan credits:', error);
      return { jobCredits: 1 }; // Default to free plan on error
    }
  }

  /**
   * Initialize credits for a user based on their plan
   */
  async initializeCredits(userId: string, planKey: string): Promise<boolean> {
    try {
      await connectToDatabase();

      const planCredits = await this.getPlanCredits(planKey);
      const resetSchedule = this.getResetScheduleForPlan(planKey);

      const now = new Date();
      await User.findByIdAndUpdate(userId, {
        $set: {
          'credits.jobCredits': planCredits.jobCredits,
          'credits.lastResetDate': now,
          'credits.resetSchedule': resetSchedule
        }
      });

      return true;
    } catch (error) {
      console.error('Error initializing credits:', error);
      return false;
    }
  }

  /**
   * Check if user has credits available for job creation
   */
  async checkCreditAvailability(
    userId: string,
    actionType: CreditActionType
  ): Promise<{ available: boolean; creditsRemaining: number; limit: number }> {
    try {
      await connectToDatabase();

      const user = await User.findById(userId);
      if (!user) {
        return { available: false, creditsRemaining: 0, limit: 0 };
      }

      // For paid plans (monthly/quarterly/yearly), check subscription status
      if (['pro_monthly', 'pro_quarterly', 'pro_yearly'].includes(user.currentPlanKey)) {
        // Dynamic import to avoid circular dependency
        const { default: usageLimitsService } = await import('./usageLimitsService');
        const timeCheck = await usageLimitsService.checkTimeBasedAccess(userId);
        if (!timeCheck.hasAccess) {
          return { available: false, creditsRemaining: 0, limit: 0 };
        }
        // Unlimited for active paid plans
        return { available: true, creditsRemaining: -1, limit: -1 };
      }

      // For day pass, check if expired
      if (user.currentPlanKey === 'day_pass') {
        // Dynamic import to avoid circular dependency
        const { default: usageLimitsService } = await import('./usageLimitsService');
        const timeCheck = await usageLimitsService.checkTimeBasedAccess(userId);
        if (!timeCheck.hasAccess) {
          return { available: false, creditsRemaining: 0, limit: 0 };
        }
      }

      // For free and day pass, check job credits
      const currentCredits = user.credits?.jobCredits ?? 0;
      const limit = (await this.getPlanCredits(user.currentPlanKey || 'free')).jobCredits;

      // -1 means unlimited
      const available = limit === -1 || currentCredits > 0;

      return {
        available,
        creditsRemaining: limit === -1 ? -1 : currentCredits,
        limit
      };
    } catch (error) {
      console.error('Error checking credit availability:', error);
      return { available: false, creditsRemaining: 0, limit: 0 };
    }
  }

  /**
   * Spend a credit for job creation
   */
  async spendCredit(userId: string, actionType: CreditActionType): Promise<boolean> {
    try {
      console.log(`💳 CreditService.spendCredit - Starting for user: ${userId}, action: ${actionType}`);
      await connectToDatabase();

      // Ensure userId is a valid MongoDB ObjectId string
      const mongoose = await import('mongoose');
      if (!mongoose.default.Types.ObjectId.isValid(userId)) {
        console.error(`❌ CreditService.spendCredit - Invalid userId format: ${userId}`);
        return false;
      }

      const user = await User.findById(userId);
      if (!user) {
        console.error(`❌ CreditService.spendCredit - User not found: ${userId}`);
        return false;
      }

      const currentCreditsBefore = user.credits?.jobCredits ?? 0;
      console.log(`💳 CreditService.spendCredit - User found. Plan: ${user.currentPlanKey}, Current credits BEFORE: ${currentCreditsBefore}`);

      // Check if credits are available
      const check = await this.checkCreditAvailability(userId, actionType);
      console.log(`💳 CreditService.spendCredit - Credit availability check:`, {
        available: check.available,
        creditsRemaining: check.creditsRemaining,
        limit: check.limit
      });

      if (!check.available || (check.limit !== -1 && check.creditsRemaining <= 0)) {
        console.error(`❌ CreditService.spendCredit - Credits not available. Available: ${check.available}, Remaining: ${check.creditsRemaining}, Limit: ${check.limit}`);
        return false;
      }

      // Get plan to check if unlimited
      const planCredits = await this.getPlanCredits(user.currentPlanKey || 'free');
      const isUnlimited = planCredits.jobCredits === -1;

      console.log(`💳 CreditService.spendCredit - Plan credits: ${planCredits.jobCredits}, Is unlimited: ${isUnlimited}`);

      // Build update operation - ensure nested structure exists and increment/decrement
      const updateData: any = {
        $inc: {
          'credits.totalCreated.jobs': 1
        }
      };

      if (!isUnlimited) {
        updateData.$inc['credits.jobCredits'] = -1;
        console.log(`💳 CreditService.spendCredit - Will decrement jobCredits by 1`);
      } else {
        console.log(`💳 CreditService.spendCredit - Unlimited plan, skipping jobCredits decrement`);
      }

      // Ensure the nested structure exists if it doesn't already
      // This is important for users who might not have the credits.totalCreated structure initialized
      if (!user.credits?.totalCreated || user.credits.totalCreated.jobs === undefined) {
        // Use $set to initialize the structure if it doesn't exist
        // This ensures MongoDB can perform the $inc operation
        const currentJobs = user.credits?.totalCreated?.jobs ?? 0;
        updateData.$set = {
          'credits.totalCreated.jobs': currentJobs + 1,
          'credits.totalCreated.cvs': user.credits?.totalCreated?.cvs ?? 0,
          'credits.totalCreated.exports': user.credits?.totalCreated?.exports ?? 0,
          'credits.totalCreated.atsChecks': user.credits?.totalCreated?.atsChecks ?? 0
        };
        // Remove $inc for jobs since we're using $set
        if (updateData.$inc && 'credits.totalCreated.jobs' in updateData.$inc) {
          delete updateData.$inc['credits.totalCreated.jobs'];
          // Clean up $inc if it's now empty
          if (Object.keys(updateData.$inc).length === 0) {
            delete updateData.$inc;
          }
        }
        console.log(`💳 CreditService.spendCredit - Initializing totalCreated structure`);
      }

      // Perform the update
      const updateResult = await User.findByIdAndUpdate(
        userId, 
        updateData, 
        { new: true, runValidators: true, upsert: false }
      );

      if (!updateResult) {
        console.error(`❌ CreditService.spendCredit - Update returned null for user: ${userId}`);
        return false;
      }

      // Verify the update actually worked
      const updatedCredits = updateResult.credits?.jobCredits ?? 0;
      const expectedCredits = isUnlimited ? currentCreditsBefore : currentCreditsBefore - 1;
      const updatedTotalCreated = updateResult.credits?.totalCreated?.jobs ?? 0;
      const expectedTotalCreated = (user.credits?.totalCreated?.jobs ?? 0) + 1;
      
      console.log(`💳 CreditService.spendCredit - Update result:`, {
        jobCreditsBefore: currentCreditsBefore,
        jobCreditsAfter: updatedCredits,
        expectedCredits: expectedCredits,
        totalCreatedBefore: user.credits?.totalCreated?.jobs ?? 0,
        totalCreatedAfter: updatedTotalCreated,
        expectedTotalCreated: expectedTotalCreated
      });

      // Verify both updates worked
      let needsFix = false;
      const fixUpdates: any = {};

      // Verify jobCredits was decremented (for non-unlimited plans)
      if (!isUnlimited && updatedCredits !== expectedCredits) {
        console.error(`❌ CreditService.spendCredit - Credit decrement verification failed! Expected: ${expectedCredits}, Got: ${updatedCredits}`);
        fixUpdates['credits.jobCredits'] = expectedCredits;
        needsFix = true;
      }

      // Verify totalCreated.jobs was incremented
      if (updatedTotalCreated !== expectedTotalCreated) {
        console.error(`❌ CreditService.spendCredit - Total created jobs increment failed! Expected: ${expectedTotalCreated}, Got: ${updatedTotalCreated}`);
        fixUpdates['credits.totalCreated.jobs'] = expectedTotalCreated;
        needsFix = true;
      }

      // Fix any issues found
      if (needsFix) {
        console.log(`⚠️ CreditService.spendCredit - Attempting to fix credit/totalCreated counts`);
        await User.findByIdAndUpdate(userId, {
          $set: fixUpdates
        });
        console.log(`⚠️ CreditService.spendCredit - Fixed credit counts:`, fixUpdates);
      }

      console.log(`✅ CreditService.spendCredit - Credit spent successfully. User: ${userId}, Credits: ${updatedCredits}/${check.limit}`);
      return true;
    } catch (error) {
      console.error(`❌ CreditService.spendCredit - Error spending credit for user ${userId}:`, error);
      return false;
    }
  }

  /**
   * Get current credit status for a user
   */
  async getCreditStatus(userId: string): Promise<CreditStatus | null> {
    try {
      await connectToDatabase();

      const user = await User.findById(userId);
      if (!user) {
        return null;
      }

      const planKey = user.currentPlanKey || 'free';
      const resetSchedule = user.credits?.resetSchedule || this.getResetScheduleForPlan(planKey);

      // Calculate next reset date
      let nextResetDate: Date | undefined;
      if (resetSchedule !== 'never' && resetSchedule !== 'one-time') {
        const lastReset = user.credits?.lastResetDate || new Date();
        nextResetDate = this.calculateNextResetDate(lastReset, resetSchedule);
      }

      return {
        jobCredits: user.credits?.jobCredits ?? 0,
        lastResetDate: user.credits?.lastResetDate || new Date(),
        nextResetDate,
        resetSchedule,
        planKey
      };
    } catch (error) {
      console.error('Error getting credit status:', error);
      return null;
    }
  }

  /**
   * Get reset schedule for a plan
   */
  private getResetScheduleForPlan(planKey: string): CreditResetSchedule {
    switch (planKey) {
      case 'free':
        return 'monthly'; // Resets on 1st of month
      case 'day_pass':
        return 'never'; // No reset, expires with pass
      case 'pro_monthly':
      case 'pro_quarterly':
      case 'pro_yearly':
        return 'never'; // Unlimited, no reset needed
      default:
        return 'monthly';
    }
  }

  /**
   * Calculate next reset date based on schedule
   * For monthly: Reset on 1st of next month
   */
  private calculateNextResetDate(lastReset: Date, schedule: CreditResetSchedule): Date {
    const next = new Date(lastReset);
    
    switch (schedule) {
      case 'monthly':
        // Reset on 1st of next month
        next.setMonth(next.getMonth() + 1);
        next.setDate(1);
        next.setHours(0, 0, 0, 0);
        break;
      case 'quarterly':
        next.setMonth(next.getMonth() + 3);
        break;
      case 'yearly':
        next.setFullYear(next.getFullYear() + 1);
        break;
      default:
        // Default to 1st of next month
        next.setMonth(next.getMonth() + 1);
        next.setDate(1);
        next.setHours(0, 0, 0, 0);
    }

    return next;
  }
}

export default new CreditService();

