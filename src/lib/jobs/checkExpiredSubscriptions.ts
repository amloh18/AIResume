import subscriptionService from '@/lib/services/subscriptionService';
import { connectToDatabase } from '@/lib/database';

/**
 * Background job to check and mark expired subscriptions
 * Should be run periodically (e.g., every hour via cron)
 */
export async function checkExpiredSubscriptions() {
  try {
    console.log('Starting expired subscriptions check...');
    
    await connectToDatabase();
    
    const result = await subscriptionService.checkAndUpdateExpiredSubscriptions();
    
    console.log(`Expired subscriptions check completed: ${result.expired} expired, ${result.updated} updated`);
    
    return result;
  } catch (error) {
    console.error('Error checking expired subscriptions:', error);
    throw error;
  }
}

/**
 * Send expiry warning emails
 * Should be run daily to warn users about upcoming expirations
 */
export async function sendExpiryWarnings() {
  try {
    await connectToDatabase();
    
    const { connectToDatabase } = await import('@/lib/database');
    const User = (await import('@/models/User')).default;
    
    await connectToDatabase();
    
    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    
    // Find subscriptions expiring in 3 days
    const expiringIn3Days = await User.find({
      'subscription.status': 'active',
      $or: [
        { 'subscription.accessExpiresAt': { $gte: now, $lte: threeDaysFromNow } },
        { 'subscription.currentPeriodEnd': { $gte: now, $lte: threeDaysFromNow } }
      ]
    });
    
    // Find subscriptions expiring in 1 day
    const expiringIn1Day = await User.find({
      'subscription.status': 'active',
      $or: [
        { 'subscription.accessExpiresAt': { $gte: now, $lte: oneDayFromNow } },
        { 'subscription.currentPeriodEnd': { $gte: now, $lte: oneDayFromNow } }
      ]
    });
    
    // Send warning emails (implement email service integration)
    // For now, just log
    console.log(`Found ${expiringIn3Days.length} subscriptions expiring in 3 days`);
    console.log(`Found ${expiringIn1Day.length} subscriptions expiring in 1 day`);
    
    // TODO: Integrate with email service to send expiry warnings
    
    return {
      threeDaysWarning: expiringIn3Days.length,
      oneDayWarning: expiringIn1Day.length
    };
  } catch (error) {
    console.error('Error sending expiry warnings:', error);
    throw error;
  }
}

