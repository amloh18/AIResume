import { NextRequest, NextResponse } from 'next/server';
import { importUKSponsors } from '@/lib/services/sponsorshipRegistryService';
import { importUSH1BEmployers } from '@/lib/services/sponsorshipRegistryService';
import dailySummaryEmailService from '@/lib/services/dailySummaryEmailService';

/**
 * Unified Cron Endpoint
 * 
 * This endpoint consolidates multiple cron jobs into a single endpoint
 * to work within Vercel's free plan limit (2 cron jobs max).
 * 
 * The endpoint runs daily at 8 AM and executes tasks based on the current date:
 * - Daily Summary: Runs every day at 8 AM
 * - UK Registry Update: Runs every Monday at 8 AM (consolidated from 2 AM)
 * - US Registry Update: Runs on the 1st of each month at 8 AM (consolidated from 3 AM)
 * 
 * Security: Protected by CRON_SECRET environment variable
 * 
 * Usage in vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/unified",
 *     "schedule": "0 8 * * *"  // Daily at 8 AM
 *   }]
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const dayOfMonth = now.getDate();
    
    const results: Record<string, any> = {
      timestamp: now.toISOString(),
      executed: [] as string[],
      skipped: [] as string[],
    };

    // Daily Summary - runs every day at 8 AM
    try {
      console.log('📧 Running daily summary email job...');
      const summaryResult = await dailySummaryEmailService.sendDailySummariesToAllUsers();
      results.dailySummary = {
        success: true,
        sent: summaryResult.sent,
        skipped: summaryResult.skipped,
        failed: summaryResult.failed,
        errors: summaryResult.errors.slice(0, 10),
      };
      results.executed.push('daily-summary');
    } catch (error: any) {
      console.error('❌ Error in daily summary:', error);
      results.dailySummary = {
        success: false,
        error: error.message,
      };
    }

    // UK Registry Update - runs every Monday at 8 AM (consolidated from 2 AM)
    if (dayOfWeek === 1) {
      try {
        console.log('🔄 Running UK sponsor registry update...');
        const ukResult = await importUKSponsors();
        results.ukRegistry = {
          success: true,
          imported: ukResult.imported,
          updated: ukResult.updated,
          errors: ukResult.errors,
          expiredMarked: ukResult.expiredMarked,
        };
        results.executed.push('uk-registry');
      } catch (error: any) {
        console.error('❌ Error in UK registry update:', error);
        results.ukRegistry = {
          success: false,
          error: error.message,
        };
      }
    } else {
      results.skipped.push('uk-registry (not Monday)');
    }

    // US Registry Update - runs on 1st of month at 8 AM (consolidated from 3 AM)
    if (dayOfMonth === 1) {
      try {
        console.log('🔄 Running US H-1B employer registry update...');
        const usResult = await importUSH1BEmployers();
        results.usRegistry = {
          success: true,
          imported: usResult.imported,
          updated: usResult.updated,
          errors: usResult.errors,
          deleted: usResult.deleted,
        };
        results.executed.push('us-registry');
      } catch (error: any) {
        console.error('❌ Error in US registry update:', error);
        results.usRegistry = {
          success: false,
          error: error.message,
        };
      }
    } else {
      results.skipped.push('us-registry (not 1st of month)');
    }

    // If no tasks were executed, return a message
    if (results.executed.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No scheduled tasks to run at this time',
        ...results,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Executed ${results.executed.length} task(s)`,
      ...results,
    });
  } catch (error: any) {
    console.error('❌ Error in unified cron endpoint:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to execute cron tasks',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

// Also support POST for cron services that use POST
export async function POST(request: NextRequest) {
  return GET(request);
}

