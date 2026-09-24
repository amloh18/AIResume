import { NextRequest, NextResponse } from 'next/server';
import { cronAuthFailure } from '@/lib/auth/cron-guard';
import { acquireCronLock, cronBusyResponse } from '@/lib/cron/runCron';
import { importUKSponsors } from '@/lib/services/sponsorshipRegistryService';
import { importUSH1BEmployers } from '@/lib/services/sponsorshipRegistryService';
import dailySummaryEmailService from '@/lib/services/dailySummaryEmailService';
import { cleanupGuestUsers } from '@/lib/services/guestCleanupService';

/**
 * Unified Cron Endpoint
 * 
 * This endpoint consolidates multiple cron jobs into a single endpoint
 * to work within Vercel's free plan limit (2 cron jobs max).
 * 
 * The endpoint runs daily at 8 AM and executes tasks based on the current date:
 * - Daily Summary: Runs every day at 8 AM
 * - Guest User Cleanup: Runs every day at 8 AM (deletes anonymous users older than 30 days with no CVs/drafts)
 * - UK Registry Update: Runs every Monday at 8 AM (consolidated from 2 AM)
 * - US Registry Update: Runs on the 1st of each month at 8 AM (consolidated from 3 AM)
 * 
 * Note: Anonymous users are immediately deleted when a real account is created/linked
 * via UserService.mergeAnonymousUser(). This cron handles stale abandoned sessions.
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
  // Overlap guard: this endpoint both emails users and deletes guest accounts — running two at once
  // would duplicate the first and race the second.
  const lock = acquireCronLock('unified');
  if (!lock) return cronBusyResponse('unified');

  try {
    // Fail closed — a missing CRON_SECRET must never make this endpoint public.
    const denied = cronAuthFailure(request.headers);
    if (denied) return denied;

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

    // Guest User Cleanup - runs every day at 8 AM
    try {
      console.log('🧹 Running guest user cleanup job...');
      const deletedCount = await cleanupGuestUsers();
      results.guestCleanup = {
        success: true,
        deletedCount,
      };
      results.executed.push('guest-cleanup');
    } catch (error: any) {
      console.error('❌ Error in guest user cleanup:', error);
      results.guestCleanup = {
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
  } finally {
    lock.release();
  }
}

// Also support POST for cron services that use POST
export async function POST(request: NextRequest) {
  return GET(request);
}

