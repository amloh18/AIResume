// @ts-nocheck
import { connectToDatabase } from '@/lib/database';
import User from '@/models/User';
import { getAdminPricingPlan } from '@/models/admin-models';

export type CreditActionType = 'job_create' | 'ai_generation';
export type CreditResetSchedule = 'monthly' | 'quarterly' | 'yearly' | 'one-time' | 'never';

export interface CreditStatus {
  jobCredits: number;
  aiCredits: number;
  lastResetDate: Date;
  nextResetDate?: Date;
  resetSchedule: CreditResetSchedule;
  planKey: string;
}

export interface PlanCreditAllocation {
  jobCredits: number;
  aiCredits: number;
}

class CreditService {
  /**
   * Get credit allocation for a specific plan
   * Reads from database plan, falls back to hardcoded values if plan not found
   * Free: 1 job credit per month
   * Monthly/Quarterly/Yearly/Lifetime: Unlimited (-1) as long as subscription is active
   */
  async getPlanCredits(planKey: string): Promise<PlanCreditAllocation> {
    try {
      await connectToDatabase();

      // Try to get plan from database first
      const PricingPlan = await getAdminPricingPlan();
      const plan = await PricingPlan.findOne({ key: planKey, status: 'active' }).lean();

      if (plan && plan.credits) {
        return { 
          jobCredits: plan.credits.jobCredits !== undefined ? plan.credits.jobCredits : 1,
          aiCredits: plan.credits.aiCredits !== undefined ? plan.credits.aiCredits : 3
        };
      }

      // Fallback to hardcoded values if plan not found in database
      switch (planKey) {
        case 'free':
          return { jobCredits: 1, aiCredits: 3 }; // 1 job credit, 3 AI credits for free
        case 'starter_yealry':
        case 'focused_monthly':
        case 'focused_yearly':
        case 'smart_quaterly':
        case 'smart_yearly':
        case 'pro_monthly':
        case 'pro_quarterly':
        case 'pro_yearly':
        case 'pro_lifetime':
          return { jobCredits: -1, aiCredits: -1 }; // Unlimited
        default:
          return { jobCredits: 1, aiCredits: 3 }; // Default to free plan
      }
    } catch (error) {
      console.error('Error getting plan credits:', error);
      // Fallback on error
      return { jobCredits: 1, aiCredits: 3 }; // Default to free plan on error
    }
  }

  /**
   * Initialize credits for a user based on their plan
   */
  async initializeCredits(userId: string, planKey: string, session?: any): Promise<boolean> {
    try {
      await connectToDatabase();

      const planCredits = await this.getPlanCredits(planKey);
      const resetSchedule = this.getResetScheduleForPlan(planKey);

      const now = new Date();
      await User.findByIdAndUpdate(userId, {
        $set: {
          'credits.jobCredits': planCredits.jobCredits,
          'credits.aiCredits': planCredits.aiCredits,
          'credits.lastResetDate': now,
          'credits.resetSchedule': resetSchedule
        }
      }, { session });

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

      // For paid plans (monthly/quarterly/yearly/lifetime), check subscription status
      if (['starter_yealry', 'focused_monthly', 'focused_yearly', 'smart_quaterly', 'smart_yearly', 'pro_monthly', 'pro_quarterly', 'pro_yearly', 'pro_lifetime'].includes(user.currentPlanKey)) {
        // Check if user actually has an active subscription
        const subscription = user.subscription;
        const hasActiveSubscription = subscription &&
          subscription.status === 'active' &&
          (subscription.currentPeriodEnd || subscription.accessExpiresAt);

        if (!hasActiveSubscription) {
          // User has paid plan key but no active subscription - treat as free tier
          const currentCredits = user.credits?.jobCredits ?? 0;
          const freeLimit = (await this.getPlanCredits('free')).jobCredits;
          return {
            available: currentCredits > 0,
            creditsRemaining: currentCredits,
            limit: freeLimit
          };
        }

        // Verify subscription hasn't expired by checking time-based access
        const { default: usageLimitsService } = await import('./usageLimitsService');
        const timeCheck = await usageLimitsService.checkTimeBasedAccess(userId);
        if (!timeCheck.hasAccess) {
          // Subscription expired - treat as free tier
          const currentCredits = user.credits?.jobCredits ?? 0;
          const freeLimit = (await this.getPlanCredits('free')).jobCredits;
          return {
            available: currentCredits > 0,
            creditsRemaining: currentCredits,
            limit: freeLimit
          };
        }

        // Unlimited for active paid plans with valid subscription
        return { available: true, creditsRemaining: -1, limit: -1 };
      }

      // For free plan, check credits based on action type
      const planCredits = await this.getPlanCredits(user.currentPlanKey || 'free');

      if (actionType === 'ai_generation') {
        const limit = planCredits.aiCredits;
        
        if (limit === -1) {
          return { available: true, creditsRemaining: -1, limit };
        }
        
        const currentCredits = user.credits?.aiCredits ?? limit;
        return {
          available: currentCredits > 0,
          creditsRemaining: currentCredits,
          limit
        };
      }

      // Default to job_create logic
      const currentCredits = user.credits?.jobCredits ?? 0;
      const limit = planCredits.jobCredits;

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

      const creditField = actionType === 'ai_generation' ? 'credits.aiCredits' : 'credits.jobCredits';
      const totalField = actionType === 'ai_generation' ? 'credits.totalCreated.aiGenerations' : 'credits.totalCreated.jobs';

      const currentCreditsBefore = actionType === 'ai_generation' 
        ? (user.credits?.aiCredits ?? 0) 
        : (user.credits?.jobCredits ?? 0);
        
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
      const isUnlimited = actionType === 'ai_generation' 
        ? planCredits.aiCredits === -1 
        : planCredits.jobCredits === -1;

      console.log(`💳 CreditService.spendCredit - Plan credits limit: ${check.limit}, Is unlimited: ${isUnlimited}`);

      // Build update operation - ensure nested structure exists and increment/decrement
      const updateData: any = {
        $inc: {
          [totalField]: 1
        }
      };

      if (!isUnlimited) {
        updateData.$inc[creditField] = -1;
        console.log(`💳 CreditService.spendCredit - Will decrement ${creditField} by 1`);
      } else {
        console.log(`💳 CreditService.spendCredit - Unlimited plan, skipping ${creditField} decrement`);
      }

      // Ensure the nested structure exists if it doesn't already
      // This is important for users who might not have the credits.totalCreated structure initialized
      if (!user.credits?.totalCreated || user.credits.totalCreated.jobs === undefined) {
        // Use $set to initialize the structure if it doesn't exist
        // This ensures MongoDB can perform the $inc operation
        const currentJobs = user.credits?.totalCreated?.jobs ?? 0;
        const currentAiGenerations = user.credits?.totalCreated?.aiGenerations ?? 0;
        
        updateData.$set = {
          'credits.totalCreated.jobs': actionType === 'job_create' ? currentJobs + 1 : currentJobs,
          'credits.totalCreated.aiGenerations': actionType === 'ai_generation' ? currentAiGenerations + 1 : currentAiGenerations,
          'credits.totalCreated.cvs': user.credits?.totalCreated?.cvs ?? 0,
          'credits.totalCreated.exports': user.credits?.totalCreated?.exports ?? 0,
          'credits.totalCreated.atsChecks': user.credits?.totalCreated?.atsChecks ?? 0
        };
        // Remove $inc since we're using $set
        if (updateData.$inc && totalField in updateData.$inc) {
          delete updateData.$inc[totalField];
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
      const updatedCredits = actionType === 'ai_generation' 
        ? (updateResult.credits?.aiCredits ?? 0)
        : (updateResult.credits?.jobCredits ?? 0);
      const expectedCredits = isUnlimited ? currentCreditsBefore : currentCreditsBefore - 1;
      
      const updatedTotalCreated = actionType === 'ai_generation'
        ? (updateResult.credits?.totalCreated?.aiGenerations ?? 0)
        : (updateResult.credits?.totalCreated?.jobs ?? 0);
        
      const expectedTotalCreated = (actionType === 'ai_generation' 
        ? (user.credits?.totalCreated?.aiGenerations ?? 0) 
        : (user.credits?.totalCreated?.jobs ?? 0)) + 1;

      console.log(`💳 CreditService.spendCredit - Update result:`, {
        creditsBefore: currentCreditsBefore,
        creditsAfter: updatedCredits,
        expectedCredits: expectedCredits,
        totalCreatedBefore: expectedTotalCreated - 1,
        totalCreatedAfter: updatedTotalCreated,
        expectedTotalCreated: expectedTotalCreated
      });

      // Verify both updates worked
      let needsFix = false;
      const fixUpdates: any = {};

      // Verify jobCredits was decremented (for non-unlimited plans)
      if (!isUnlimited && updatedCredits !== expectedCredits) {
        console.error(`❌ CreditService.spendCredit - Credit decrement verification failed! Expected: ${expectedCredits}, Got: ${updatedCredits}`);
        fixUpdates[creditField] = expectedCredits;
        needsFix = true;
      }

      // Verify totalCreated was incremented
      if (updatedTotalCreated !== expectedTotalCreated) {
        console.error(`❌ CreditService.spendCredit - Total created increment failed! Expected: ${expectedTotalCreated}, Got: ${updatedTotalCreated}`);
        fixUpdates[totalField] = expectedTotalCreated;
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
      case 'starter_yealry':
      case 'focused_monthly':
      case 'focused_yearly':
      case 'smart_quaterly':
      case 'smart_yearly':
      case 'pro_monthly':
      case 'pro_quarterly':
      case 'pro_yearly':
      case 'pro_lifetime':
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
