import { runCron } from '@/lib/cron/runCron';
import { log } from '@/lib/structured-logger';
import { NextRequest, NextResponse } from 'next/server';
import { importUKSponsors } from '@/lib/services/sponsorshipRegistryService';

/**
 * Cron endpoint to update UK sponsor registry
 * Should be called weekly (e.g., via Vercel Cron or external cron service)
 * 
 * Security: Protected by CRON_SECRET environment variable
 * 
 * Usage:
 * - Vercel Cron: Add to vercel.json
 * - External: Set up weekly cron job to call this endpoint
 * 
 * Example Vercel Cron config:
 * {
 *   "crons": [{
 *     "path": "/api/cron/sponsorship/update-uk-registry",
 *     "schedule": "0 2 * * 1"
 *   }]
 * }
 */
export async function GET(request: NextRequest) {
  // Overlap guard: a registry import running twice concurrently could duplicate sponsor documents.
  return runCron('sponsorship:uk-registry', request, async () => {
    try {
      log.info('🔄 Starting UK sponsor registry update...');
      const result = await importUKSponsors();

      return NextResponse.json({
        success: true,
        message: 'UK sponsor registry update completed',
        timestamp: new Date().toISOString(),
        result: {
          imported: result.imported,
          updated: result.updated,
          errors: result.errors,
          expiredMarked: result.expiredMarked
        }
      });
    } catch (error: any) {
      log.error('❌ Error in UK sponsor registry update:', error);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to update UK sponsor registry',
          message: error.message
        },
        { status: 500 }
      );
    }
  });
}

// Also support POST for cron services that use POST
export async function POST(request: NextRequest) {
  return GET(request);
}

