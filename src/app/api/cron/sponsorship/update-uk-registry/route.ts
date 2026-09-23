import { NextRequest, NextResponse } from 'next/server';
import { cronAuthFailure } from '@/lib/auth/cron-guard';
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
  try {
    // Fail closed — a missing CRON_SECRET must never make this endpoint public.
    const denied = cronAuthFailure(request.headers);
    if (denied) return denied;

    console.log('🔄 Starting UK sponsor registry update...');
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
    console.error('❌ Error in UK sponsor registry update:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update UK sponsor registry',
        message: error.message
      },
      { status: 500 }
    );
  }
}

// Also support POST for cron services that use POST
export async function POST(request: NextRequest) {
  return GET(request);
}

