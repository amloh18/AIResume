import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import User from '@/models/User';

// This endpoint should be called by a cron job service (e.g., Vercel Cron, GitHub Actions, etc.)
// Recommended schedule: Every hour
export async function POST(request: NextRequest) {
  try {
    // Verify the request is from an authorized source
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await getConnection();

    const now = new Date();
    let expiredCount = 0;
    let errorCount = 0;

    // Find all active Day Pass subscriptions that have expired
    const expiredDayPasses = await User.find({
      'subscription.planKey': 'day_pass',
      'subscription.status': 'active',
      'subscription.currentPeriodEnd': { $lte: now }
    });

    console.log(`Found ${expiredDayPasses.length} expired Day Pass subscriptions`);

    for (const user of expiredDayPasses) {
      try {
        // Downgrade to free plan
        await User.findByIdAndUpdate(user._id, {
          currentPlanKey: 'free',
          subscription: {
            planKey: 'free',
            status: 'expired',
            startDate: user.subscription.startDate,
            endDate: now,
            currentPeriodStart: user.subscription.currentPeriodStart,
            currentPeriodEnd: now,
            provider: 'none',
            providerSubscriptionId: null,
            providerCustomerId: null,
            interval: 'one-time',
            seats: 3, // Free plan limits
            storageUsed: user.subscription.storageUsed || 0
          }
        });

        console.log(`✅ Day Pass expired for user ${user.email}`);
        expiredCount++;

        // Here you could also:
        // 1. Send email notification to user
        // 2. Create a notification in the app
        // 3. Log the expiry event for analytics

      } catch (error) {
        console.error(`❌ Error expiring Day Pass for user ${user.email}:`, error);
        errorCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Day Pass expiry job completed',
      stats: {
        totalExpired: expiredCount,
        errors: errorCount,
        processedAt: now.toISOString()
      }
    });

  } catch (error) {
    console.error('Day Pass expiry job error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Also support GET for manual testing
export async function GET(request: NextRequest) {
  try {
    await getConnection();

    const now = new Date();
    
    // Get statistics about Day Pass subscriptions
    const activeDayPasses = await User.countDocuments({
      'subscription.planKey': 'day_pass',
      'subscription.status': 'active'
    });

    const expiredDayPasses = await User.countDocuments({
      'subscription.planKey': 'day_pass',
      'subscription.status': 'active',
      'subscription.currentPeriodEnd': { $lte: now }
    });

    const upcomingExpiries = await User.countDocuments({
      'subscription.planKey': 'day_pass',
      'subscription.status': 'active',
      'subscription.currentPeriodEnd': { 
        $gt: now, 
        $lte: new Date(now.getTime() + 24 * 60 * 60 * 1000) // Next 24 hours
      }
    });

    return NextResponse.json({
      success: true,
      stats: {
        activeDayPasses,
        expiredDayPasses,
        upcomingExpiries,
        checkedAt: now.toISOString()
      }
    });

  } catch (error) {
    console.error('Day Pass stats error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
