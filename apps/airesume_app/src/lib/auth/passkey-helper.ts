import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const COOKIE_NAME = 'buildairesume_passkey_challenge';
const CHALLENGE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function getSecret(): string {
  return process.env.NEXTAUTH_SECRET || 'buildairesume-passkey-secret-fallback-key-2026';
}

/**
 * Determine the WebAuthn RP ID and Origin dynamically from request headers or environment.
 * In WebAuthn:
 * - rpID: MUST be a valid domain or localhost (no port, no protocol, e.g. "buildairesume.com" or "localhost")
 * - origin: The full scheme + host + port (e.g. "https://buildairesume.com" or "http://localhost:3000")
 */
export function getWebAuthnConfig(request?: Request | NextRequest) {
  let origin = process.env.NEXTAUTH_URL || 'http://localhost:3000';

  if (request) {
    const forwardedProto = request.headers.get('x-forwarded-proto');
    const forwardedHost = request.headers.get('x-forwarded-host');
    const host = forwardedHost || request.headers.get('host');

    if (host) {
      const isLocal = host.includes('localhost') || host.includes('127.0.0.1');
      const proto = forwardedProto || (isLocal ? 'http' : 'https');
      origin = `${proto}://${host}`;
    }
  }

  const parsedUrl = new URL(origin);
  const rpID = parsedUrl.hostname; // Hostname without port (compliant with WebAuthn spec)
  const rpName = 'BuildAIResume';

  return { origin, rpID, rpName };
}

/**
 * Cryptographically sign a challenge so it cannot be forged or tampered with.
 */
export function createChallengeToken(challenge: string, metadata: Record<string, any> = {}): string {
  const payload = JSON.stringify({
    challenge,
    metadata,
    exp: Date.now() + CHALLENGE_TTL_MS,
  });

  const hmac = crypto.createHmac('sha256', getSecret()).update(payload).digest('base64url');
  const b64Payload = Buffer.from(payload).toString('base64url');
  return `${b64Payload}.${hmac}`;
}

/**
 * Verify HMAC signature and expiry, returning the verified challenge and metadata.
 */
export function verifyChallengeToken(token: string): { challenge: string; metadata: Record<string, any> } | null {
  if (!token || !token.includes('.')) return null;

  const [b64Payload, hmac] = token.split('.');
  if (!b64Payload || !hmac) return null;

  try {
    const payload = Buffer.from(b64Payload, 'base64url').toString('utf8');
    const expectedHmac = crypto.createHmac('sha256', getSecret()).update(payload).digest('base64url');

    const hmacBuf = Buffer.from(hmac);
    const expectedHmacBuf = Buffer.from(expectedHmac);

    if (hmacBuf.length !== expectedHmacBuf.length || !crypto.timingSafeEqual(hmacBuf, expectedHmacBuf)) {
      return null;
    }

    const data = JSON.parse(payload);
    if (!data.exp || data.exp < Date.now()) {
      return null;
    }

    return {
      challenge: data.challenge,
      metadata: data.metadata || {},
    };
  } catch {
    return null;
  }
}

/**
 * Attach the challenge cookie to a Next.js response.
 */
export function setChallengeCookie(response: NextResponse, challenge: string, metadata: Record<string, any> = {}): void {
  const token = createChallengeToken(challenge, metadata);
  const isProd = process.env.NODE_ENV === 'production';

  response.cookies.set({
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd,
    maxAge: Math.floor(CHALLENGE_TTL_MS / 1000),
    path: '/',
  });
}

/**
 * Extract and verify challenge from incoming request cookies.
 */
export function getChallengeFromRequest(request: Request | NextRequest): { challenge: string; metadata: Record<string, any> } | null {
  let cookieHeader = '';

  if ('cookies' in request && typeof (request as any).cookies?.get === 'function') {
    const cookieVal = (request as NextRequest).cookies.get(COOKIE_NAME)?.value;
    if (cookieVal) return verifyChallengeToken(cookieVal);
  }

  cookieHeader = request.headers.get('cookie') || '';
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`));
  if (!match || !match[1]) return null;

  return verifyChallengeToken(decodeURIComponent(match[1]));
}

/**
 * Clear the challenge cookie after use.
 */
export function clearChallengeCookie(response: NextResponse): void {
  response.cookies.set({
    name: COOKIE_NAME,
    value: '',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });
}
