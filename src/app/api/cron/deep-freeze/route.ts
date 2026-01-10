import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import User from '@/models/User';
import { applyDeepFreeze } from '@/lib/services/deep-freeze-service';

export const runtime = 'nodejs';

/**
 * Cron job to run Deep Freeze protocol nightly
 * Identifies users whose subscription ended and freezes their Journey CVs
 */
export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    await getConnection();
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(23, 59, 59, 999);
    
    // Find users whose subscription ended yesterday
    const usersToFreeze = await User.find({
      $or: [
        { 'subscription.currentPeriodEnd': { $lte: yesterday } },
        { 'subscription.accessExpiresAt': { $lte: yesterday } }
      ],
      'subscription.status': { $in: ['cancelled', 'expired'] },
      currentPlanKey: { $in: ['pro_monthly', 'pro_quarterly', 'pro_lifetime', 'day_pass'] }
    }).select('_id currentPlanKey');
    
    const results = [];
    
    for (const user of usersToFreeze) {
      try {
        // Downgrade to free
        await User.findByIdAndUpdate(user._id, {
          $set: { currentPlanKey: 'free' }
        });
        
        // Apply Deep Freeze
        const freezeResult = await applyDeepFreeze(user._id.toString());
        results.push({
          userId: user._id.toString(),
          ...freezeResult
        });
      } catch (error) {
        console.error(`Failed to freeze user ${user._id}:`, error);
      }
    }
    
    return NextResponse.json({
      success: true,
      processed: results.length,
      results
    });
    
  } catch (error) {
    console.error('Deep Freeze cron error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

