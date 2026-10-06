import { runCron } from '@/lib/cron/runCron';
import { log } from '@/lib/structured-logger';
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
  // Overlap guard: a concurrent run could downgrade the same user twice and race applyDeepFreeze.
  return runCron('deep-freeze', request, async () => {
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
        currentPlanKey: { $in: ['focused_monthly', 'focused_quarterly', 'focused_yearly', 'focused_yearly'] }
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
          log.error(`Failed to freeze user ${user._id}:`, error as Error);
        }
      }
      
      return NextResponse.json({
        success: true,
        processed: results.length,
        results
      });
      
    } catch (error) {
      log.error('Deep Freeze cron error:', error as Error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  });
}

