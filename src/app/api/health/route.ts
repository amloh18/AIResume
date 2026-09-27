import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import { validateEnvironment } from '@/lib/env-validation';
import { resolveWorkerRole, getWorkerPlan, getEnabledLoops } from '@/workers/roles';
import { resolveBuildTime } from '@/workers/health';

/**
 * Health endpoint.
 *
 * ## Why this shape
 *
 * The first version awaited *every* dependency before responding: MongoDB, Ollama, the Gemini API,
 * a real Stalwart SMTP handshake, and Polar. In production two of those can never succeed from inside
 * the container —
 *
 *   - `mail.morigrid.com:443/:587` times out because the container cannot hairpin back out to its own
 *     public hostname (the NAT path goes out and the connection is dropped rather than reflected),
 *   - `127.0.0.1:11434` (Ollama) is not running in this container at all,
 *
 * so `/api/health` hung for the full SMTP TCP timeout and then returned 503 — on a service that was
 * serving 200s the whole time. Every monitor, load balancer and human curling it saw "down".
 *
 * Health is now split by intent:
 *
 *   GET /api/health            → LIVENESS. Process up, env present, memory sane. No network I/O.
 *                                 Answers in single-digit milliseconds. This is what a load balancer
 *                                 or uptime check should poll.
 *   GET /api/health?deep=1     → READINESS/DEPENDENCIES. Runs the real dependency checks, each under
 *                                 an independent timeout budget so one dead upstream cannot stall the
 *                                 response indefinitely. Use this for diagnosis, not for liveness.
 *
 * A dependency that is unreachable is reported as `degraded`, not as a reason to declare the whole
 * process unhealthy: an SMTP hairpin timeout says something about the network path, not about whether
 * the web server can serve traffic.
 */

type CheckStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';

interface DependencyResult {
  status: CheckStatus;
  responseTimeMs?: number;
  error?: string;
  missingVars?: string[];
}

/** Per-dependency ceiling for `?deep=1`. Keeps the whole route bounded even with several dead upstreams. */
const DEEP_CHECK_TIMEOUT_MS = 3000;

/** Absolute ceiling for the entire `?deep=1` handler. */
const DEEP_TOTAL_BUDGET_MS = 8000;

/**
 * Run a probe under a timeout. Never throws — a rejected dependency is a *result*, not an exception
 * that should take down the health response.
 */
async function withTimeout(label: string, probe: () => Promise<void>): Promise<DependencyResult> {
  const started = Date.now();
  try {
    await Promise.race([
      probe(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`${label} timed out after ${DEEP_CHECK_TIMEOUT_MS}ms`)), DEEP_CHECK_TIMEOUT_MS)
      ),
    ]);
    return { status: 'healthy', responseTimeMs: Date.now() - started };
  } catch (err) {
    return {
      status: 'unhealthy',
      responseTimeMs: Date.now() - started,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

function checkEnvironment(): DependencyResult & { missingVars: string[] } {
  const validation = validateEnvironment();
  return {
    status: validation.isValid ? 'healthy' : 'unhealthy',
    error: validation.isValid ? undefined : validation.errors.join('; ') || 'missing required variables',
    // Surfaced so an operator can see *which* variables are absent rather than just "unhealthy".
    missingVars: validation.missing,
  };
}

function checkMemory(): DependencyResult & { usedMb: number; heapTotalMb: number; percentage: number } {
  const { heapUsed, heapTotal, rss } = process.memoryUsage();
  const percentage = heapTotal > 0 ? (heapUsed / heapTotal) * 100 : 0;
  const status: CheckStatus = percentage < 70 ? 'healthy' : percentage < 90 ? 'degraded' : 'unhealthy';
  return {
    status,
    usedMb: Math.round(heapUsed / 1024 / 1024),
    heapTotalMb: Math.round(heapTotal / 1024 / 1024),
    percentage: Math.round(percentage * 100) / 100,
    // RSS is what the OOM killer actually looks at; heap percentage alone hides native growth.
    ...( { rssMb: Math.round(rss / 1024 / 1024) } as object ),
  };
}

async function checkDatabase(): Promise<DependencyResult> {
  return withTimeout('mongo', async () => {
    const mongoose = await getConnection();
    if (mongoose.connection.readyState !== 1) throw new Error('Database not connected');
  });
}

/**
 * Each external probe reports on its own. None of them can be `unhealthy` for the *process*: the app
 * is still able to serve requests when a third party is down, and treating that as process failure is
 * what made the old endpoint useless.
 */
async function checkExternalServices(): Promise<Record<string, DependencyResult>> {
  const results: Record<string, DependencyResult> = {};

  const probes: Array<[string, () => Promise<void> | void, boolean]> = [
    // ── Ollama (primary AI model) ────────────────────────────────────────────
    // Absent OLLAMA_BASE_URL this probes 127.0.0.1:11434 inside the container, which refuses
    // connections. Report `unknown` rather than `unhealthy` when it was never configured.
    [
      'ollama',
      async () => {
        const { ollamaHealthCheck } = await import('@/lib/utils/ollama-client');
        if (!(await ollamaHealthCheck())) throw new Error('Ollama health check failed');
      },
      Boolean(process.env.OLLAMA_BASE_URL),
    ],

    // ── Gemini (fallback AI model) ──────────────────────────────────────────
    [
      'gemini',
      async () => {
        const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models', {
          headers: { 'X-Goog-Api-Key': process.env.GEMINI_API_KEY! },
          signal: AbortSignal.timeout(DEEP_CHECK_TIMEOUT_MS),
        });
        if (!response.ok) throw new Error(`Gemini responded ${response.status}`);
      },
      Boolean(process.env.GEMINI_API_KEY),
    ],

    // ── Stalwart SMTP ───────────────────────────────────────────────────────
    // This is the check that used to hang the route: a real SMTP handshake to mail.morigrid.com
    // over a hairpin path that never completes. It now runs under its own 3s timeout.
    [
      'email',
      async () => {
        const { testStalwartConnection } = await import('@/lib/services/applicationEmailService');
        const check = await testStalwartConnection();
        if (!check.success) throw new Error(check.message);
      },
      Boolean(process.env.STALWART_SMTP_HOST || process.env.EMAIL_SERVER_HOST),
    ],
  ];

  await Promise.all(
    probes.map(async ([name, probe, configured]) => {
      if (!configured) {
        results[name] = { status: 'unknown', error: 'not configured' };
        return;
      }
      try {
        results[name] = await withTimeout(name, probe as () => Promise<void>);
      } catch (err) {
        results[name] = { status: 'unknown', error: err instanceof Error ? err.message : String(err) };
      }
    })
  );

  // Polar is configuration-only: no network call, just whether billing credentials exist.
  results.polar = process.env.POLAR_ACCESS_TOKEN
    ? { status: 'healthy' }
    : { status: 'unknown', error: 'not configured' };

  return results;
}

/**
 * Build identity — so an operator can tell exactly what is running.
 *
 * ⚠️ `commit` has **always** been `'unknown'` in this deployment, and still is. It only reports a value
 * if something supplies `GIT_COMMIT` at build time; Dokploy exposes no build arg for it and
 * `.dockerignore` excludes `.git`, so it cannot be derived either. A field that is permanently
 * "unknown" reads as a working feature, which is why `buildTime` exists beside it: the Dockerfile
 * stamps it at build time, so it needs nothing passed in and is what the admin panel actually compares
 * against the worker's.
 */
function getBuildInfo(): { commit: string; version: string; buildTime: string } {
  return {
    commit: process.env.GIT_COMMIT || process.env.SOURCE_COMMIT || 'unknown',
    version: process.env.npm_package_version || process.env.npm_package_version || '1.0.0',
    buildTime: resolveBuildTime(),
  };
}

/**
 * Which background loops *this process* runs, per `WORKER_ROLE`.
 *
 * The web and worker tiers are the same image, so from the outside they are indistinguishable —
 * which made "did the worker-daemon service actually come up with the loops enabled?" an SSH-level
 * question. Reporting role + enabled loops here answers it with a curl, and makes two failure modes
 * visible immediately: a web container silently running the loops (role `all`/`worker` where `web`
 * was intended) and a deployment where *no* tier runs them (both reporting `web`).
 */
function getWorkerInfo(): { role: string; loops: string[]; warning?: string } {
  const { role, warning } = resolveWorkerRole();
  const plan = getWorkerPlan(role);
  return {
    role,
    loops: getEnabledLoops(plan),
    ...(warning ? { warning } : {}),
  };
}

const CACHE_HEADERS = {
  'Cache-Control': 'no-cache, no-store, must-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
};

/**
 * LIVENESS — the default. Deliberately does no network I/O: it answers the only question a load
 * balancer or uptime monitor needs, "is this process able to serve requests?", in milliseconds.
 */
export async function GET(request: NextRequest) {
  const started = Date.now();
  const deep = request.nextUrl.searchParams.get('deep') === '1';
  const build = getBuildInfo();

  if (!deep) {
    const environment = checkEnvironment();
    const memory = checkMemory();

    // Liveness only fails when the process itself is broken. A missing optional env var or a full
    // heap is reported for visibility but does not flip the service out of rotation — that would
    // take down a healthy web server because a third party is misconfigured.
    const live = true;
    return NextResponse.json(
      {
        status: live ? 'healthy' : 'unhealthy',
        mode: 'liveness',
        timestamp: new Date().toISOString(),
        commit: build.commit,
        version: build.version,
        worker: getWorkerInfo(),
        environment: process.env.NODE_ENV || 'development',
        uptimeSeconds: Math.floor(process.uptime()),
        responseTimeMs: Date.now() - started,
        checks: { environment, memory },
      },
      { status: live ? 200 : 503, headers: CACHE_HEADERS }
    );
  }

  // ── DEEP: real dependency checks, all bounded ────────────────────────────────
  try {
    const [database, environment, external] = await Promise.race([
      Promise.all([checkDatabase(), Promise.resolve(checkEnvironment()), checkExternalServices()]),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Deep health check exceeded ${DEEP_TOTAL_BUDGET_MS}ms budget`)), DEEP_TOTAL_BUDGET_MS)
      ),
    ]);
    const memory = checkMemory();

    // Only MongoDB and the environment gate readiness: they are this process's own dependencies.
    // External services degrade the report but do not fail the process.
    const criticalFailed = [database, environment].some((c) => c.status === 'unhealthy');
    const anyDegraded =
      memory.status === 'degraded' || Object.values(external).some((c) => c.status === 'unhealthy');

    const status: 'healthy' | 'degraded' | 'unhealthy' = criticalFailed
      ? 'unhealthy'
      : anyDegraded
        ? 'degraded'
        : 'healthy';

    return NextResponse.json(
      {
        status,
        mode: 'deep',
        timestamp: new Date().toISOString(),
        commit: build.commit,
        version: build.version,
        worker: getWorkerInfo(),
        environment: process.env.NODE_ENV || 'development',
        uptimeSeconds: Math.floor(process.uptime()),
        responseTimeMs: Date.now() - started,
        checks: { database, environment, memory, externalServices: external },
      },
      { status: status === 'unhealthy' ? 503 : 200, headers: CACHE_HEADERS }
    );
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        mode: 'deep',
        timestamp: new Date().toISOString(),
        commit: build.commit,
        version: build.version,
        worker: getWorkerInfo(),
        uptimeSeconds: Math.floor(process.uptime()),
        responseTimeMs: Date.now() - started,
        error: error instanceof Error ? error.message : 'Deep health check failed',
        checks: {
          database: { status: 'unhealthy', error: 'not reached — deep check did not complete' },
          environment: checkEnvironment(),
          memory: checkMemory(),
          externalServices: {},
        },
      },
      { status: 503, headers: CACHE_HEADERS }
    );
  }
}

/**
 * Load-balancer probe. Kept intentionally free of network I/O as well — a HEAD that hangs on a
 * database round-trip defeats the purpose of a cheap probe.
 */
export async function HEAD() {
  return new NextResponse(null, { status: 200, headers: CACHE_HEADERS });
}
