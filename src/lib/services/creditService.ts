import { connectToDatabase } from '@/lib/database';
import User from '@/models/User';
import { getAdminPricingPlan } from '@/models/admin-models';

export type CreditActionType = 'cv_create' | 'cv_journey' | 'export' | 'ats_check';
export type CreditResetSchedule = 'monthly' | 'quarterly' | 'yearly' | 'one-time' | 'never';

export interface CreditStatus {
  cvCredits: number;
  exportCredits: number;
  atsCheckCredits: number;
  lastResetDate: Date;
  nextResetDate?: Date;
  resetSchedule: CreditResetSchedule;
  planKey: string;
}

export interface PlanCreditAllocation {
  cvCredits: number;
  exportCredits: number;
  atsCheckCredits: number;
}

class CreditService {
  /**
   * Get credit allocation for a specific plan
   */
  async getPlanCredits(planKey: string): Promise<PlanCreditAllocation> {
    try {
      await connectToDatabase();

      const PricingPlan = await getAdminPricingPlan();
      const plan = await PricingPlan.findOne({ key: planKey, status: 'active' });

      if (!plan) {
        // Default to free plan credits if plan not found
        return {
          cvCredits: 3,
          exportCredits: 3,
          atsCheckCredits: 3
        };
      }

      // -1 means unlimited
      return {
        cvCredits: plan.maxCVs === -1 ? -1 : plan.maxCVs,
        exportCredits: plan.maxExports === -1 ? -1 : plan.maxExports,
        atsCheckCredits: plan.maxCVs === -1 ? -1 : plan.maxCVs // ATS checks use CV credits
      };
    } catch (error) {
      console.error('Error getting plan credits:', error);
      // Return free plan defaults on error
      return {
        cvCredits: 3,
        exportCredits: 3,
        atsCheckCredits: 3
      };
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
          'credits.cvCredits': planCredits.cvCredits,
          'credits.exportCredits': planCredits.exportCredits,
          'credits.atsCheckCredits': planCredits.atsCheckCredits,
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
   * Check if user has credits available for an action
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

      // Get current credits based on action type
      let currentCredits: number;
      let limit: number;

      switch (actionType) {
        case 'cv_create':
        case 'cv_journey':
          currentCredits = user.credits?.cvCredits ?? 0;
          limit = (await this.getPlanCredits(user.currentPlanKey || 'free')).cvCredits;
          break;
        case 'export':
          currentCredits = user.credits?.exportCredits ?? 0;
          limit = (await this.getPlanCredits(user.currentPlanKey || 'free')).exportCredits;
          break;
        case 'ats_check':
          currentCredits = user.credits?.atsCheckCredits ?? 0;
          limit = (await this.getPlanCredits(user.currentPlanKey || 'free')).atsCheckCredits;
          break;
        default:
          return { available: false, creditsRemaining: 0, limit: 0 };
      }

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
   * Spend a credit for a specific action
   */
  async spendCredit(userId: string, actionType: CreditActionType): Promise<boolean> {
    try {
      await connectToDatabase();

      const user = await User.findById(userId);
      if (!user) {
        return false;
      }

      // Check if credits are available
      const check = await this.checkCreditAvailability(userId, actionType);
      if (!check.available || (check.limit !== -1 && check.creditsRemaining <= 0)) {
        return false;
      }

      // Determine which credit field to decrement
      let creditField: string;
      let totalField: string;

      switch (actionType) {
        case 'cv_create':
          creditField = 'credits.cvCredits';
          totalField = 'credits.totalCreated.cvs';
          break;
        case 'cv_journey':
          creditField = 'credits.cvCredits';
          totalField = 'credits.totalCreated.cvs';
          break;
        case 'export':
          creditField = 'credits.exportCredits';
          totalField = 'credits.totalCreated.exports';
          break;
        case 'ats_check':
          creditField = 'credits.atsCheckCredits';
          totalField = 'credits.totalCreated.atsChecks';
          break;
        default:
          return false;
      }

      // Get plan to check if unlimited
      const planCredits = await this.getPlanCredits(user.currentPlanKey || 'free');
      const isUnlimited = actionType === 'cv_create' || actionType === 'cv_journey'
        ? planCredits.cvCredits === -1
        : actionType === 'export'
        ? planCredits.exportCredits === -1
        : planCredits.atsCheckCredits === -1;

      // Only decrement if not unlimited
      const updateData: any = {
        $inc: { [totalField]: 1 }
      };

      if (!isUnlimited) {
        updateData.$inc[creditField] = -1;
      }

      await User.findByIdAndUpdate(userId, updateData);

      return true;
    } catch (error) {
      console.error('Error spending credit:', error);
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
        cvCredits: user.credits?.cvCredits ?? 0,
        exportCredits: user.credits?.exportCredits ?? 0,
        atsCheckCredits: user.credits?.atsCheckCredits ?? 0,
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
        return 'monthly';
      case 'day_pass':
        return 'never'; // Day pass credits expire with the pass
      case 'pro_monthly':
        return 'monthly';
      case 'pro_quarterly':
        return 'quarterly';
      case 'pro_yearly':
        return 'yearly';
      default:
        return 'monthly';
    }
  }

  /**
   * Calculate next reset date based on schedule
   */
  private calculateNextResetDate(lastReset: Date, schedule: CreditResetSchedule): Date {
    const next = new Date(lastReset);
    
    switch (schedule) {
      case 'monthly':
        next.setMonth(next.getMonth() + 1);
        break;
      case 'quarterly':
        next.setMonth(next.getMonth() + 3);
        break;
      case 'yearly':
        next.setFullYear(next.getFullYear() + 1);
        break;
      default:
        next.setMonth(next.getMonth() + 1);
    }

    return next;
  }
}

export default new CreditService();

