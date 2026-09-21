/**
 * Local stubs of the three VPS endpoints, for verifying the admin dashboard's remote paths without a
 * VPS. Started by `vps-status-probe.mjs` when `REMOTE_STUBS=1`:
 *   :8790  worker gateway    (JobSpy + LinkedIn)    token-gated /health
 *   :4001  ingestion service (public-ATS sources)   /health with per-source breakdown
 *   :8791  background worker                        /health (src/workers/health.ts payload)
 */
import { createServer } from 'node:http';

const TOKEN = 'vps_worker_secure_secret_2026';

function json(res, body, status = 200) {
  const payload = JSON.stringify(body);
  res.writeHead(status, { 'content-type': 'application/json', 'content-length': Buffer.byteLength(payload) });
  res.end(payload);
}

export function startStubs() {
  const servers = [];

  // Worker gateway :8790 — rejects unauthenticated calls, mirrors worker-gateway.py's /health shape.
  servers.push(
    createServer((req, res) => {
      if (req.headers.authorization !== `Bearer ${TOKEN}`) return json(res, { error: 'unauthorized' }, 401);
      if (req.url === '/health') {
        return json(res, {
          status: 'ok',
          version: '1.2.0',
          workers: {
            jobspy: { scriptPresent: true, venvPresent: true, python: '/opt/cvcircle-build/scripts/.venv/bin/python3' },
            linkedin: { scriptPresent: true, venvPresent: true, python: '/opt/cvcircle-build/scripts/linkedin-worker/.venv/bin/python3' },
          },
        });
      }
      json(res, { error: 'not_found' }, 404);
    }).listen(8790)
  );

  // Ingestion microservice :4001 — /health with per-source circuit-breaker breakdown.
  const BREAKDOWN = {};
  for (const [name, displayName] of [
    ['smartrecruiters', 'SmartRecruiters ATS'],
    ['workable', 'Workable ATS'],
    ['recruitee', 'Recruitee ATS'],
    ['personio', 'Personio ATS'],
    ['greenhouse', 'Greenhouse ATS'],
    ['lever', 'Lever ATS'],
    ['ashby', 'Ashby ATS'],
    ['workday', 'Workday ATS'],
    ['adzuna', 'Adzuna'],
    ['remotive', 'Remotive'],
    ['remoteok', 'RemoteOK'],
    ['jobspy', 'JobSpy Aggregator'],
  ]) {
    BREAKDOWN[name] = {
      displayName,
      health: 'healthy',
      lastSuccessAt: new Date(Date.now() - 15 * 60000).toISOString(),
    };
  }

  servers.push(
    createServer((req, res) => {
      if (req.url !== '/health') return json(res, { error: 'not_found' }, 404);
      json(res, {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptimeSeconds: 86400,
        service: 'buildairesume-job-ingestion',
        mongodb: { connected: true, database: 'airesume', pingMs: 2 },
        scheduler: { running: true },
        sources: { total: 12, healthy: 12, degraded: 0, circuitOpen: 0, breakdown: BREAKDOWN },
      });
    }).listen(4001)
  );

  // Background worker :8791 — the payload src/workers/health.ts builds.
  servers.push(
    createServer((req, res) => {
      if (req.url !== '/health') return json(res, { error: 'not_found' }, 404);
      json(res, {
        ok: true,
        role: 'worker',
        pid: 42,
        startedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
        uptimeSeconds: 3 * 86400 + 1250,
        memoryRssMb: 310,
        loops: {
          email: { isRunning: true, activeJobs: 0, maxConcurrent: 2 },
          emailIngestion: { isRunning: true, isIngesting: false, consecutiveFailures: 0, lastError: null },
          applicationQueue: { enabled: true },
          reconciliation: { enabled: true },
          enabled: ['email', 'emailIngestion', 'applicationQueue', 'reconciliation'],
        },
      });
    }).listen(8791)
  );

  return {
    stop() {
      for (const s of servers) s.close();
    },
  };
}
