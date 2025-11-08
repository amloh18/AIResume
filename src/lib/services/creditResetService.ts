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

      // Day pass and one-time plans don't reset
      if (resetSchedule === 'never' || resetSchedule === 'one-time') {
        return false;
      }

      const lastReset = user.credits?.lastResetDate || new Date();
      const nextReset = this.calculateNextResetDate(lastReset, resetSchedule);
      const now = new Date();

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

  /**
   * Reset credits for all users who need it (for cron job)
   */
  async resetCreditsForEligibleUsers(): Promise<{ reset: number; skipped: number }> {
    try {
      await connectToDatabase();

      const users = await User.find({
        'subscription.status': 'active',
        $or: [
          { 'credits.resetSchedule': 'monthly' },
          { 'credits.resetSchedule': 'quarterly' },
          { 'credits.resetSchedule': 'yearly' }
        ]
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

