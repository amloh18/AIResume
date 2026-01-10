import { connectToDatabase } from '@/lib/database';
import User from '@/models/User';
import creditService from './creditService';
import { CreditResetSchedule } from './creditService';

class CreditResetService {
  /**
   * Reset credits for a user based on their plan
   */
  async resetUserCredits(userId: string): Promise<boolean> {
    try {
      await connectToDatabase();

      const user = await User.findById(userId);
      if (!user) {
        return false;
      }

      const planKey = user.currentPlanKey || 'free';
      const resetSchedule = user.credits?.resetSchedule || this.getResetScheduleForPlan(planKey);

      // Day pass and one-time plans don't reset
      if (resetSchedule === 'never' || resetSchedule === 'one-time') {
        return false;
      }

      // Initialize credits for the plan (this sets them to plan limits)
      const success = await creditService.initializeCredits(userId, planKey);

      return success;
    } catch (error) {
      console.error('Error resetting user credits:', error);
      return false;
    }
  }

  /**
   * Get the next reset date for a user
   */
  async getResetDate(userId: string): Promise<Date | null> {
    try {
      await connectToDatabase();

      const user = await User.findById(userId);
      if (!user) {
        return null;
      }

      const planKey = user.currentPlanKey || 'free';
      const resetSchedule = user.credits?.resetSchedule || this.getResetScheduleForPlan(planKey);

      // Day pass and one-time plans don't reset
      if (resetSchedule === 'never' || resetSchedule === 'one-time') {
        return null;
      }

      const lastReset = user.credits?.lastResetDate || new Date();
      return this.calculateNextResetDate(lastReset, resetSchedule);
    } catch (error) {
      console.error('Error getting reset date:', error);
      return null;
    }
  }

  /**
   * Check if a user's credits need to be reset
   * For free plan: Reset on 1st of each month
   */
  async shouldResetCredits(userId: string): Promise<boolean> {
    try {
      await connectToDatabase();

      const user = await User.findById(userId);
      if (!user) {
        return false;
      }

      const planKey = user.currentPlanKey || 'free';
      const resetSchedule = user.credits?.resetSchedule || this.getResetScheduleForPlan(planKey);

      // Day pass and paid plans don't reset
      if (resetSchedule === 'never' || resetSchedule === 'one-time') {
        return false;
      }

      const lastReset = user.credits?.lastResetDate || new Date();
      const now = new Date();

      // For monthly reset (free plan), check if we're past the 1st of current month
      if (resetSchedule === 'monthly') {
        // If last reset was before the 1st of current month, reset is needed
        const firstOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        return lastReset < firstOfCurrentMonth;
      }

      // For other schedules, use the calculated next reset date
      const nextReset = this.calculateNextResetDate(lastReset, resetSchedule);
      return now >= nextReset;
    } catch (error) {
      console.error('Error checking if credits should reset:', error);
      return false;
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
      case 'pro_lifetime':
        return 'yearly';
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

  /**
   * Reset credits for all users who need it (for cron job)
   * Should run daily, but only resets free plan users on 1st of month
   */
  async resetCreditsForEligibleUsers(): Promise<{ reset: number; skipped: number }> {
    try {
      await connectToDatabase();

      // Only reset free plan users (monthly reset on 1st)
      const users = await User.find({
        currentPlanKey: 'free',
        'credits.resetSchedule': 'monthly'
      });

      let reset = 0;
      let skipped = 0;

      for (const user of users) {
        const shouldReset = await this.shouldResetCredits(user._id.toString());
        if (shouldReset) {
          const success = await this.resetUserCredits(user._id.toString());
          if (success) {
            reset++;
          } else {
            skipped++;
          }
        } else {
          skipped++;
        }
      }

      return { reset, skipped };
    } catch (error) {
      console.error('Error resetting credits for eligible users:', error);
      return { reset: 0, skipped: 0 };
    }
  }
}

export default new CreditResetService();

