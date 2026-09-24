import { NextRequest, NextResponse } from 'next/server';
import { cronAuthFailure } from '@/lib/auth/cron-guard';
import { acquireCronLock, cronBusyResponse } from '@/lib/cron/runCron';
import { SessionService } from '@/lib/services/session-service';

/**
 * Session Cleanup Cron Endpoint
 * Purges expired and old revoked login sessions.
 *
 * Security: `Authorization: Bearer <CRON_SECRET|CRON_API_KEY>` or `X-Api-Key`, via the shared
 * fail-closed, constant-time guard. It used to compare `x-api-key` *or* a `?key=` query parameter
 * against `CRON_API_KEY` with `!==`: a non-constant-time compare, and a secret in the query string
 * (which lands in proxy and access logs). The query form is gone for that reason — and it could not
 * have worked anyway, since `src/proxy.ts` admits `/api/cron/*` on a Bearer token only.
 */
export async function GET(request: NextRequest) {
  // Overlap guard: two concurrent cleanups would both try to purge the same sessions.
  const lock = acquireCronLock('sessions:cleanup');
  if (!lock) return cronBusyResponse('sessions:cleanup');

  try {
    const denied = cronAuthFailure(request.headers);
    if (denied) return denied;

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
  } finally {
    lock.release();
  }
}
