import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import type { Mock } from 'vitest';

/**
 * The proxy is the single gate in front of every route. Three real holes are pinned here:
 *
 *   1. the dot-path bypass — `pathname.includes('.')` skipped *all* authentication, so
 *      `/dashboard/report.json` or `/api/cvs/x.json` was served with no session at all;
 *   2. the bare `/api/cvs` public prefix — 15 CV routes were exempted from the gate, two of which
 *      trusted a caller-supplied `userId` (an IDOR);
 *   3. the blanket `/studio` early return, which sat ahead of every check.
 *
 * Plus the things that must keep working: static assets pass untouched, `/api/cron/*` authenticates
 * with a bearer token rather than a session, and a missing `NEXTAUTH_SECRET` fails closed.
 *
 * `getToken` is mocked — minting a real NextAuth JWE needs a jose/next-auth version pairing this
 * repo does not have, and the signature check is not what is under test here.
 */
vi.mock('next-auth/jwt', () => ({ getToken: vi.fn() }));

import { getToken } from 'next-auth/jwt';
import proxy from './proxy';

const SECRET = 'test-nextauth-secret-for-proxy-tests';

const req = (path: string, init?: { method?: string; headers?: Record<string, string> }) =>
  new NextRequest(`http://localhost${path}`, init as never);

/** Pretend the request carries a valid session. */
const signedIn = (role: string = 'user') =>
  (getToken as Mock).mockResolvedValue({ id: 'user-1', role, email: 'test@example.com' });

const PASSTHROUGH = '1'; // NextResponse.next() marks itself with x-middleware-next

describe('proxy auth gate', () => {
  beforeEach(() => {
    vi.stubEnv('NEXTAUTH_SECRET', SECRET);
    vi.stubEnv('CRON_SECRET', 'cron-test-secret');
    vi.stubEnv('NODE_ENV', 'test');
    (getToken as Mock).mockReset().mockResolvedValue(null);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    (getToken as Mock).mockReset().mockResolvedValue(null);
  });

  describe('dot-path bypass (fixed)', () => {
    it('does not serve a protected page just because the path contains a dot', async () => {
      const res = await proxy(req('/dashboard/report.json'));
      expect(res.status).toBe(307);
      expect(res.headers.get('location')).toContain('/sign-in');
    });

    it('does not treat an API path containing a dot as a static asset', async () => {
      const res = await proxy(req('/api/cvs/abc.json'));
      expect(res.status).toBe(401);
    });

    it('does not serve a static-looking file under a protected prefix without a session', async () => {
      const res = await proxy(req('/dashboard/logo.png'));
      expect(res.status).toBe(307);
      expect(res.headers.get('location')).toContain('/sign-in');
    });

    it('still passes genuine static locations without authentication', async () => {
      for (const path of ['/_next/static/chunk.js', '/public/logo.svg', '/images/hero.jpg', '/favicon.ico']) {
        const res = await proxy(req(path));
        expect(res.headers.get('x-middleware-next')).toBe(PASSTHROUGH);
      }
    });

    it('still admits a real static file under a protected prefix once signed in', async () => {
      signedIn();
      const res = await proxy(req('/dashboard/logo.png'));
      expect(res.headers.get('x-middleware-next')).toBe(PASSTHROUGH);
    });
  });

  describe('/api/cvs public-allowlist leak (fixed)', () => {
    it('rejects an unauthenticated CV list request', async () => {
      expect((await proxy(req('/api/cvs'))).status).toBe(401);
    });

    it('rejects an unauthenticated metadata update (previously an IDOR)', async () => {
      const res = await proxy(req('/api/cvs/507f1f77bcf86cd799439011/metadata', { method: 'PUT' }));
      expect(res.status).toBe(401);
    });

    it('allows an authenticated CV request through to the handler', async () => {
      signedIn();
      expect((await proxy(req('/api/cvs'))).headers.get('x-middleware-next')).toBe(PASSTHROUGH);
    });

    it('no longer exempts billing, activity-log or onboarding routes from the gate', async () => {
      for (const path of ['/api/user/subscription', '/api/activity-log', '/api/user/onboarding']) {
        expect((await proxy(req(path))).status).toBe(401);
      }
    });

    it('still reaches those routes once signed in', async () => {
      signedIn();
      for (const path of ['/api/user/subscription', '/api/activity-log']) {
        expect((await proxy(req(path))).headers.get('x-middleware-next')).toBe(PASSTHROUGH);
      }
    });

    it('keeps genuinely pre-login routes public', async () => {
      for (const path of ['/api/health', '/api/pricing', '/api/cv-draft/save', '/api/check-email']) {
        const res = await proxy(req(path, { method: 'POST' }));
        expect(res.headers.get('x-middleware-next')).toBe(PASSTHROUGH);
      }
    });
  });

  describe('/studio blanket bypass (removed)', () => {
    it('no longer short-circuits before the auth checks: /studio follows protectedRoutes', async () => {
      // `/studio` is listed in `protectedRoutes`; the old early return overrode that. There is no
      // `src/app/studio` route today, so gating it changes no working page — but a future
      // `/studio/*` API route can no longer be public by construction.
      const res = await proxy(req('/studio'));
      expect(res.status).toBe(307);
      expect(res.headers.get('location')).toContain('/sign-in');
    });

    it('applies the same rule to anything that merely starts with /studio', async () => {
      const res = await proxy(req('/studio-api/secrets'));
      expect(res.status).toBe(307);
      expect(res.headers.get('location')).toContain('/sign-in');
    });

    it('admits /studio once signed in', async () => {
      signedIn();
      expect((await proxy(req('/studio'))).headers.get('x-middleware-next')).toBe(PASSTHROUGH);
    });
  });

  describe('cron authentication', () => {
    it('rejects a cron request with no bearer token', async () => {
      expect((await proxy(req('/api/cron/daily-summary'))).status).toBe(401);
    });

    it('rejects a cron request with the wrong bearer token', async () => {
      const res = await proxy(
        req('/api/cron/daily-summary', { headers: { authorization: 'Bearer wrong-token' } })
      );
      expect(res.status).toBe(401);
    });

    it('admits a cron request carrying the configured secret (no session needed)', async () => {
      const res = await proxy(
        req('/api/cron/daily-summary', { headers: { authorization: 'Bearer cron-test-secret' } })
      );
      expect(res.headers.get('x-middleware-next')).toBe(PASSTHROUGH);
    });

    it('still refuses cron routes when no secret is configured', async () => {
      vi.stubEnv('CRON_SECRET', '');
      vi.stubEnv('CRON_API_KEY', '');
      expect((await proxy(req('/api/cron/daily-summary'))).status).toBe(401);
    });
  });

  describe('fail-closed behaviour', () => {
    it('denies everything with 500 when NEXTAUTH_SECRET is missing', async () => {
      vi.unstubAllEnvs();
      delete process.env.NEXTAUTH_SECRET;
      expect((await proxy(req('/api/cvs'))).status).toBe(500);
    });
  });

  describe('page protection', () => {
    it('redirects an unauthenticated dashboard visit to sign-in', async () => {
      const res = await proxy(req('/dashboard/jobs'));
      expect(res.status).toBe(307);
      expect(res.headers.get('location')).toContain('/sign-in');
    });

    it('admits an authenticated dashboard visit', async () => {
      signedIn();
      const res = await proxy(req('/dashboard/jobs'));
      expect(res.headers.get('x-middleware-next')).toBe(PASSTHROUGH);
    });

    it('keeps the landing page public', async () => {
      expect((await proxy(req('/'))).headers.get('x-middleware-next')).toBe(PASSTHROUGH);
    });

    it('keeps sign-in and the public legal pages public', async () => {
      for (const path of ['/sign-in', '/privacy-policy', '/terms']) {
        expect((await proxy(req(path))).headers.get('x-middleware-next')).toBe(PASSTHROUGH);
      }
    });

    it('requires admin role for admin pages', async () => {
      signedIn('user');
      const res = await proxy(req('/admin/dashboard'));
      expect(res.status).toBe(307);
      expect(res.headers.get('location')).toContain('/admin/unauthorized');
    });

    it('admits admin pages for an admin session', async () => {
      signedIn('admin');
      expect((await proxy(req('/admin/dashboard'))).headers.get('x-middleware-next')).toBe(PASSTHROUGH);
    });
  });
});
