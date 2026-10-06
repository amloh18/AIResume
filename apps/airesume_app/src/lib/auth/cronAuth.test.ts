import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { isAuthorizedCronRequest, getCronSecrets, tokensMatch } from './cronAuth';

/**
 * These cover the gate that made every `/api/cron/*` route unreachable: the proxy rejected the request
 * before the route handler's own `CRON_SECRET` check could see it.
 */
describe('cron request authentication', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    delete process.env.CRON_SECRET;
    delete process.env.CRON_API_KEY;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    delete process.env.CRON_SECRET;
    delete process.env.CRON_API_KEY;
  });

  const bearer = (token: string) => new Headers({ Authorization: `Bearer ${token}` });

  describe('isAuthorizedCronRequest', () => {
    it('accepts the configured CRON_SECRET', () => {
      process.env.CRON_SECRET = 'correct-horse-battery-staple';
      expect(isAuthorizedCronRequest(bearer('correct-horse-battery-staple'))).toBe(true);
    });

    it('accepts the CRON_API_KEY alias used by /api/cron/webhook-retry', () => {
      process.env.CRON_API_KEY = 'legacy-key';
      expect(isAuthorizedCronRequest(bearer('legacy-key'))).toBe(true);
    });

    it('rejects a token that matches no configured secret', () => {
      process.env.CRON_SECRET = 'expected-token';
      expect(isAuthorizedCronRequest(bearer('wrong-token-xx'))).toBe(false);
    });

    it('rejects a same-length token that differs by one character', () => {
      process.env.CRON_SECRET = 'aaaaaaaa';
      expect(isAuthorizedCronRequest(bearer('aaaaaaab'))).toBe(false);
    });

    it('rejects a missing Authorization header', () => {
      process.env.CRON_SECRET = 'secret';
      expect(isAuthorizedCronRequest(new Headers())).toBe(false);
    });

    it('rejects a non-bearer scheme', () => {
      process.env.CRON_SECRET = 'secret';
      expect(isAuthorizedCronRequest(new Headers({ Authorization: 'Basic c2VjcmV0' }))).toBe(false);
    });

    it('rejects an empty bearer value', () => {
      process.env.CRON_SECRET = 'secret';
      expect(isAuthorizedCronRequest(new Headers({ Authorization: 'Bearer ' }))).toBe(false);
    });

    it('tolerates surrounding whitespace in the header', () => {
      process.env.CRON_SECRET = 'secret';
      expect(isAuthorizedCronRequest(new Headers({ Authorization: '  Bearer   secret  ' }))).toBe(true);
    });

    it('is case-insensitive about the scheme', () => {
      process.env.CRON_SECRET = 'secret';
      expect(isAuthorizedCronRequest(new Headers({ Authorization: 'bearer secret' }))).toBe(true);
    });

    it('accepts the legacy X-Api-Key header used by /api/cron/billing', () => {
      process.env.CRON_API_KEY = 'legacy-api-key';
      expect(isAuthorizedCronRequest(new Headers({ 'x-api-key': 'legacy-api-key' }))).toBe(true);
    });

    it('rejects a wrong X-Api-Key', () => {
      process.env.CRON_API_KEY = 'legacy-api-key';
      expect(isAuthorizedCronRequest(new Headers({ 'x-api-key': 'not-the-key!!' }))).toBe(false);
    });

    it('does not fall through to X-Api-Key when a bearer was presented and is wrong', () => {
      process.env.CRON_SECRET = 'secret';
      const headers = new Headers({ Authorization: 'Bearer wrong', 'X-Api-Key': 'secret' });
      expect(isAuthorizedCronRequest(headers)).toBe(false);
    });

    it('fails closed when no secret is configured', () => {
      // Previously the proxy rejected these routes unconditionally, so failing closed preserves that.
      expect(isAuthorizedCronRequest(bearer('anything'))).toBe(false);
    });

    it('ignores empty-string secrets', () => {
      process.env.CRON_SECRET = '';
      expect(getCronSecrets()).toEqual([]);
      expect(isAuthorizedCronRequest(bearer(''))).toBe(false);
    });
  });

  describe('tokensMatch', () => {
    it('matches identical strings', () => {
      expect(tokensMatch('abc123', 'abc123')).toBe(true);
    });

    it('rejects different lengths', () => {
      expect(tokensMatch('abc', 'abcd')).toBe(false);
    });

    it('rejects same-length differences', () => {
      expect(tokensMatch('abc1', 'abc2')).toBe(false);
    });

    it('handles empty strings', () => {
      expect(tokensMatch('', '')).toBe(true);
      expect(tokensMatch('', 'x')).toBe(false);
    });
  });
});
