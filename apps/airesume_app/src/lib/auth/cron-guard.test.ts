import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { cronAuthFailure } from './cron-guard';
import { getCronSecrets } from './cronAuth';

/**
 * `cronAuthFailure` is the guard every `/api/cron/*` route now uses. The two failure modes it exists
 * to eliminate are both silent ones:
 *   - fail-OPEN when `CRON_SECRET` is unset (`if (cronSecret && …)` short-circuited to "allowed");
 *   - a non-constant-time `token !== expectedSecret` compare in two routes.
 * A misconfiguration must now produce a visible 503 rather than an open endpoint.
 */
describe('cron route guard', () => {
  beforeEach(() => {
    delete process.env.CRON_SECRET;
    delete process.env.CRON_API_KEY;
  });

  afterEach(() => {
    delete process.env.CRON_SECRET;
    delete process.env.CRON_API_KEY;
  });

  const headers = (auth?: string) =>
    new Headers(auth ? { Authorization: auth } : {});

  it('returns null (allow) for a valid bearer token', () => {
    process.env.CRON_SECRET = 'correct-horse';
    expect(cronAuthFailure(headers('Bearer correct-horse'))).toBeNull();
  });

  it('accepts the CRON_API_KEY alias', () => {
    process.env.CRON_API_KEY = 'legacy-key';
    expect(cronAuthFailure(headers('Bearer legacy-key'))).toBeNull();
  });

  it('fails closed with 503 when no secret is configured at all', () => {
    const res = cronAuthFailure(headers('Bearer anything'));
    expect(res).not.toBeNull();
    expect(res!.status).toBe(503);
  });

  it('returns 401 for a wrong token', () => {
    process.env.CRON_SECRET = 'expected';
    const res = cronAuthFailure(headers('Bearer nope-nope'));
    expect(res).not.toBeNull();
    expect(res!.status).toBe(401);
  });

  it('returns 401 when the header is missing', () => {
    process.env.CRON_SECRET = 'expected';
    expect(cronAuthFailure(headers())?.status).toBe(401);
  });

  it('returns 401 for a non-bearer scheme', () => {
    process.env.CRON_SECRET = 'expected';
    expect(cronAuthFailure(headers('Basic ZXhwZWN0ZWQ='))?.status).toBe(401);
  });

  it('exposes the configured secrets for diagnostics', () => {
    process.env.CRON_SECRET = 'a';
    process.env.CRON_API_KEY = 'b';
    expect(getCronSecrets()).toEqual(['a', 'b']);
  });
});
