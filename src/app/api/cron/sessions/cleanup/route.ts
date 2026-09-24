import { runCron } from '@/lib/cron/runCron';
import { log } from '@/lib/structured-logger';
import { NextRequest, NextResponse } from 'next/server';
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
  return runCron('sessions:cleanup', request, async () => {
    try {
      const result = await SessionService.cleanupSessions();

      log.info(`🧹 Session cleanup: removed ${result.expired} expired, ${result.revoked} old revoked sessions`);

      return NextResponse.json({
        success: true,
        expired: result.expired,
        revoked: result.revoked,
      });
    } catch (error) {
      log.error('Session cleanup error:', error as Error);
      return NextResponse.json({ success: false, error: 'Cleanup failed' }, { status: 500 });
    }
  });
}
