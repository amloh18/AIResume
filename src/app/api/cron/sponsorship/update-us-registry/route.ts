import { NextRequest, NextResponse } from 'next/server';
import { importUSH1BEmployers } from '@/lib/services/sponsorshipRegistryService';

/**
 * Cron endpoint to update US H-1B employer registry
 * Should be called monthly/quarterly (e.g., via Vercel Cron or external cron service)
 * 
 * Security: Protected by CRON_SECRET environment variable
 * 
 * Usage:
 * - Vercel Cron: Add to vercel.json
 * - External: Set up monthly cron job to call this endpoint
 * 
 * Example Vercel Cron config:
 * {
 *   "crons": [{
 *     "path": "/api/cron/sponsorship/update-us-registry",
 *     "schedule": "0 3 1 * *"
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

    console.log('🔄 Starting US H-1B employer registry update...');
    const result = await importUSH1BEmployers();

    return NextResponse.json({
      success: true,
      message: 'US H-1B employer registry update completed',
      timestamp: new Date().toISOString(),
      result: {
        imported: result.imported,
        updated: result.updated,
        errors: result.errors,
        deleted: result.deleted
      }
    });
  } catch (error: any) {
    console.error('❌ Error in US H-1B employer registry update:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update US H-1B employer registry',
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

