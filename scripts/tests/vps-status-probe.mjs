/**
 * Functional probe for the decoupled-architecture status logic in /api/admin/vps-setup.
 *
 * The HTTP route requires an admin session, so this harness exercises `checkVpsStatus` directly:
 * esbuild bundles the actual route module (with next/server and next-auth stubbed), and we invoke the
 * handler with a fake NextRequest whose `?action=status` query triggers the GET path.
 *
 * Run: node scripts/tests/vps-status-probe.mjs        (offline: probes report 'not configured')
 *      REMOTE_STUBS=1 node scripts/tests/vps-status-probe.mjs  (stubs all three VPS endpoints)
 */
import path from 'node:path';
import esbuild from 'esbuild';

const ROOT = process.cwd();
const OUTDIR = '.vps-status-probe.tmp';
const ENTRY = path.join(OUTDIR, 'vps-status-entry.ts');
const OUTFILE = path.join(OUTDIR, 'vps-status-bundle.mjs');

const ROUTE = `
import { GET } from '@admin/app/api/admin/vps-setup/route';
export async function runStatus() {
  const url = new URL('http://localhost/api/admin/vps-setup?action=status');
  const req = { url: url.toString(), nextUrl: url, headers: new Headers() };
  const res = await GET(req);
  return res.json();
}
`;

import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
mkdirSync(OUTDIR, { recursive: true });
writeFileSync(ENTRY, ROUTE);

// When REMOTE_STUBS=1, spin up local stubs of the three VPS endpoints and point the probes at them,
// then require the remote surfaces to report online/healthy — the dashboard's green path.
const useStubs = process.env.REMOTE_STUBS === '1';
let stubs = null;
if (useStubs) {
  const { startStubs } = await import('./remote-stubs.mjs');
  stubs = startStubs();
  process.env.INGESTION_WORKER_URL = 'http://127.0.0.1:8790';
  // Fixture token, not a credential. Must be assigned BEFORE `remote-stubs.mjs` is imported —
  // that module reads it at load time. (This previously hardcoded the production token.)
  process.env.INGESTION_WORKER_TOKEN = process.env.STUB_WORKER_TOKEN || 'local-stub-token';
  process.env.INGESTION_SERVICE_URL = 'http://127.0.0.1:4001';
  process.env.WORKER_HEALTH_URL = 'http://127.0.0.1:8791';
  process.env.STALWART_SMTP_HOST = '172.19.0.1';
}

const STUBS = {
  // Minimal next/server stub: the route only uses NextRequest as a type and NextResponse.json().
  'next/server': `
export class NextResponse {
  constructor(body, init) { this.body = body; this.init = init; }
  static json(data, init) { return { json: async () => data, status: init?.status ?? 200 }; }
}
export class NextRequest {}
`,
  // No NextAuth in a plain node bundle — return a synthetic admin so requireAdmin passes and the
  // status logic itself is what we are testing. (The real HTTP route still enforces auth; that was
  // verified separately: unauthenticated requests get 401.)
  'next-auth': `
export async function getServerSession() {
  return { user: { id: 'probe', type: 'admin', role: 'admin', email: 'probe@local' } };
}
export default { providers: [] };
`,
  'next-auth/providers/google': 'export default {};',
  'next-auth/providers/credentials': 'export default {};',
  'next-auth/providers/apple': 'export default {};',
  'next-auth/providers/linkedin': 'export default {};',
  'next/headers': `
export function headers() { throw new Error('no request scope'); }
export function cookies() { throw new Error('no request scope'); }
export default { headers, cookies };
`,
};

const plugin = {
  name: 'stub-modules',
  setup(build) {
    for (const [spec, contents] of Object.entries(STUBS)) {
      build.onResolve({ filter: new RegExp(`^${spec.replace(/[/.]/g, '\\$&')}$`) }, () => ({
        path: spec,
        namespace: 'stub',
      }));
    }
    build.onLoad({ filter: /.*/, namespace: 'stub' }, (args) => ({
      contents: STUBS[args.path] ?? 'export default {};',
      loader: 'ts',
    }));
  },
};

await esbuild.build({
  absWorkingDir: ROOT,
  entryPoints: [ENTRY],
  outfile: OUTFILE,
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'node22',
  packages: 'external',
  // Bundle against the ADMIN tsconfig. The route moved to the operations app with the admin
  // split, and the admin tsconfig's `paths` are what make `@/` (the shared codebase) and
  // `@admin/` (the operations app) resolve. This used to point at a repo-root `tsconfig.json`,
  // which has not existed since `src/` moved to `apps/airesume_app` — so the probe was already stale.
  tsconfig: path.join(ROOT, 'apps', 'admin', 'tsconfig.json'),
  alias: {
    'server-only': path.join(ROOT, 'scripts', 'server-only-shim.js'),
    'next/headers': path.join(ROOT, 'scripts', 'next-headers-shim.mjs'),
  },
  banner: { js: 'import{createRequire}from"module";const require=createRequire(import.meta.url);' },
  plugins: [plugin],
  logLevel: 'warning',
});

const { runStatus } = await import(path.join(ROOT, OUTFILE));
process.on('exit', () => rmSync(path.join(ROOT, OUTDIR), { recursive: true, force: true }));
const result = await runStatus();

console.log(JSON.stringify(result, null, 2));

// Sanity assertions on the shape the dashboard consumes.
const status = result?.status ?? {};
const checks = {
  'success true': result?.success === true,
  'setupScript present': typeof status.setupScript?.exists === 'boolean',
  'workerGateway present': typeof status.workerGateway?.configured === 'boolean',
  'ingestionService present': typeof status.ingestionService?.configured === 'boolean',
  'workerLoop present': typeof status.workerLoop?.configured === 'boolean',
  'stalwart containerName': typeof status.stalwart?.containerName === 'string',
};

if (useStubs) {
  Object.assign(checks, {
    'gateway online (probed :8790)': status.workerGateway?.online === true,
    'gateway mode is remote-gateway': status.workerGateway?.mode === 'remote-gateway',
    'ingestion service reachable': status.ingestionService?.reachable === true,
    'ingestion scheduler running': status.ingestionService?.schedulerRunning === true,
    'ingestion sources include smartrecruiters': status.ingestionService?.sources?.some((s) => s.name === 'smartrecruiters') === true,
    'all 12 sources reported': (status.ingestionService?.sources?.length ?? 0) === 12,
    'worker loop visible with uptime': (status.workerLoop?.uptimeSeconds ?? 0) > 0,
    'worker loop shows email queue enabled': status.workerLoop?.loops?.applicationQueue?.enabled === true,
    'stalwart green via env': status.stalwart?.running === true,
    'checks probed remotely flag': status._diagnostics?.checksProbedRemotely === true,
  });
  stubs.stop();
}
let failed = 0;
for (const [name, ok] of Object.entries(checks)) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
  if (!ok) failed++;
}
process.exit(failed ? 1 : 0);
