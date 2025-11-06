import { connectToDatabase } from '@/lib/database';
import User from '@/models/User';
import { getAdminPricingPlan } from '@/models/admin-models';

export interface SubscriptionActivationResult {
  success: boolean;
  subscription?: any;
  expiresAt?: Date;
  hoursRemaining?: number;
  daysRemaining?: number;
  error?: string;
}

/**
 * Subscription Management Service
 * Handles subscription activation, renewal, and time-based calculations
 */
class SubscriptionService {
  /**
   * Activate day pass (24-hour access)
   * Note: Quarterly and yearly are also one-time payments, handled similarly
   */
  async activateDayPass(
    userId: string,
    paymentId: string,
    region: string,
    currency: string,
    price: number
  ): Promise<SubscriptionActivationResult> {
    try {
      await connectToDatabase();

      const user = await User.findById(userId);
      if (!user) {
        return { success: false, error: 'User not found' };
      }

      const PricingPlan = await getAdminPricingPlan();
      const plan = await PricingPlan.findOne({ key: 'day_pass', status: 'active' });
      if (!plan) {
        return { success: false, error: 'Day pass plan not found' };
      }

      const now = new Date();
      const durationHours = plan.dayPassDuration || 24;
      const expiresAt = new Date(now.getTime() + durationHours * 60 * 60 * 1000);
      const documentsAllowed = plan.maxCVs || 5; // Typically 5 documents per day pass

      // Find the latest expiry from existing active passes
      let latestExpiry = expiresAt;
      if (user.dayPassPurchases && Array.isArray(user.dayPassPurchases)) {
        const activePasses = user.dayPassPurchases.filter((pass: any) => {
          const passExpiry = new Date(pass.expiresAt);
          return passExpiry > now;
        });
        
        if (activePasses.length > 0) {
          const existingExpiries = activePasses.map((pass: any) => new Date(pass.expiresAt).getTime());
          const latestExisting = new Date(Math.max(...existingExpiries));
          latestExpiry = expiresAt > latestExisting ? expiresAt : latestExisting;
        }
      }

      // Add new day pass purchase to array (don't reset usage counters)
      // This allows cumulative usage across multiple day passes
      await User.findByIdAndUpdate(userId, {
        $set: {
          currentPlanKey: 'day_pass',
          'subscription.planKey': 'day_pass',
          'subscription.status': 'active',
          'subscription.startDate': now,
          'subscription.accessExpiresAt': latestExpiry, // Set to latest expiry across all passes
          'subscription.currentPeriodStart': now,
          'subscription.currentPeriodEnd': latestExpiry,
          'subscription.usageResetDate': latestExpiry,
          'subscription.provider': region === 'IN' ? 'razorpay' : 'stripe',
          'subscription.interval': 'one-time',
          'subscription.purchaseRegion': region,
          'subscription.purchaseCurrency': currency,
          'subscription.purchasePrice': price,
          'subscription.autoRenew': false
        },
        $push: {
          dayPassPurchases: {
            purchaseDate: now,
            expiresAt: expiresAt,
            paymentId: paymentId,
            region: region,
            currency: currency,
            price: price,
            documentsAllowed: documentsAllowed
          }
        }
      });

      const hoursRemaining = durationHours;

      return {
        success: true,
        expiresAt,
        hoursRemaining
      };
    } catch (error) {
      console.error('Error activating day pass:', error);
      return { success: false, error: 'Failed to activate day pass' };
    }
  }

  /**
   * Activate Pro plan (monthly/quarterly/yearly)
   * Monthly = recurring subscription, Quarterly/Yearly = one-time payment
   */
  async activateProPlan(
    userId: string,
    planKey: 'pro_monthly' | 'pro_quarterly' | 'pro_yearly',
    interval: 'monthly' | 'quarterly' | 'yearly',
    paymentId: string,
    region: string,
    currency: string,
    price: number,
    providerSubscriptionId?: string,
    providerCustomerId?: string
  ): Promise<SubscriptionActivationResult> {
    try {
      await connectToDatabase();

      const user = await User.findById(userId);
      if (!user) {
        return { success: false, error: 'User not found' };
      }

      const PricingPlan = await getAdminPricingPlan();
      const plan = await PricingPlan.findOne({ key: planKey, status: 'active' });
      if (!plan) {
        return { success: false, error: 'Plan not found' };
      }

      const now = new Date();
      let expiresAt: Date;
      let daysRemaining: number;
      let autoRenew = false;

      // Calculate expiry based on plan type
      if (planKey === 'pro_monthly') {
        // Monthly: recurring subscription
        const nextMonth = new Date(now);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        expiresAt = nextMonth;
        daysRemaining = 30;
        autoRenew = true; // Only monthly plans auto-renew
      } else if (planKey === 'pro_quarterly') {
        // Quarterly: one-time payment for 90 days
        expiresAt = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
        daysRemaining = 90;
        autoRenew = false;
      } else if (planKey === 'pro_yearly') {
        // Yearly: one-time payment for 365 days
        expiresAt = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
        daysRemaining = 365;
        autoRenew = false;
      } else {
        return { success: false, error: 'Invalid plan key' };
      }

      // Calculate usage reset date (monthly for monthly, at expiry for quarterly/yearly)
      const usageResetDate = planKey === 'pro_monthly'
        ? new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
        : expiresAt;

      // Update user subscription
      const updateData: any = {
        currentPlanKey: planKey,
        'subscription.planKey': planKey,
        'subscription.status': 'active',
        'subscription.startDate': now,
        'subscription.accessExpiresAt': expiresAt,
        'subscription.currentPeriodStart': now,
        'subscription.currentPeriodEnd': expiresAt,
        'subscription.usageResetDate': usageResetDate,
        'subscription.provider': region === 'IN' ? 'razorpay' : 'stripe',
        'subscription.interval': interval,
        'subscription.purchaseRegion': region,
        'subscription.purchaseCurrency': currency,
        'subscription.purchasePrice': price,
        'subscription.autoRenew': autoRenew
      };

      if (providerSubscriptionId) {
        updateData['subscription.providerSubscriptionId'] = providerSubscriptionId;
      }
      if (providerCustomerId) {
        updateData['subscription.providerCustomerId'] = providerCustomerId;
      }

      await User.findByIdAndUpdate(userId, {
        $set: updateData,
        $inc: {
          'usage.cvJourneyCount': 0 // Reset counters on upgrade
        }
      });

      return {
        success: true,
        expiresAt,
        daysRemaining
      };
    } catch (error) {
      console.error('Error activating pro plan:', error);
      return { success: false, error: 'Failed to activate pro plan' };
    }
  }

  /**
   * Handle subscription renewal (for monthly recurring plans only)
   */
  async handleSubscriptionRenewal(
    userId: string
  ): Promise<SubscriptionActivationResult> {
    try {
      await connectToDatabase();

      const user = await User.findById(userId);
      if (!user || !user.subscription) {
        return { success: false, error: 'User or subscription not found' };
      }

      const subscription = user.subscription;

      // Only monthly plans can auto-renew
      if (subscription.planKey !== 'pro_monthly' || !subscription.autoRenew) {
        return { success: false, error: 'Subscription does not support auto-renewal' };
      }

      const now = new Date();
      const nextPeriodStart = subscription.currentPeriodEnd || now;
      const nextPeriodEnd = new Date(nextPeriodStart);
      nextPeriodEnd.setMonth(nextPeriodEnd.getMonth() + 1);

      const usageResetDate = new Date(nextPeriodEnd);

      // Update subscription with new period
      await User.findByIdAndUpdate(userId, {
        $set: {
          'subscription.currentPeriodStart': nextPeriodStart,
          'subscription.currentPeriodEnd': nextPeriodEnd,
          'subscription.usageResetDate': usageResetDate,
          'subscription.status': 'active'
        }
      });

      const daysRemaining = Math.round((nextPeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      return {
        success: true,
        expiresAt: nextPeriodEnd,
        daysRemaining
      };
    } catch (error) {
      console.error('Error handling subscription renewal:', error);
      return { success: false, error: 'Failed to renew subscription' };
    }
  }

  /**
   * Calculate next billing date based on plan and interval
   */
  calculateNextBillingDate(
    planKey: string,
    interval: 'monthly' | 'quarterly' | 'yearly',
    startDate: Date
  ): Date {
    const start = new Date(startDate);

    switch (interval) {
      case 'monthly':
        start.setMonth(start.getMonth() + 1);
        return start;
      case 'quarterly':
        start.setMonth(start.getMonth() + 3);
        return start;
      case 'yearly':
        start.setFullYear(start.getFullYear() + 1);
        return start;
      default:
        return start;
    }
  }

  /**
   * Check and update expired subscriptions
   * Called by cron job to mark subscriptions as expired
   */
  async checkAndUpdateExpiredSubscriptions(): Promise<{
    expired: number;
    updated: number;
  }> {
    try {
      await connectToDatabase();

      const now = new Date();
      const GRACE_PERIOD_MS = 3 * 24 * 60 * 60 * 1000; // 3 days grace period

      // Find subscriptions that should be expired (past grace period)
      const expiredSubscriptions = await User.find({
        $or: [
          // Day pass, quarterly, yearly: check accessExpiresAt
          {
            'subscription.accessExpiresAt': {
              $exists: true,
              $lt: new Date(now.getTime() - GRACE_PERIOD_MS)
            },
            'subscription.status': 'active'
          },
          // Monthly: check currentPeriodEnd
          {
            'subscription.currentPeriodEnd': {
              $exists: true,
              $lt: new Date(now.getTime() - GRACE_PERIOD_MS)
            },
            'subscription.status': 'active',
            'subscription.autoRenew': false
          }
        ]
      });

      let updated = 0;
      for (const user of expiredSubscriptions) {
        await User.findByIdAndUpdate(user._id, {
          $set: {
            'subscription.status': 'expired',
            currentPlanKey: 'free'
          }
        });
        updated++;
      }

      return {
        expired: expiredSubscriptions.length,
        updated
      };
    } catch (error) {
      console.error('Error checking expired subscriptions:', error);
      return { expired: 0, updated: 0 };
    }
  }
}

export default new SubscriptionService();

