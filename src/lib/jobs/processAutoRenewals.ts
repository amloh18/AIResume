import subscriptionService from '@/lib/services/subscriptionService';
import { connectToDatabase } from '@/lib/database';
import User from '@/models/User';
import { stripe } from '@/lib/payment/stripe';
import { getRazorpay } from '@/lib/payment/razorpay';

/**
 * Background job to process subscription auto-renewals
 * Should be run daily to process renewals for monthly subscriptions
 */
export async function processAutoRenewals() {
  try {
    console.log('Starting auto-renewal processing...');
    
    await connectToDatabase();
    
    const now = new Date();
    const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    
    // Find subscriptions that need renewal (monthly plans with autoRenew enabled)
    const subscriptionsNeedingRenewal = await User.find({
      'subscription.status': 'active',
      'subscription.autoRenew': true,
      'subscription.planKey': 'pro_monthly',
      'subscription.currentPeriodEnd': {
        $gte: now,
        $lte: oneDayFromNow
      }
    });
    
    console.log(`Found ${subscriptionsNeedingRenewal.length} subscriptions needing renewal`);
    
    let successful = 0;
    let failed = 0;
    
    for (const user of subscriptionsNeedingRenewal) {
      try {
        const subscription = user.subscription;
        
        if (!subscription.providerSubscriptionId) {
          console.warn(`User ${user._id} has no provider subscription ID, skipping`);
          continue;
        }
        
        // Check payment status with provider
        if (subscription.provider === 'stripe' && stripe) {
          const stripeSubscription = await stripe.subscriptions.retrieve(
            subscription.providerSubscriptionId
          );
          
          if (stripeSubscription.status === 'active') {
            // Subscription is active, process renewal
            const result = await subscriptionService.handleSubscriptionRenewal(user._id.toString());
            
            if (result.success) {
              successful++;
              console.log(`✅ Renewed subscription for user ${user._id}`);
            } else {
              failed++;
              console.error(`❌ Failed to renew subscription for user ${user._id}: ${result.error}`);
            }
          } else if (stripeSubscription.status === 'past_due' || stripeSubscription.status === 'unpaid') {
            // Payment failed, mark subscription for grace period
            await User.findByIdAndUpdate(user._id, {
              'subscription.status': 'past_due'
            });
            console.warn(`⚠️ Subscription ${subscription.providerSubscriptionId} is past due`);
          }
        } else if (subscription.provider === 'razorpay') {
          // Check Razorpay subscription status
          const razorpayInstance = getRazorpay();
          if (!razorpayInstance) {
            console.warn(`Razorpay not configured, skipping renewal for user ${user._id}`);
            continue;
          }
          const razorpaySubscription = await razorpayInstance.subscriptions.fetch(
            subscription.providerSubscriptionId
          );
          
          if (razorpaySubscription.status === 'active') {
            const result = await subscriptionService.handleSubscriptionRenewal(user._id.toString());
            
            if (result.success) {
              successful++;
              console.log(`✅ Renewed subscription for user ${user._id}`);
            } else {
              failed++;
              console.error(`❌ Failed to renew subscription for user ${user._id}: ${result.error}`);
            }
          }
        }
      } catch (error) {
        failed++;
        console.error(`Error processing renewal for user ${user._id}:`, error);
      }
    }
    
    console.log(`Auto-renewal processing completed: ${successful} successful, ${failed} failed`);
    
    return {
      total: subscriptionsNeedingRenewal.length,
      successful,
      failed
    };
  } catch (error) {
    console.error('Error processing auto-renewals:', error);
    throw error;
  }
}

