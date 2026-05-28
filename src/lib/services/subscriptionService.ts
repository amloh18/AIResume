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

/**
 * Subscription Management Service
 * Handles subscription activation, renewal, and time-based calculations
 */
class SubscriptionService {
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
    if (planKey === 'pro_monthly') {
      expiresAt.setMonth(expiresAt.getMonth() + 1);
      autoRenew = true;
    } else if (planKey === 'pro_quarterly') {
      expiresAt = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
    } else if (planKey === 'pro_yearly') {
      expiresAt = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
      autoRenew = billingCycle === 'yearly';
    } else if (planKey === 'pro_lifetime') {
      expiresAt = new Date(now.getTime() + 36500 * 24 * 60 * 60 * 1000);
    } else {
      // Fallback
      expiresAt.setMonth(expiresAt.getMonth() + 1);
    }

    const usageResetDate = planKey === 'pro_monthly'
      ? new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
      : expiresAt;

    // Retrieve user inside the transaction to get cumulative access end time if applicable
    const user = await User.findById(userId).session(session);
    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }

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
        receiptUrl: metadata.receiptUrl
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
    planKey: 'starter_yealry' | 'focused_monthly' | 'focused_yearly' | 'smart_quaterly' | 'smart_yearly' | 'pro_monthly' | 'pro_quarterly' | 'pro_yearly' | 'pro_lifetime',
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
      if (planKey === 'pro_monthly' || planKey === 'focused_monthly') {
        // Monthly: recurring subscription
        const nextMonth = new Date(now);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        expiresAt = nextMonth;
        daysRemaining = 30;
        autoRenew = true; // Only monthly plans auto-renew
      } else if (planKey === 'pro_quarterly' || planKey === 'smart_quaterly') {
        // Quarterly: one-time payment for 90 days
        expiresAt = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
        daysRemaining = 90;
        autoRenew = false;
      } else if (planKey === 'pro_yearly' || planKey === 'starter_yealry' || planKey === 'focused_yearly' || planKey === 'smart_yearly') {
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
      const usageResetDate = (planKey === 'pro_monthly' || planKey === 'focused_monthly')
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
  /**
   * Get effective subscription state (dynamically checks for expiration)
   */
  getEffectivePlan(user: any): { currentPlanKey: string; subscription: any; isExpired: boolean } {
    if (!user || !user.subscription) {
      return {
        currentPlanKey: 'free',
        subscription: null,
        isExpired: false
      };
    }

    const sub = user.subscription;
    const now = new Date();
    let isExpired = false;

    if (sub.status === 'active' && user.currentPlanKey !== 'free') {
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
        currentPlanKey: 'free',
        subscription: {
          ...sub,
          status: 'expired',
          planKey: 'free'
        },
        isExpired: true
      };
    }

    return {
      currentPlanKey: user.currentPlanKey || 'free',
      subscription: sub,
      isExpired: false
    };
  }

}

export default new SubscriptionService();
