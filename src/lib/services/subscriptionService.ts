import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/database';
import User from '@/models/User';
import { getAdminPricingPlan } from '@/models/admin-models';
import creditService from './creditService';
import creditResetService from './creditResetService';

export interface SubscriptionActivationResult {
  success: boolean;
  subscription?: any;
  expiresAt?: Date;
  hoursRemaining?: number;
  daysRemaining?: number;
  error?: string;
}

export const PLAN_TIERS: Record<string, number> = {
  free: 1, // Basic
  starter_monthly: 1, // Basic
  starter_yearly: 1, // Basic
  focused_monthly: 2, // Mid
  focused_yearly: 2, // Mid
  smart_quarterly: 3, // Pro
  smart_yearly: 3, // Pro
  pro_monthly: 2,
  pro_quarterly: 2,
  pro_yearly: 3,
  pro_lifetime: 3
};

/**
 * Subscription Management Service
 * Handles subscription activation, renewal, and time-based calculations
 */
class SubscriptionService {
  /**
   * Get plan tier
   */
  getPlanTier(planKey: string): number {
    if (!planKey) return 1;
    return PLAN_TIERS[planKey] || 1;
  }

  /**
   * Analyze transition between two plans based on hierarchy and frequency
   */
  analyzeSubscriptionTransition(
    currentPlanKey: string,
    targetPlanKey: string,
    currentInterval?: string,
    targetInterval?: string
  ): {
    type: 'upgrade' | 'downgrade' | 'cross_cycle_upgrade' | 'none';
    message: string;
    isDowngrade: boolean;
    isImmediate: boolean;
  } {
    const currentTier = this.getPlanTier(currentPlanKey);
    const targetTier = this.getPlanTier(targetPlanKey);
    
    const curInterval = currentInterval || (currentPlanKey.includes('yearly') ? 'yearly' : currentPlanKey.includes('quarterly') ? 'quarterly' : 'monthly');
    const tgtInterval = targetInterval || (targetPlanKey.includes('yearly') ? 'yearly' : targetPlanKey.includes('quarterly') ? 'quarterly' : 'monthly');

    if (currentPlanKey === targetPlanKey) {
      return { type: 'none', message: 'No plan change selected', isDowngrade: false, isImmediate: true };
    }

    if (targetTier > currentTier) {
      return {
        type: 'upgrade',
        message: 'Upgrade to a higher tier plan. You will receive immediate access with prorated credit.',
        isDowngrade: false,
        isImmediate: true
      };
    }

    if (targetTier < currentTier) {
      return {
        type: 'downgrade',
        message: 'Downgrade to a lower tier plan. This change will take effect at the end of your current billing cycle.',
        isDowngrade: true,
        isImmediate: false
      };
    }

    // Same tier: check frequency
    // Monthly/Quarterly to Yearly -> upgrade (Cross-Cycle Upgrade)
    const isCurrentShorter = curInterval === 'monthly' || curInterval === 'quarterly';
    const isTargetYearly = tgtInterval === 'yearly';

    if (isCurrentShorter && isTargetYearly) {
      return {
        type: 'cross_cycle_upgrade',
        message: 'Switching to annual billing. Immediate switch with prorated credit applied.',
        isDowngrade: false,
        isImmediate: true
      };
    }

    // Changing same tier to shorter frequency (e.g. focused_yearly to focused_monthly) -> downgrade
    if (curInterval === 'yearly' && (tgtInterval === 'monthly' || tgtInterval === 'quarterly')) {
      return {
        type: 'downgrade',
        message: 'Downgrade billing frequency. This change will take effect at the end of your current billing cycle.',
        isDowngrade: true,
        isImmediate: false
      };
    }

    // Same tier, same frequency
    return { type: 'none', message: 'No billing cycle change selected', isDowngrade: false, isImmediate: true };
  }

  /**
   * Calculate proration credit based on calendar days remaining in current period
   */
  calculateProrationCredit(
    currentPeriodStart: Date | string | undefined,
    currentPeriodEnd: Date | string | undefined,
    purchasePrice: number | undefined
  ): number {
    if (!currentPeriodStart || !currentPeriodEnd || !purchasePrice || purchasePrice <= 0) {
      return 0;
    }

    const start = new Date(currentPeriodStart);
    const end = new Date(currentPeriodEnd);
    const now = new Date();

    if (now >= end || now <= start) {
      return 0;
    }

    const oneDay = 24 * 60 * 60 * 1000;
    const totalDays = Math.ceil((end.getTime() - start.getTime()) / oneDay);
    const remainingDays = Math.ceil((end.getTime() - now.getTime()) / oneDay);

    if (totalDays <= 0 || remainingDays <= 0) {
      return 0;
    }

    const credit = (remainingDays / totalDays) * purchasePrice;
    return Math.round(credit * 100) / 100;
  }

  /**
   * Apply a pending downgrade to a user's subscription
   */
  async applyPendingDowngrade(userId: string): Promise<boolean> {
    try {
      await connectToDatabase();
      const user = await User.findById(userId);
      if (!user || !user.subscription || user.subscription.downgradeStatus !== 'pending') {
        return false;
      }

      const newPlanKey = user.subscription.pendingDowngradePlanKey;
      if (!newPlanKey) return false;

      const PricingPlan = await getAdminPricingPlan();
      const plan = await PricingPlan.findOne({ key: newPlanKey });
      if (!plan) {
        console.error(`Downgrade plan ${newPlanKey} not found for user ${userId}`);
        return false;
      }

      const now = new Date();
      const expiresAt = new Date(now);
      expiresAt.setMonth(expiresAt.getMonth() + 1); // Default to monthly interval

      // Switch to new plan
      user.currentPlanKey = newPlanKey;
      user.subscription.planKey = newPlanKey as any;
      user.subscription.downgradeStatus = 'none';
      user.subscription.pendingDowngradePlanKey = null;
      
      // If the target plan is free / starter_monthly, activate it fully
      if (newPlanKey === 'starter_monthly' || newPlanKey === 'free') {
        user.subscription.status = 'active';
        user.subscription.provider = 'none';
        user.subscription.purchasePrice = 0;
        user.subscription.autoRenew = true;
        user.subscription.accessExpiresAt = expiresAt;
        user.subscription.currentPeriodStart = now;
        user.subscription.currentPeriodEnd = expiresAt;
        user.subscription.usageResetDate = expiresAt;
      } else {
        // Paid plan downgrade
        user.subscription.status = 'active'; // Transition is successful
        user.subscription.currentPeriodStart = now;
        user.subscription.currentPeriodEnd = expiresAt;
        user.subscription.accessExpiresAt = expiresAt;
        user.subscription.usageResetDate = expiresAt;
      }

      await user.save();

      // Initialize credits for new plan
      await creditService.initializeCredits(userId, newPlanKey);

      console.log(`Successfully completed downgrade transition to ${newPlanKey} for user ${userId}`);
      return true;
    } catch (error) {
      console.error(`Error applying downgrade for user ${userId}:`, error);
      return false;
    }
  }

  /**
   * Create a new subscription document and update the user's plan inside a transaction session
   */
  async createSubscription(
    userId: string | mongoose.Types.ObjectId,
    planId: string | mongoose.Types.ObjectId,
    billingCycle: 'monthly' | 'quarterly' | 'yearly' | 'one-time',
    amount: number,
    currency: string,
    paymentMethod: 'polar' | 'stripe',
    paymentProviderId: string,
    discountCodeId: string | mongoose.Types.ObjectId | null,
    discountAmount: number,
    metadata: any = {},
    session?: any
  ): Promise<any> {
    await connectToDatabase();

    const PricingPlan = await getAdminPricingPlan();
    const pricingPlan = await PricingPlan.findById(planId).session(session);
    if (!pricingPlan) {
      throw new Error(`Pricing plan not found for ID: ${planId}`);
    }

    const planKey = pricingPlan.key;
    const now = new Date();
    let expiresAt = new Date(now);
    let autoRenew = false;

    // Calculate expiry date based on plan type
    if (planKey === 'pro_monthly' || planKey === 'focused_monthly' || planKey === 'starter_monthly') {
      expiresAt.setMonth(expiresAt.getMonth() + 1);
      autoRenew = true;
    } else if (planKey === 'pro_quarterly' || planKey === 'smart_quarterly') {
      expiresAt = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
      autoRenew = false;
    } else if (planKey === 'pro_yearly' || planKey === 'starter_yearly' || planKey === 'focused_yearly' || planKey === 'smart_yearly') {
      expiresAt = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
      autoRenew = billingCycle === 'yearly';
    } else if (planKey === 'pro_lifetime') {
      expiresAt = new Date(now.getTime() + 36500 * 24 * 60 * 60 * 1000);
      autoRenew = false;
    } else {
      // Fallback
      expiresAt.setMonth(expiresAt.getMonth() + 1);
      autoRenew = false;
    }

    // Retrieve user inside the transaction to get cumulative access end time if applicable
    const user = await User.findById(userId).session(session);
    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }

    // Check for subscription upgrade or cross-cycle transition to apply proration credit
    const transition = this.analyzeSubscriptionTransition(user.currentPlanKey || 'free', planKey);
    if ((transition.type === 'upgrade' || transition.type === 'cross_cycle_upgrade') && amount > 0) {
      const oldSub = user.subscription;
      if (oldSub && oldSub.status === 'active' && oldSub.purchasePrice > 0) {
        const prorationCredit = this.calculateProrationCredit(
          oldSub.currentPeriodStart,
          oldSub.currentPeriodEnd,
          oldSub.purchasePrice
        );
        
        if (prorationCredit > 0) {
          let newPlanDays = 30;
          if (billingCycle === 'yearly') newPlanDays = 365;
          else if (billingCycle === 'quarterly') newPlanDays = 90;
          
          const newPlanDailyRate = amount / newPlanDays;
          if (newPlanDailyRate > 0) {
            const additionalDays = Math.round(prorationCredit / newPlanDailyRate);
            if (additionalDays > 0) {
              console.log(`Applying proration credit: $${prorationCredit} -> extending subscription by ${additionalDays} days`);
              expiresAt.setDate(expiresAt.getDate() + additionalDays);
              metadata.prorationCreditApplied = prorationCredit;
              metadata.prorationDaysAdded = additionalDays;
            }
          }
        }
      }
    }

    const usageResetDate = (planKey === 'pro_monthly' || planKey === 'focused_monthly' || planKey === 'starter_monthly')
      ? new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
      : expiresAt;

    const Subscription = await import('@/models/Subscription').then(m => m.default);
    const subDocs = await Subscription.create([{
      userId,
      planId,
      status: 'active',
      startDate: now,
      endDate: expiresAt,
      billingCycle,
      amount: amount + discountAmount, // Gross amount
      currency: currency.toUpperCase(),
      paymentMethod,
      paymentProviderId,
      discountCodeId: discountCodeId || undefined,
      discountAmount,
      finalAmount: amount, // Net amount paid
      nextBillingDate: autoRenew ? expiresAt : undefined,
      metadata: {
        polarCustomerId: metadata.polarCustomerId,
        invoiceUrl: metadata.invoiceUrl,
        receiptUrl: metadata.receiptUrl,
        prorationCreditApplied: metadata.prorationCreditApplied,
        prorationDaysAdded: metadata.prorationDaysAdded
      }
    }], { session });

    const subscription = subDocs[0];

    // Build the user update data
    const userUpdate: any = {
      $set: {
        currentPlanKey: planKey,
        'subscription.planKey': planKey,
        'subscription.status': 'active',
        'subscription.startDate': now,
        'subscription.accessExpiresAt': expiresAt,
        'subscription.currentPeriodStart': now,
        'subscription.currentPeriodEnd': expiresAt,
        'subscription.usageResetDate': usageResetDate,
        'subscription.provider': paymentMethod,
        'subscription.interval': billingCycle,
        'subscription.purchaseRegion': metadata.region || 'US',
        'subscription.purchaseCurrency': currency,
        'subscription.purchasePrice': amount,
        'subscription.autoRenew': autoRenew,
        'subscription.providerSubscriptionId': paymentProviderId,
        'subscription.providerCustomerId': metadata.polarCustomerId
      }
    };

    await User.findByIdAndUpdate(userId, userUpdate, { session });

    // Initialize credits inside the session transaction
    await creditService.initializeCredits(userId.toString(), planKey, session);

    return subscription;
  }


  /**
   * Activate Pro plan (monthly/quarterly/yearly)
   * Monthly = recurring subscription, Quarterly/Yearly = one-time payment
   */
  async activateProPlan(
    userId: string,
    planKey: 'starter_monthly' | 'starter_yearly' | 'focused_monthly' | 'focused_yearly' | 'smart_quarterly' | 'smart_yearly' | 'pro_monthly' | 'pro_quarterly' | 'pro_yearly' | 'pro_lifetime',
    interval: 'monthly' | 'quarterly' | 'yearly' | 'lifetime' | 'one-time',
    paymentId: string,
    region: string,
    currency: string,
    price: number,
    providerSubscriptionId?: string,
    providerCustomerId?: string
  ): Promise<SubscriptionActivationResult> {
    try {
      await connectToDatabase();

      // STATE VERIFICATION: Check user state before activation
      const stateBefore = await this.verifyUserState(userId);
      console.log('🔍 SubscriptionService - State before pro plan activation:', {
        userId,
        planKey,
        currentPlan: stateBefore.currentPlan,
        subscriptionStatus: stateBefore.currentSubscriptionStatus,
        warnings: stateBefore.warnings,
        errors: stateBefore.errors
      });

      if (!stateBefore.valid) {
        return { 
          success: false, 
          error: `Invalid user state: ${stateBefore.errors?.join(', ')}` 
        };
      }

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
      if (planKey === 'pro_monthly' || planKey === 'focused_monthly' || planKey === 'starter_monthly') {
        // Monthly: recurring subscription
        const nextMonth = new Date(now);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        expiresAt = nextMonth;
        daysRemaining = 30;
        autoRenew = true; // Monthly plans auto-renew
      } else if (planKey === 'pro_quarterly' || planKey === 'smart_quarterly') {
        // Quarterly: one-time payment for 90 days
        expiresAt = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
        daysRemaining = 90;
        autoRenew = false;
      } else if (planKey === 'pro_yearly' || planKey === 'starter_yearly' || planKey === 'focused_yearly' || planKey === 'smart_yearly') {
        // Yearly: recurring or one-time payment for 365 days
        expiresAt = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
        daysRemaining = 365;
        autoRenew = interval === 'yearly';
      } else if (planKey === 'pro_lifetime') {
        // Lifetime: one-time payment for 100 years
        expiresAt = new Date(now.getTime() + 36500 * 24 * 60 * 60 * 1000);
        daysRemaining = 36500;
        autoRenew = false;
      } else {
        return { success: false, error: 'Invalid plan key' };
      }

      // Calculate usage reset date (monthly for monthly, at expiry for quarterly/yearly)
      const usageResetDate = (planKey === 'pro_monthly' || planKey === 'focused_monthly' || planKey === 'starter_monthly')
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
        'subscription.provider': 'polar',
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

      // Initialize credits for pro plan
      await creditService.initializeCredits(userId, planKey);

      // STATE VERIFICATION: Check user state after activation
      const stateAfter = await this.verifyUserState(userId);
      console.log('✅ SubscriptionService - State after pro plan activation:', {
        userId,
        planKey,
        currentPlan: stateAfter.currentPlan,
        subscriptionStatus: stateAfter.currentSubscriptionStatus,
        warnings: stateAfter.warnings
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

      // Reset credits on renewal
      await creditResetService.resetUserCredits(userId);

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
   * Verify user state before activating subscription
   * Checks current plan, credits, and subscription status
   */
  async verifyUserState(userId: string): Promise<{
    valid: boolean;
    currentPlan?: string;
    currentSubscriptionStatus?: string;
    credits?: {
      jobCredits: number;
      limit: number;
    };
    subscription?: {
      planKey: string;
      status: string;
      expiresAt?: Date;
      currentPeriodEnd?: Date;
    };
    warnings?: string[];
    errors?: string[];
  }> {
    try {
      await connectToDatabase();

      const user = await User.findById(userId);
      if (!user) {
        return {
          valid: false,
          errors: ['User not found']
        };
      }

      const state: any = {
        valid: true,
        currentPlan: user.currentPlanKey || 'free',
        currentSubscriptionStatus: user.subscription?.status || 'none',
        warnings: [],
        errors: []
      };

      // Get current credits
      const creditCheck = await creditService.checkCreditAvailability(userId, 'job_create');
      state.credits = {
        jobCredits: creditCheck.creditsRemaining,
        limit: creditCheck.limit
      };

      // Get subscription info
      if (user.subscription) {
        state.subscription = {
          planKey: user.subscription.planKey || 'free',
          status: user.subscription.status || 'none',
          expiresAt: user.subscription.accessExpiresAt,
          currentPeriodEnd: user.subscription.currentPeriodEnd
        };
      }

      // Check for potential issues
      if (user.subscription?.status === 'active' && user.currentPlanKey !== 'free') {
        // Check if subscription is about to expire
        const expiresAt = user.subscription.accessExpiresAt || user.subscription.currentPeriodEnd;
        if (expiresAt) {
          const expiryDate = new Date(expiresAt);
          const now = new Date();
          const daysUntilExpiry = Math.round((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          
          if (daysUntilExpiry < 0) {
            state.warnings?.push('Subscription has expired');
          } else if (daysUntilExpiry <= 7) {
            state.warnings?.push(`Subscription expires in ${daysUntilExpiry} days`);
          }
        }
      }

      // Check for conflicting states
      if (user.subscription?.status === 'active' && user.currentPlanKey === 'free') {
        state.warnings?.push('Subscription status is active but plan is free - possible state mismatch');
      }

      if (user.subscription?.status === 'expired' && user.currentPlanKey !== 'free') {
        state.warnings?.push('Subscription is expired but plan is not free - should be downgraded');
      }

      return state;
    } catch (error: any) {
      console.error('Error verifying user state:', error);
      return {
        valid: false,
        errors: [error.message || 'Failed to verify user state']
      };
    }
  }

  /**
   * Check and update expired subscriptions
   * Called by cron job to mark subscriptions as expired and process pending downgrades
   */
  async checkAndUpdateExpiredSubscriptions(): Promise<{
    expired: number;
    updated: number;
    downgradesApplied: number;
  }> {
    try {
      await connectToDatabase();

      const now = new Date();
      const GRACE_PERIOD_MS = 3 * 24 * 60 * 60 * 1000; // 3 days grace period

      // 1. Process pending downgrades first if renewal date is reached
      const pendingDowngradesDue = await User.find({
        'subscription.downgradeStatus': 'pending',
        $or: [
          { 'subscription.currentPeriodEnd': { $lte: now } },
          { 'subscription.accessExpiresAt': { $lte: now } }
        ]
      });

      let downgradesApplied = 0;
      for (const user of pendingDowngradesDue) {
        const success = await this.applyPendingDowngrade(user._id.toString());
        if (success) {
          downgradesApplied++;
        }
      }

      // 2. Find subscriptions that should be expired (past grace period)
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
        updated,
        downgradesApplied
      };
    } catch (error) {
      console.error('Error checking expired subscriptions:', error);
      return { expired: 0, updated: 0, downgradesApplied: 0 };
    }
  }
  /**
   * Get effective subscription state (dynamically checks for expiration)
   */
  getEffectivePlan(user: any): { currentPlanKey: string; subscription: any; isExpired: boolean } {
    if (!user || !user.subscription) {
      return {
        currentPlanKey: 'starter_monthly',
        subscription: null,
        isExpired: false
      };
    }

    const sub = user.subscription;
    const now = new Date();
    let isExpired = false;

    if (sub.status === 'active' && user.currentPlanKey !== 'starter_monthly') {
      const expiresAt = sub.accessExpiresAt || sub.currentPeriodEnd || sub.endDate;
      if (expiresAt) {
        const expiryDate = new Date(expiresAt);
        // If the expiration date is in the past, treat it as expired
        if (expiryDate.getTime() < now.getTime()) {
          isExpired = true;
        }
      }
    }

    if (isExpired || sub.status === 'expired') {
      return {
        currentPlanKey: 'starter_monthly',
        subscription: {
          ...sub,
          status: 'expired',
          planKey: 'starter_monthly'
        },
        isExpired: true
      };
    }

    return {
      currentPlanKey: user.currentPlanKey || 'starter_monthly',
      subscription: sub,
      isExpired: false
    };
  }

}

export default new SubscriptionService();
