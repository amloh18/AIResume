import { NextRequest, NextResponse } from 'next/server';
import { SessionService } from '@/lib/services/session-service';

/**
 * Session Cleanup Cron Endpoint
 * Purges expired and old revoked login sessions.
 *
 * Security: Requires CRON_API_KEY header.
 */
export async function GET(request: NextRequest) {
  try {
    const cronApiKey = process.env.CRON_API_KEY;
    const providedKey = request.headers.get('x-api-key') || request.nextUrl.searchParams.get('key');

    if (!cronApiKey || providedKey !== cronApiKey) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const result = await SessionService.cleanupSessions();

    console.log(`🧹 Session cleanup: removed ${result.expired} expired, ${result.revoked} old revoked sessions`);

    return NextResponse.json({
      success: true,
      expired: result.expired,
      revoked: result.revoked,
    });
  } catch (error) {
    console.error('Session cleanup error:', error);
    return NextResponse.json({ success: false, error: 'Cleanup failed' }, { status: 500 });
  }
}
