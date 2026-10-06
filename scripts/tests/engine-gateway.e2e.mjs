/**
 * End-to-end test: the REAL engine.ts talking to the REAL worker gateway over HTTP.
 *
 * Run from the project root:   node scripts/tests/engine-gateway.e2e.mjs
 *
 * Why this exists separately from `test_worker_gateway.py`:
 *   - that suite proves the gateway's transport in isolation;
 *   - the production build proves everything compiles;
 *   - neither proves that `engine.ts`'s fetch call uses the right URL shape, sends the right auth
 *     header, normalises a trailing slash, or fails cleanly when the host is unreachable.
 *
 * This test found a real bug on first run: `/health` was serving the project layout to any caller on the
 * Docker network. It is now token-gated, with an unauthenticated `/live` for liveness.
 *
 * The test bundles the actual module with esbuild, so it exercises shipped code — not a copy.
 */

import { spawn, execFileSync } from 'node:child_process';
import { existsSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const PYTHON = process.env.TEST_PYTHON || 'python3';
const PORT = Number(process.env.TEST_GATEWAY_PORT || 8793);
const TOKEN = 'e2e-secret-token';
const ENTRY = path.join(PROJECT_ROOT, '.e2e-entry.ts');
const BUNDLE = path.join(PROJECT_ROOT, '.e2e-bundle.mjs');

const results = [];
const record = (name, ok, detail) => results.push({ name, ok, detail: detail || '' });

function buildBundle() {
  // The entry re-exports only the surface under test, so the bundle stays small.
  writeFileSync(
    ENTRY,
    `export {
  isWorkerGatewayEnabled,
  getWorkerExecutionMode,
  checkSourceConfig,
  probeWorkerGateway,
} from '@/lib/ingestion/engine';
`
  );

  execFileSync(
    'npx',
    [
      'esbuild',
      ENTRY,
      '--bundle',
      '--format=esm',
      '--platform=node',
      `--tsconfig=${path.join(PROJECT_ROOT, 'tsconfig.json')}`,
      // Keep node_modules external so we do not inline mongoose et al.
      '--packages=external',
      // `server-only` throws outside a React server build.
      `--alias:server-only=${path.join(PROJECT_ROOT, 'scripts', 'server-only-shim.js')}`,
      // engine.ts uses `require('fs')` in two places. Under ESM output esbuild rewrites that to a
      // `__require` that throws, and the surrounding try/catch turns it into a misleading "script not
      // found". Inject a real require so the local-path assertions test the real code.
      `--banner:js=import{createRequire}from"module";const require=createRequire(import.meta.url);`,
      `--outfile=${BUNDLE}`,
    ],
    { cwd: PROJECT_ROOT, stdio: 'pipe' }
  );
}

async function waitForLive(deadlineMs = 15000) {
  const deadline = Date.now() + deadlineMs;
  while (Date.now() < deadline) {
    try {
      // /live is the unauthenticated readiness endpoint; /health requires the token.
      if ((await fetch(`http://127.0.0.1:${PORT}/live`)).ok) return;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error('gateway never became healthy');
}

let child;

try {
  buildBundle();
  record('esbuild bundled the real engine.ts', existsSync(BUNDLE), BUNDLE);

  child = spawn(PYTHON, ['scripts/worker-gateway.py'], {
    cwd: PROJECT_ROOT,
    env: { ...process.env, WORKER_GATEWAY_PORT: String(PORT), WORKER_GATEWAY_TOKEN: TOKEN },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  await waitForLive();

  // ── 0. Endpoint auth surface ──────────────────────────────────────────────
  const live = await fetch(`http://127.0.0.1:${PORT}/live`);
  const liveBody = await live.json();
  record('0: GET /live is reachable without a token', live.status === 200, `status=${live.status}`);
  record(
    '0: /live exposes no paths or worker detail',
    Object.keys(liveBody).sort().join(',') === 'status,version',
    JSON.stringify(liveBody)
  );

  const healthNoAuth = await fetch(`http://127.0.0.1:${PORT}/health`);
  record('0: GET /health without a token -> 401', healthNoAuth.status === 401, `status=${healthNoAuth.status}`);

  const healthBadAuth = await fetch(`http://127.0.0.1:${PORT}/health`, {
    headers: { Authorization: 'Bearer nope' },
  });
  record('0: GET /health with a wrong token -> 401', healthBadAuth.status === 401, `status=${healthBadAuth.status}`);

  const healthGoodAuth = await fetch(`http://127.0.0.1:${PORT}/health`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  const healthBody = await healthGoodAuth.json();
  record('0: GET /health with the right token -> 200', healthGoodAuth.status === 200, `status=${healthGoodAuth.status}`);
  record('0: /health gives the operator worker detail', !!healthBody.workers, '');

  const engine = await import(BUNDLE);

  // ── A. No gateway configured: must behave exactly as before this change ───
  delete process.env.INGESTION_WORKER_URL;
  delete process.env.INGESTION_WORKER_TOKEN;

  record('A: isWorkerGatewayEnabled() false with no env', engine.isWorkerGatewayEnabled() === false, '');

  const modeLocal = engine.getWorkerExecutionMode();
  record(
    'A: getWorkerExecutionMode() reports local-spawn',
    modeLocal.mode === 'local-spawn' && modeLocal.gatewayUrl === null,
    JSON.stringify(modeLocal)
  );

  const probeUnconfigured = await engine.probeWorkerGateway(2000);
  record(
    'A: probe reports not-configured without throwing',
    probeUnconfigured.configured === false && probeUnconfigured.reachable === false,
    JSON.stringify(probeUnconfigured)
  );

  // The local path must still find the scripts it spawns — this is the rollback guarantee.
  const cfgLocal = engine.checkSourceConfig('jobspy');
  record('A: checkSourceConfig(jobspy) still ready on the local path', cfgLocal.ready === true, JSON.stringify(cfgLocal));

  // ── B. Gateway configured correctly: real HTTP round trip ─────────────────
  process.env.INGESTION_WORKER_URL = `http://127.0.0.1:${PORT}`;
  process.env.INGESTION_WORKER_TOKEN = TOKEN;

  record('B: isWorkerGatewayEnabled() true once env is set', engine.isWorkerGatewayEnabled() === true, '');

  const modeRemote = engine.getWorkerExecutionMode();
  record(
    'B: getWorkerExecutionMode() reports remote-gateway with the URL',
    modeRemote.mode === 'remote-gateway' && modeRemote.gatewayUrl === `http://127.0.0.1:${PORT}`,
    JSON.stringify(modeRemote)
  );

  const probe = await engine.probeWorkerGateway(5000);
  record('B: probe reaches the live gateway', probe.reachable === true, `status=${probe.status}`);
  record('B: probe surfaces HTTP 200', probe.status === 200, `status=${probe.status}`);
  record(
    'B: probe body carries both workers',
    !!probe.body && !!probe.body.workers && Object.keys(probe.body.workers).sort().join(',') === 'jobspy,linkedin',
    JSON.stringify(probe.body && probe.body.workers ? Object.keys(probe.body.workers) : null)
  );
  record('B: probe body confirms the token was accepted', !!probe.body && probe.body.authenticated === true, '');

  // In remote mode the local script check must be SKIPPED — the script lives on the VPS.
  const cfgRemote = engine.checkSourceConfig('jobspy');
  record(
    'B: checkSourceConfig(jobspy) skips the local file check in remote mode',
    cfgRemote.ready === true,
    JSON.stringify(cfgRemote)
  );

  // ── C. Wrong token must be surfaced, not swallowed ────────────────────────
  process.env.INGESTION_WORKER_TOKEN = 'wrong-token';
  const probeBadToken = await engine.probeWorkerGateway(5000);
  record(
    'C: wrong token surfaces HTTP 401 rather than looking healthy',
    probeBadToken.reachable === false && probeBadToken.status === 401,
    `reachable=${probeBadToken.reachable} status=${probeBadToken.status}`
  );

  // ── D. Trailing slash is normalised (a common copy-paste error) ───────────
  process.env.INGESTION_WORKER_URL = `http://127.0.0.1:${PORT}/`;
  process.env.INGESTION_WORKER_TOKEN = TOKEN;
  const probeSlash = await engine.probeWorkerGateway(5000);
  record(
    'D: trailing slash in the URL is normalised',
    probeSlash.reachable === true && probeSlash.url === `http://127.0.0.1:${PORT}`,
    `reachable=${probeSlash.reachable} url=${probeSlash.url}`
  );

  // ── E. Unreachable gateway must fail fast and cleanly, not hang ───────────
  process.env.INGESTION_WORKER_URL = 'http://127.0.0.1:9';
  const started = Date.now();
  const probeDead = await engine.probeWorkerGateway(3000);
  const elapsed = Date.now() - started;
  record(
    'E: unreachable gateway returns reachable:false instead of throwing',
    probeDead.reachable === false && typeof probeDead.error === 'string',
    JSON.stringify(probeDead).slice(0, 160)
  );
  record('E: unreachable gateway fails fast (<3s)', elapsed < 3000, `elapsed=${elapsed}ms`);
} catch (err) {
  record('harness completed without throwing', false, String(err && err.stack).slice(0, 300));
} finally {
  if (child) child.kill('SIGKILL');
  for (const f of [ENTRY, BUNDLE]) {
    try {
      rmSync(f, { force: true });
    } catch {
      /* best effort */
    }
  }
}

let failed = 0;
for (const r of results) {
  if (!r.ok) failed++;
  console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.detail ? `  [${r.detail}]` : ''}`);
}
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
