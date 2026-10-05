/**
 * Standalone background-worker process.
 *
 * Why this exists: these four loops used to start from `instrumentation.ts`, i.e. inside the web
 * container. Every redeploy of the site therefore killed and restarted them mid-flight — an
 * application submission could be cut off, and email delivery or inbound-mail ingestion paused for the
 * length of the deploy. They now run in their own container from the same image
 * (`docker build --target worker`), and the web container starts none of them.
 *
 * Run with: `npm run worker` (bundled by `scripts/build-worker.mjs`) or, in the image,
 * `node dist/worker.mjs`. Set `WORKER_ROLE=web` on the *web* service to switch it off there.
 *
 * Environment:
 *   WORKER_ROLE           all | web | worker   (default all — see ./roles.ts)
 *   WORKER_HEALTH_PORT    health port, default 8791
 *   WORKER_HEALTH_HOST    bind address, default 0.0.0.0 (container-internal)
 *   WORKER_HEARTBEAT_MS   status log interval, default 300000 (5 min)
 *   WORKER_SHUTDOWN_GRACE_MS  time allowed for an in-flight application, default 5000
 *
 * This module deliberately does not import from `next/*`: the bundle is plain Node. It also does not
 * read `.env` files — pass environment explicitly (`node --env-file=.env.local dist/worker.mjs` for a
 * local run) so a stray dotfile can never point the worker at the wrong database.
 */

import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { Db } from 'mongodb';
import {
  describeWorkerPlan,
  getEnabledLoops,
  getWorkerPlan,
  isWorkerProcess,
  resolveWorkerRole,
  type WorkerPlan,
} from './roles';
import { buildWorkerHealthPayload, type WorkerHealthPayload } from './health';

type LoopKey = keyof WorkerPlan;

interface LoopHandle {
  key: LoopKey;
  stop: () => void;
  status: () => unknown;
}

function readNumberEnv(name: string, fallback: number): number {
  const parsed = Number.parseInt(process.env[name] || '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/** Start every enabled loop, isolating failures so one bad module cannot take the process down. */
async function startLoops(plan: WorkerPlan): Promise<LoopHandle[]> {
  const handles: LoopHandle[] = [];
  const enabled = getEnabledLoops(plan);

  const start = async (key: LoopKey, boot: () => Promise<Omit<LoopHandle, 'key'>>) => {
    if (!plan[key]) return;
    try {
      handles.push({ key, ...(await boot()) });
      console.log(`[Worker] started loop: ${key}`);
    } catch (err) {
      console.error(`[Worker] FAILED to start loop ${key}:`, err);
    }
  };

  await start('email', async () => {
    const mod = await import('./emailWorker');
    mod.startEmailWorker();
    return { stop: () => mod.stopEmailWorker(), status: () => mod.getWorkerStatus() };
  });

  await start('emailIngestion', async () => {
    const mod = await import('@/services/emailIngestionService');
    mod.startIngestionWorker();
    return { stop: () => mod.stopIngestionWorker(), status: () => mod.getIngestionStatus() };
  });

  await start('applicationQueue', async () => {
    const mod = await import('./applicationWorker');
    mod.startApplicationWorker();
    // The queue drain has no status getter; the reconciliation log and the queue collection itself
    // are the observability for this loop.
    return { stop: () => mod.stopApplicationWorker(), status: () => ({ enabled: true }) };
  });

  await start('reconciliation', async () => {
    const [{ applicationReconciliationWorker }, mongoose] = await Promise.all([
      import('@/lib/reconciliation/reconciliationWorker'),
      import('mongoose'),
    ]);
    const db = mongoose.default.connection.db;
    if (!db) {
      // Without a Db handle the watchdog would silently do nothing — skip it loudly instead.
      throw new Error('MongoDB connection has no Db handle; reconciliation loop not started');
    }
    // Mongoose bundles its own `mongodb`, whose `Db` type is nominally incompatible with the top-level
    // package `reconciliationWorker` types against. Same cast as `src/lib/db.ts:getDb()`.
    applicationReconciliationWorker.start(db as unknown as Db, 60_000);
    return { stop: () => applicationReconciliationWorker.stop(), status: () => ({ enabled: true }) };
  });

  const missing = enabled.filter((key) => !handles.some((handle) => handle.key === key));
  if (missing.length > 0) {
    console.error(`[Worker] loops not running: ${missing.join(', ')}`);
  }

  return handles;
}

function collectStatuses(handles: LoopHandle[]): Record<string, unknown> {
  const statuses: Record<string, unknown> = {};
  for (const handle of handles) {
    try {
      statuses[handle.key] = handle.status();
    } catch (err) {
      statuses[handle.key] = { error: err instanceof Error ? err.message : String(err) };
    }
  }
  return statuses;
}

function startHealthServer(
  port: number,
  host: string,
  payload: () => WorkerHealthPayload
): Server {
  const server = createServer((req: IncomingMessage, res: ServerResponse) => {
    const path = (req.url || '/').split('?')[0];
    const isHealth = path === '/health' || path === '/live' || path === '/';

    if (!isHealth) {
      res.writeHead(404, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: 'not_found' }));
      return;
    }

    const body = JSON.stringify(payload(), null, 2);
    res.writeHead(200, {
      'content-type': 'application/json',
      'content-length': Buffer.byteLength(body),
      'cache-control': 'no-store',
    });
    res.end(body);
  });

  server.on('error', (err) => {
    // A taken health port is a configuration problem, not a reason to stop processing applications.
    console.error(`[Worker] health server error on ${host}:${port}:`, err);
  });

  server.listen(port, host, () => {
    console.log(`[Worker] health server listening on http://${host}:${port}/health`);
  });

  return server;
}

async function main(): Promise<void> {
  const startedAt = new Date();
  const { role, warning } = resolveWorkerRole();
  const plan = getWorkerPlan(role);

  if (warning) console.warn(`[Worker] ${warning}`);

  if (!isWorkerProcess(plan)) {
    // Reached when this entrypoint is started with WORKER_ROLE=web — usually the wrong service.
    console.error(
      `[Worker] WORKER_ROLE=${role} enables no loops (${describeWorkerPlan(plan)}). ` +
        'Refusing to idle: set WORKER_ROLE=worker (or unset it) on the worker service, or remove this service.'
    );
    process.exit(1);
  }

  console.log(
    `[Worker] starting pid=${process.pid} role=${role} node=${process.version} loops=[${describeWorkerPlan(plan)}]`
  );

  // Connect before starting loops: the queue drain and the watchdog both assume a live connection,
  // and a failure here is much easier to read than four loops logging their own timeouts.
  const { getConnection, closeConnection } = await import('@/lib/database');
  await getConnection();
  console.log('[Worker] MongoDB connected');

  const handles = await startLoops(plan);

  if (handles.length === 0) {
    // Every loop failed to start. Exiting lets the orchestrator restart us instead of running a
    // process that looks healthy but does nothing.
    console.error('[Worker] no loops started — exiting so the service is restarted');
    await closeConnection().catch(() => {});
    process.exit(1);
  }

  const healthPort = readNumberEnv('WORKER_HEALTH_PORT', 8791);
  const healthHost = (process.env.WORKER_HEALTH_HOST || '0.0.0.0').trim() || '0.0.0.0';
  const buildPayload = () =>
    buildWorkerHealthPayload({ role, plan, startedAt, loops: collectStatuses(handles) });
  const server = startHealthServer(healthPort, healthHost, buildPayload);

  const heartbeat = setInterval(() => {
    const payload = buildPayload();
    console.log(
      `[Worker] heartbeat uptime=${payload.uptimeSeconds}s rss=${payload.memoryRssMb}MB loops=${JSON.stringify(payload.loops)}`
    );
  }, readNumberEnv('WORKER_HEARTBEAT_MS', 300_000));

  let shuttingDown = false;
  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`[Worker] ${signal} received — stopping loops`);

    clearInterval(heartbeat);
    for (const handle of [...handles].reverse()) {
      try {
        handle.stop();
      } catch (err) {
        console.error(`[Worker] error stopping loop ${handle.key}:`, err);
      }
    }

    // Give an in-flight application submission time to finish rather than tearing down its browser
    // session mid-submit. Anything still running after this is recovered by the queue's stuck-item
    // release on the next start.
    const grace = readNumberEnv('WORKER_SHUTDOWN_GRACE_MS', 5_000);
    await new Promise((resolve) => setTimeout(resolve, grace));

    server.close();
    await closeConnection().catch(() => {});
    console.log('[Worker] shutdown complete');
    process.exit(0);
  };

  // Take ownership of process signals. Modules imported above register their own SIGTERM/SIGINT handlers
  // at import time — `workers/emailWorker` and `lib/database/connection-manager` both call
  // `process.exit()` from theirs, which would preempt this ordered shutdown, including the grace period
  // that lets an in-flight application submission finish. The supervisor is the single owner here, and
  // it performs the connection close itself below.
  process.removeAllListeners('SIGTERM');
  process.removeAllListeners('SIGINT');
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));

  // Node's default for an uncaught exception/rejection is to exit; make it explicit and logged so a
  // crash loop in Dokploy shows the cause instead of a silent restart.
  process.on('uncaughtException', (err) => {
    console.error('[Worker] uncaught exception:', err);
    process.exit(1);
  });
  process.on('unhandledRejection', (reason) => {
    console.error('[Worker] unhandled rejection:', reason);
    process.exit(1);
  });
}

main().catch((err) => {
  console.error('[Worker] fatal startup error:', err);
  process.exit(1);
});
