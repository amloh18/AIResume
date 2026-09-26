import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getToken, decode } from 'next-auth/jwt';
import { authOptions } from '@/lib/auth';
import { SessionService } from '@/lib/services/session-service';
import {
  getSessionCookieName,
  SECURE_SESSION_COOKIE,
  INSECURE_SESSION_COOKIE,
} from '@/lib/auth/session-cookie';

/**
 * GET /api/user/sessions
 * List all active sessions for the current user.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const sessions = await SessionService.getActiveSessions(session.user.id);

    // Get current session jti from the JWT token
    const currentJti = await getCurrentJti(request);

    // If currentJti could not be directly resolved and there is only 1 active session,
    // that single session is guaranteed to be the current device
    const effectiveCurrentJti = currentJti || (sessions.length === 1 ? sessions[0].jti : null);

    const sessionsWithCurrent = sessions.map((s) => ({
      id: s._id,
      jti: s.jti,
      device: s.device,
      browser: s.browser,
      os: s.os,
      ip: s.ip,
      location: s.location,
      provider: s.provider,
      isCurrent: effectiveCurrentJti ? s.jti === effectiveCurrentJti : false,
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
    let currentJti = await getCurrentJti(request);

    // If currentJti could not be decrypted, attempt fallback to most recent session
    if (!currentJti) {
      const activeSessions = await SessionService.getActiveSessions(session.user.id);
      if (activeSessions.length > 0) {
        currentJti = activeSessions[0].jti;
      }
    }

    if (body.revokeAll) {
      if (!currentJti) {
        return NextResponse.json({
          success: false,
          error: 'Unable to identify active session. Action aborted to protect your active login.',
        }, { status: 400 });
      }

      // Revoke all sessions except current (strictly protected)
      const count = await SessionService.revokeAllOtherSessions(session.user.id, currentJti);
      return NextResponse.json({
        success: true,
        message: `Revoked ${count} session(s)`,
        revokedCount: count,
      });
    }

    if (body.jti) {
      // Revoke a specific session
      if (currentJti && body.jti === currentJti) {
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
 * Extract the current session's jti from the JWT token.
 * Uses getToken and decode to handle both encrypted JWE and signed JWS tokens reliably.
 */
async function getCurrentJti(request?: NextRequest): Promise<string | null> {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) return null;

  // 1. Try getToken from NextRequest directly
  if (request) {
    try {
      const token = await getToken({
        req: request,
        secret,
        cookieName: getSessionCookieName(),
      });
      if (token?.jti && typeof token.jti === 'string') {
        return token.jti;
      }

      // Try default cookie names as fallback
      const tokenDefault = await getToken({
        req: request,
        secret,
      });
      if (tokenDefault?.jti && typeof tokenDefault.jti === 'string') {
        return tokenDefault.jti;
      }
    } catch {
      // proceed to cookie-based fallback
    }
  }

  // 2. Fallback: inspect raw cookie values and decode with next-auth/jwt decode
  try {
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    const cookieNames = [
      getSessionCookieName(),
      SECURE_SESSION_COOKIE,
      INSECURE_SESSION_COOKIE,
    ];

    for (const name of cookieNames) {
      const rawToken = cookieStore.get(name)?.value;
      if (!rawToken) continue;

      try {
        const decoded = await decode({ token: rawToken, secret });
        if (decoded?.jti && typeof decoded.jti === 'string') {
          return decoded.jti;
        }
      } catch {
        // If unencrypted 3-part JWS, try payload extraction
        const parts = rawToken.split('.');
        if (parts.length === 3) {
          try {
            const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
            if (payload?.jti && typeof payload.jti === 'string') {
              return payload.jti;
            }
          } catch {}
        }
      }
    }
  } catch {
    // best-effort
  }

  return null;
}
