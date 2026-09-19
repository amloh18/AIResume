import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { SessionService } from '@/lib/services/session-service';

/**
 * GET /api/user/sessions
 * List all active sessions for the current user.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const sessions = await SessionService.getActiveSessions(session.user.id);

    // Get current session jti from the JWT token
    // We need to decode the token to get the jti — use the session token cookie
    const currentJti = await getCurrentJti();

    const sessionsWithCurrent = sessions.map((s) => ({
      id: s._id,
      jti: s.jti,
      device: s.device,
      browser: s.browser,
      os: s.os,
      ip: s.ip,
      location: s.location,
      provider: s.provider,
      isCurrent: currentJti ? s.jti === currentJti : false,
      createdAt: s.createdAt,
      lastActiveAt: s.lastActiveAt,
    }));

    return NextResponse.json({
      success: true,
      sessions: sessionsWithCurrent,
    });
  } catch (error) {
    console.error('Failed to fetch sessions:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch sessions' }, { status: 500 });
  }
}

/**
 * DELETE /api/user/sessions
 * Revoke a specific session or all other sessions.
 * Body: { jti?: string, revokeAll?: boolean }
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const currentJti = await getCurrentJti();

    if (body.revokeAll && currentJti) {
      // Revoke all sessions except current
      const count = await SessionService.revokeAllOtherSessions(session.user.id, currentJti);
      return NextResponse.json({
        success: true,
        message: `Revoked ${count} session(s)`,
        revokedCount: count,
      });
    }

    if (body.jti) {
      // Revoke a specific session
      if (body.jti === currentJti) {
        return NextResponse.json({ success: false, error: 'Cannot revoke current session' }, { status: 400 });
      }
      const revoked = await SessionService.revokeSession(body.jti);
      return NextResponse.json({
        success: true,
        message: revoked ? 'Session revoked' : 'Session not found or already revoked',
      });
    }

    return NextResponse.json({ success: false, error: 'Missing jti or revokeAll parameter' }, { status: 400 });
  } catch (error) {
    console.error('Failed to manage sessions:', error);
    return NextResponse.json({ success: false, error: 'Failed to manage sessions' }, { status: 500 });
  }
}

/**
 * Extract the current session's jti from the JWT cookie.
 * This is a best-effort extraction — if it fails, we just won't mark any session as "current".
 */
async function getCurrentJti(): Promise<string | null> {
  try {
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    const token = cookieStore.get('next-auth.session-token')?.value
      || cookieStore.get('__Secure-next-auth.session-token')?.value;
    if (!token) return null;

    // Decode the JWT payload (base64url) — don't verify signature here,
    // NextAuth already validated it when creating the session.
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
    return payload.jti || null;
  } catch {
    return null;
  }
}
