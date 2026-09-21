import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  acquirePlaywrightBrowser,
  BrowserUnavailableError,
  getBrowserRuntime,
  getPlaywrightRemoteEndpoint,
  getPuppeteerConnectOptions,
  getPuppeteerRemoteEndpoint,
  probeRemoteBrowser,
  resolveCdpTarget,
} from './browserService';

// NODE_ENV is deliberately absent: it is typed read-only, so tests set it through `vi.stubEnv`, which
// `vi.unstubAllEnvs()` restores in the hooks below.
const BROWSER_ENV_KEYS = [
  'PLAYWRIGHT_REMOTE_URL',
  'PUPPETEER_BROWSER_WS_ENDPOINT',
  'BROWSER_ALLOW_LOCAL_LAUNCH',
];

function clearBrowserEnv() {
  for (const key of BROWSER_ENV_KEYS) {
    vi.unstubAllEnvs();
    delete process.env[key];
  }
}

describe('browserService', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    clearBrowserEnv();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    clearBrowserEnv();
  });

  describe('endpoint resolution', () => {
    it('treats an unset endpoint as null', () => {
      expect(getPlaywrightRemoteEndpoint()).toBeNull();
      expect(getPuppeteerRemoteEndpoint()).toBeNull();
    });

    it('trims whitespace and a trailing slash', () => {
      process.env.PLAYWRIGHT_REMOTE_URL = '  http://172.17.0.1:9222/  ';
      expect(getPlaywrightRemoteEndpoint()).toBe('http://172.17.0.1:9222');
    });

    it('falls back to the Playwright endpoint for Puppeteer', () => {
      process.env.PLAYWRIGHT_REMOTE_URL = 'http://172.17.0.1:9222';
      expect(getPuppeteerRemoteEndpoint()).toBe('http://172.17.0.1:9222');
    });

    it('prefers a dedicated Puppeteer endpoint when both are set', () => {
      process.env.PLAYWRIGHT_REMOTE_URL = 'http://172.17.0.1:9222';
      process.env.PUPPETEER_BROWSER_WS_ENDPOINT = 'ws://172.17.0.1:9223/devtools/browser/abc';
      expect(getPuppeteerRemoteEndpoint()).toBe('ws://172.17.0.1:9223/devtools/browser/abc');
    });
  });

  describe('getBrowserRuntime', () => {
    it('uses the remote browser when an endpoint is configured', () => {
      vi.stubEnv('NODE_ENV', 'production');
      process.env.PLAYWRIGHT_REMOTE_URL = 'http://172.17.0.1:9222';
      expect(getBrowserRuntime()).toEqual({ mode: 'remote-cdp', endpoint: 'http://172.17.0.1:9222' });
    });

    it('reports local launch in development', () => {
      vi.stubEnv('NODE_ENV', 'development');
      expect(getBrowserRuntime().mode).toBe('local-launch');
    });

    it('reports unavailable in production with no endpoint', () => {
      vi.stubEnv('NODE_ENV', 'production');
      const runtime = getBrowserRuntime();
      expect(runtime.mode).toBe('unavailable');
      expect(runtime.endpoint).toBeNull();
      expect(runtime.reason).toContain('PLAYWRIGHT_REMOTE_URL');
    });

    it('allows local launch in production only when explicitly opted in', () => {
      vi.stubEnv('NODE_ENV', 'production');
      process.env.BROWSER_ALLOW_LOCAL_LAUNCH = 'true';
      expect(getBrowserRuntime().mode).toBe('local-launch');
    });
  });

  describe('resolveCdpTarget', () => {
    it('passes an http base URL straight through', async () => {
      await expect(resolveCdpTarget('http://172.17.0.1:9222')).resolves.toEqual({
        httpUrl: 'http://172.17.0.1:9222',
      });
    });

    it('accepts a browser-level websocket URL', async () => {
      const url = 'ws://172.17.0.1:9222/devtools/browser/1f2e3d';
      await expect(resolveCdpTarget(url)).resolves.toEqual({ wsUrl: url });
    });

    it('assumes http when the value has no scheme', async () => {
      await expect(resolveCdpTarget('172.17.0.1:9222')).resolves.toEqual({
        httpUrl: 'http://172.17.0.1:9222',
      });
    });

    it('discovers the browser websocket URL from a bare ws:// endpoint', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ webSocketDebuggerUrl: 'ws://172.17.0.1:9222/devtools/browser/abc' }),
      });
      vi.stubGlobal('fetch', fetchMock);

      await expect(resolveCdpTarget('ws://172.17.0.1:9222')).resolves.toEqual({
        httpUrl: 'http://172.17.0.1:9222',
        wsUrl: 'ws://172.17.0.1:9222/devtools/browser/abc',
      });
      expect(String(fetchMock.mock.calls[0][0])).toBe('http://172.17.0.1:9222/json/version');

      vi.unstubAllGlobals();
    });

    it('falls back to the original ws URL when the endpoint cannot be probed', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')));

      const bare = 'ws://127.0.0.1:9222';
      await expect(resolveCdpTarget(bare)).resolves.toEqual({ wsUrl: bare });

      vi.unstubAllGlobals();
    });
  });

  describe('getPuppeteerConnectOptions', () => {
    it('returns null without an endpoint', async () => {
      await expect(getPuppeteerConnectOptions()).resolves.toBeNull();
    });

    it('uses browserURL for an http endpoint', async () => {
      process.env.PUPPETEER_BROWSER_WS_ENDPOINT = 'http://172.17.0.1:9222';
      await expect(getPuppeteerConnectOptions()).resolves.toEqual({ browserURL: 'http://172.17.0.1:9222' });
    });

    it('uses browserWSEndpoint for a browser-level websocket URL', async () => {
      const url = 'ws://172.17.0.1:9222/devtools/browser/abc';
      process.env.PUPPETEER_BROWSER_WS_ENDPOINT = url;
      await expect(getPuppeteerConnectOptions()).resolves.toEqual({ browserWSEndpoint: url });
    });
  });

  describe('acquirePlaywrightBrowser', () => {
    it('refuses to launch in production without an endpoint, instead of timing out', async () => {
      vi.stubEnv('NODE_ENV', 'production');
      await expect(acquirePlaywrightBrowser()).rejects.toBeInstanceOf(BrowserUnavailableError);
    });

    it('carries a reason the caller can show the user', async () => {
      vi.stubEnv('NODE_ENV', 'production');
      await expect(acquirePlaywrightBrowser()).rejects.toThrow(/PLAYWRIGHT_REMOTE_URL/);
    });
  });

  describe('probeRemoteBrowser', () => {
    it('reports not-configured without throwing', async () => {
      vi.stubEnv('NODE_ENV', 'production');
      const probe = await probeRemoteBrowser(1000);
      expect(probe.configured).toBe(false);
      expect(probe.reachable).toBe(false);
      expect(typeof probe.error).toBe('string');
    });

    it('reports a live endpoint with the browser version', async () => {
      process.env.PLAYWRIGHT_REMOTE_URL = 'http://172.17.0.1:9222';
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({ Browser: 'Chrome/140.0.7339.80' }),
        })
      );

      const probe = await probeRemoteBrowser(1000);
      expect(probe).toMatchObject({
        configured: true,
        reachable: true,
        endpoint: 'http://172.17.0.1:9222',
        version: 'Chrome/140.0.7339.80',
      });

      vi.unstubAllGlobals();
    });

    it('reports an unreachable endpoint as reachable:false rather than throwing', async () => {
      process.env.PLAYWRIGHT_REMOTE_URL = 'http://172.17.0.1:9222';
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('connect ECONNREFUSED')));

      const probe = await probeRemoteBrowser(1000);
      expect(probe.configured).toBe(true);
      expect(probe.reachable).toBe(false);
      expect(probe.endpoint).toBe('http://172.17.0.1:9222');
      expect(probe.error).toContain('ECONNREFUSED');

      vi.unstubAllGlobals();
    });

    it('surfaces a non-200 CDP response as unreachable', async () => {
      process.env.PLAYWRIGHT_REMOTE_URL = 'http://172.17.0.1:9222';
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }));

      const probe = await probeRemoteBrowser(1000);
      expect(probe.reachable).toBe(false);
      expect(probe.error).toContain('404');

      vi.unstubAllGlobals();
    });
  });
});
