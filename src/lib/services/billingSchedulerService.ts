/**
 * Billing Scheduler Service
 * Handles automated subscription renewals, dunning, and failed payment retries
 */

import { getConnection } from '../database/connection-manager';
import Subscription from '@/models/Subscription';
import Transaction from '@/models/Transaction';
import User from '@/models/User';
import PaymentMethod from '@/models/PaymentMethod';

/**
 * Process subscription renewals for subscriptions due today
 */
export async function processRenewals(): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
  errors: string[];
}> {
  const results = {
    processed: 0,
    succeeded: 0,
    failed: 0,
    errors: [] as string[]
  };

  try {
    await getConnection();

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Find all active subscriptions with nextBillingDate today
    // Using optimized compound index: { status: 1, nextBillingDate: 1 }
    const subscriptions = await Subscription.find({
      status: 'active',
      nextBillingDate: {
        $gte: today,
        $lt: tomorrow
      }
    }).populate('userId');

    console.log(`Found ${subscriptions.length} subscriptions to renew`);

    for (const subscription of subscriptions) {
      results.processed++;
      
      try {
        // Get user's default payment method
        const user = await User.findById(subscription.userId);
        if (!user) {
          results.errors.push(`User not found for subscription ${subscription._id}`);
          results.failed++;
          continue;
        }

        // Find default payment method
        const paymentMethod = await PaymentMethod.findOne({
          userId: subscription.userId,
          isDefault: true,
          isActive: true
        });

        if (!paymentMethod) {
          // No payment method - mark subscription as past_due
          await Subscription.findByIdAndUpdate(subscription._id, {
            status: 'past_due'
          });
          results.errors.push(`No payment method for subscription ${subscription._id}`);
          results.failed++;
          continue;
        }

        // Attempt to charge the payment method
        // This would integrate with Stripe/Razorpay to charge the customer
        // For now, we'll just log and update the subscription
        // In production, you would:
        // 1. Call Stripe/Razorpay API to charge the customer
        // 2. Create Transaction record
        // 3. Create Invoice record
        // 4. Update subscription nextBillingDate

        // TODO: Implement actual payment gateway charge
        // For now, simulate success
        const chargeSuccess = true; // Replace with actual gateway call

        if (chargeSuccess) {
          // Calculate next billing date based on billing cycle
          const nextBillingDate = calculateNextBillingDate(
            subscription.billingCycle,
            new Date()
          );

          await Subscription.findByIdAndUpdate(subscription._id, {
            nextBillingDate,
            status: 'active'
          });

          results.succeeded++;
        } else {
          // Charge failed - mark as past_due
          await Subscription.findByIdAndUpdate(subscription._id, {
            status: 'past_due'
          });
          results.failed++;
        }
      } catch (error: any) {
        results.errors.push(`Error processing subscription ${subscription._id}: ${error.message}`);
        results.failed++;
      }
    }

    return results;
  } catch (error: any) {
    console.error('Error processing renewals:', error);
    results.errors.push(`Fatal error: ${error.message}`);
    return results;
  }
}

/**
 * Process dunning for past_due subscriptions
 */
export async function processDunning(): Promise<{
  processed: number;
  retried: number;
  succeeded: number;
  failed: number;
  errors: string[];
}> {
  const results = {
    processed: 0,
    retried: 0,
    succeeded: 0,
    failed: 0,
    errors: [] as string[]
  };

  try {
    await getConnection();

    // Find all past_due subscriptions
    // Using index: { status: 1 }
    const subscriptions = await Subscription.find({
      status: 'past_due'
    }).populate('userId');

    console.log(`Found ${subscriptions.length} past_due subscriptions`);

    for (const subscription of subscriptions) {
      results.processed++;
      
      try {
        // Get user's default payment method
        const paymentMethod = await PaymentMethod.findOne({
          userId: subscription.userId,
          isDefault: true,
          isActive: true
        });

        if (!paymentMethod) {
          // No payment method - send email to update card
          // TODO: Send dunning email
          results.errors.push(`No payment method for subscription ${subscription._id}`);
          continue;
        }

        // Retry the payment
        results.retried++;
        
        // TODO: Implement actual payment gateway retry
        const retrySuccess = false; // Replace with actual gateway call

        if (retrySuccess) {
          const nextBillingDate = calculateNextBillingDate(
            subscription.billingCycle,
            new Date()
          );

          await Subscription.findByIdAndUpdate(subscription._id, {
            status: 'active',
            nextBillingDate
          });

          results.succeeded++;
        } else {
          // Retry failed - keep as past_due or escalate
          // After multiple failures, might want to cancel subscription
          results.failed++;
        }
      } catch (error: any) {
        results.errors.push(`Error processing dunning for subscription ${subscription._id}: ${error.message}`);
        results.failed++;
      }
    }

    return results;
  } catch (error: any) {
    console.error('Error processing dunning:', error);
    results.errors.push(`Fatal error: ${error.message}`);
    return results;
  }
}

/**
 * Retry failed transactions
 */
export async function retryFailedPayments(): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
  errors: string[];
}> {
  const results = {
    processed: 0,
    succeeded: 0,
    failed: 0,
    errors: [] as string[]
  };

  try {
    await getConnection();

    // Find failed transactions from last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const failedTransactions = await Transaction.find({
      status: 'failed',
      createdAt: { $gte: sevenDaysAgo }
    }).limit(100); // Limit to prevent overload

    console.log(`Found ${failedTransactions.length} failed transactions to retry`);

    for (const transaction of failedTransactions) {
      results.processed++;
      
      try {
        // TODO: Implement actual payment gateway retry
        // This would involve:
        // 1. Getting the invoice and payment method
        // 2. Retrying the charge via gateway
        // 3. Updating transaction status
        
        const retrySuccess = false; // Replace with actual gateway call

        if (retrySuccess) {
          await Transaction.findByIdAndUpdate(transaction._id, {
            status: 'success'
          });
          results.succeeded++;
        } else {
          results.failed++;
        }
      } catch (error: any) {
        results.errors.push(`Error retrying transaction ${transaction._id}: ${error.message}`);
        results.failed++;
      }
    }

    return results;
  } catch (error: any) {
    console.error('Error retrying failed payments:', error);
    results.errors.push(`Fatal error: ${error.message}`);
    return results;
  }
}

/**
 * Send dunning emails to users with past_due subscriptions
 */
export async function sendDunningEmails(): Promise<{
  sent: number;
  errors: string[];
}> {
  const results = {
    sent: 0,
    errors: [] as string[]
  };

  try {
    await getConnection();

    const subscriptions = await Subscription.find({
      status: 'past_due'
    }).populate('userId');

    for (const subscription of subscriptions) {
      try {
        // TODO: Implement email sending
        // This would use your email service to send payment reminder
        // Include link to update payment method
        
        results.sent++;
      } catch (error: any) {
        results.errors.push(`Error sending email for subscription ${subscription._id}: ${error.message}`);
      }
    }

    return results;
  } catch (error: any) {
    console.error('Error sending dunning emails:', error);
    results.errors.push(`Fatal error: ${error.message}`);
    return results;
  }
}

/**
 * Calculate next billing date based on billing cycle
 */
function calculateNextBillingDate(
  billingCycle: 'monthly' | 'quarterly' | 'yearly' | 'one-time',
  fromDate: Date
): Date {
  const nextDate = new Date(fromDate);

  switch (billingCycle) {
    case 'monthly':
      nextDate.setMonth(nextDate.getMonth() + 1);
      break;
    case 'quarterly':
      nextDate.setMonth(nextDate.getMonth() + 3);
      break;
    case 'yearly':
      nextDate.setFullYear(nextDate.getFullYear() + 1);
      break;
    case 'one-time':
      // One-time plans don't renew
      return nextDate;
    default:
      nextDate.setMonth(nextDate.getMonth() + 1);
  }

  return nextDate;
}

