/**
 * Browser provider — the single place that decides where a browser comes from.
 *
 * WHY THIS EXISTS
 * ---------------
 * Two subsystems used to launch Chromium inside the web container:
 *
 *   - `unifiedApplyService.ts`  → Playwright, for Greenhouse/Lever/Ashby/Workable form automation
 *   - `puppeteerPoolService.ts` → Puppeteer, for turning a resume template into a PDF
 *
 * Keeping a browser in the web image is what forced 290 MB of Chromium plus 155 apt packages into every
 * web deploy (see `docs/deployment/vps-automation-workers.md`). Both can instead attach to one headless
 * Chrome that already runs on the VPS host, over the Chrome DevTools Protocol.
 *
 * The two libraries need different call shapes for the same endpoint:
 *
 *   Playwright → `chromium.connectOverCDP(endpoint)`   (accepts an http:// or ws:// CDP endpoint)
 *   Puppeteer  → `puppeteer.connect({ browserURL })` / `connect({ browserWSEndpoint })`
 *
 * hence `resolveCdpTarget()` below rather than two ad-hoc env reads.
 *
 * ENVIRONMENT
 * -----------
 *   PLAYWRIGHT_REMOTE_URL        CDP endpoint for ATS automation.
 *                                `http://172.17.0.1:9222` or the full `ws://…/devtools/browser/<id>`.
 *   PUPPETEER_BROWSER_WS_ENDPOINT  CDP endpoint for PDF rendering. Falls back to PLAYWRIGHT_REMOTE_URL,
 *                                so a single Chrome can serve both until load justifies splitting them.
 *   BROWSER_ALLOW_LOCAL_LAUNCH   Set to `true` to permit an in-container launch even in production.
 *
 * With no endpoint configured the behaviour depends on the environment, and that asymmetry is on
 * purpose: `next dev` on a developer machine has a browser and should keep using it, while a production
 * container does not, and a failed `launch()` there would cost a 30-second timeout on *every*
 * application before the same manual fallback. Production therefore reports "unavailable" immediately
 * and every caller routes to the manual path with a reason attached — which is also what AGENTS.md's
 * "safe halt over uncertain submission" rule asks for.
 */

export type BrowserMode = 'remote-cdp' | 'local-launch' | 'unavailable';

export interface BrowserRuntime {
  mode: BrowserMode;
  /** The CDP endpoint in use, when one is configured. */
  endpoint: string | null;
  /** Populated when `mode === 'unavailable'`, so callers can surface a real reason to the user. */
  reason?: string;
}

export interface CdpTarget {
  /** Set when the endpoint can be used as an HTTP CDP base URL (`http://host:9222`). */
  httpUrl?: string;
  /** Set when the endpoint is a browser-level WebSocket URL. */
  wsUrl?: string;
}

const TAG = '[Browser]';

const UNAVAILABLE_REASON =
  'No remote browser is configured (set PLAYWRIGHT_REMOTE_URL) and this container has no local browser';

/** Trim, drop empties and a trailing slash so `http://host:9222/` and `http://host:9222` behave alike. */
function normaliseEndpoint(raw?: string | null): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return trimmed.replace(/\/+$/, '');
}

/** Endpoint used for ATS form automation. */
export function getPlaywrightRemoteEndpoint(): string | null {
  return normaliseEndpoint(process.env.PLAYWRIGHT_REMOTE_URL);
}

/** Endpoint used for PDF rendering; falls back to the ATS endpoint so one Chrome can serve both. */
export function getPuppeteerRemoteEndpoint(): string | null {
  return normaliseEndpoint(process.env.PUPPETEER_BROWSER_WS_ENDPOINT) ?? getPlaywrightRemoteEndpoint();
}

function allowsLocalLaunch(): boolean {
  if (process.env.BROWSER_ALLOW_LOCAL_LAUNCH === 'true') return true;
  return process.env.NODE_ENV !== 'production';
}

/** Where the next browser will come from, and why — surfaced by callers and ops diagnostics. */
export function getBrowserRuntime(): BrowserRuntime {
  const endpoint = getPlaywrightRemoteEndpoint() ?? getPuppeteerRemoteEndpoint();
  if (endpoint) return { mode: 'remote-cdp', endpoint };
  if (allowsLocalLaunch()) return { mode: 'local-launch', endpoint: null };
  return { mode: 'unavailable', endpoint: null, reason: UNAVAILABLE_REASON };
}

/** Thrown instead of attempting a launch that cannot work. Carries a user-facing reason. */
export class BrowserUnavailableError extends Error {
  constructor(reason?: string) {
    super(reason || UNAVAILABLE_REASON);
    this.name = 'BrowserUnavailableError';
  }
}

/**
 * Turn whatever the operator put in the env var into the shapes the two libraries accept.
 *
 * A bare `ws://host:9222` is what people usually write, but it is not a browser-level endpoint — Chrome
 * needs `ws://host:9222/devtools/browser/<id>`. When handed a bare websocket URL we ask Chrome for the
 * real one via `/json/version`; if that lookup fails we pass the original through untouched so the
 * error the caller sees is about their endpoint, not about our probing.
 */
export async function resolveCdpTarget(endpoint: string): Promise<CdpTarget> {
  if (/^https?:\/\//i.test(endpoint)) {
    return { httpUrl: endpoint };
  }

  if (/^wss?:\/\//i.test(endpoint)) {
    if (/\/devtools\/browser\//.test(endpoint)) {
      return { wsUrl: endpoint };
    }

    // Bare websocket URL: discover the browser-level endpoint.
    const httpUrl = endpoint.replace(/^ws/i, 'http');
    try {
      const response = await fetch(`${httpUrl}/json/version`, { signal: AbortSignal.timeout(5000) });
      if (response.ok) {
        const body = (await response.json()) as { webSocketDebuggerUrl?: string };
        if (body?.webSocketDebuggerUrl) {
          return { httpUrl, wsUrl: body.webSocketDebuggerUrl };
        }
      }
    } catch (error) {
      console.warn(`${TAG} could not resolve "${endpoint}" via /json/version: ${(error as Error).message}`);
    }
    return { wsUrl: endpoint };
  }

  // No scheme at all — treat it as a host:port, the Docker-bridge case documented in the runbook.
  const httpUrl = `http://${endpoint}`;
  return { httpUrl };
}

/**
 * Acquire a Playwright browser.
 *
 * Callers own the returned browser and must close it in a `finally`. For a CDP connection that only
 * detaches Playwright from the shared Chrome — it does not kill the browser the other requests use.
 */
export async function acquirePlaywrightBrowser(): Promise<{ browser: any; mode: 'remote-cdp' | 'local-launch' }> {
  const runtime = getBrowserRuntime();
  if (runtime.mode === 'unavailable') {
    throw new BrowserUnavailableError(runtime.reason);
  }

  const playwright = await import('playwright');

  if (runtime.mode === 'remote-cdp') {
    const target = await resolveCdpTarget(runtime.endpoint!);
    const endpoint = target.httpUrl || target.wsUrl!;
    console.log(`${TAG} connecting Playwright to remote Chrome over CDP: ${endpoint}`);
    const browser = await playwright.chromium.connectOverCDP(endpoint, { timeout: 20000 });
    return { browser, mode: 'remote-cdp' };
  }

  console.log(`${TAG} launching a local Chromium (development fallback)`);
  const browser = await playwright.chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
  return { browser, mode: 'local-launch' };
}

/**
 * Whether Puppeteer should `connect()` rather than `launch()`.
 * Returns the arguments for `puppeteer.connect()`, or null when there is no remote endpoint.
 */
export async function getPuppeteerConnectOptions(): Promise<
  { browserURL?: string; browserWSEndpoint?: string } | null
> {
  const endpoint = getPuppeteerRemoteEndpoint();
  if (!endpoint) return null;

  const target = await resolveCdpTarget(endpoint);
  if (target.httpUrl && !target.wsUrl) {
    return { browserURL: target.httpUrl };
  }
  return { browserWSEndpoint: target.wsUrl || target.httpUrl! };
}

/**
 * Is the configured endpoint actually answering? Never throws — this exists to be called from
 * diagnostics, where an unreachable browser must be reported, not propagated.
 */
export async function probeRemoteBrowser(timeoutMs = 5000): Promise<{
  configured: boolean;
  reachable: boolean;
  endpoint: string | null;
  mode: BrowserMode;
  version?: string;
  error?: string;
}> {
  const runtime = getBrowserRuntime();
  if (runtime.mode !== 'remote-cdp' || !runtime.endpoint) {
    return {
      configured: false,
      reachable: false,
      endpoint: runtime.endpoint,
      mode: runtime.mode,
      error: runtime.reason || 'No remote browser configured',
    };
  }

  try {
    const target = await resolveCdpTarget(runtime.endpoint);
    const probeUrl = `${target.httpUrl || runtime.endpoint}/json/version`;
    const response = await fetch(probeUrl, { signal: AbortSignal.timeout(timeoutMs) });
    if (!response.ok) {
      return {
        configured: true,
        reachable: false,
        endpoint: runtime.endpoint,
        mode: runtime.mode,
        error: `CDP endpoint returned HTTP ${response.status}`,
      };
    }
    const body = (await response.json()) as { Browser?: string };
    return {
      configured: true,
      reachable: true,
      endpoint: runtime.endpoint,
      mode: runtime.mode,
      version: body?.Browser,
    };
  } catch (error) {
    return {
      configured: true,
      reachable: false,
      endpoint: runtime.endpoint,
      mode: runtime.mode,
      error: (error as Error).message,
    };
  }
}
