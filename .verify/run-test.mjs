/**
 * Runner: bundles a real `*.test.ts` with the vitest shim aliased in, executes
 * it, and exits non-zero on any failed assertion.
 *
 * Usage: node .verify/run-test.mjs <path-to-test.ts>
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const testFile = process.argv[2];
if (!testFile) {
  console.error('Usage: node .verify/run-test.mjs <path-to-test.ts>');
  process.exit(2);
}

const projectRoot = process.cwd();
const outDir = path.join(projectRoot, '.verify', 'build');
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

const outFile = path.join(outDir, 'bundle.mjs');

execFileSync(
  path.join(projectRoot, 'node_modules', '.bin', 'esbuild'),
  [
    testFile,
    '--bundle',
    '--format=esm',
    '--platform=node',
    '--packages=external',
    `--outfile=${outFile}`,
    `--tsconfig=${path.join(projectRoot, 'tsconfig.json')}`,
    '--alias:vitest=./.verify/vitest-shim.mjs',
  ],
  { stdio: 'inherit', cwd: projectRoot }
);

const mod = await import(pathToFileURL(outFile).href);

// The shim is inlined into the bundle, so read the shared global rather than
// the runner's own copy of the module.
const shimState = globalThis.__vitestShimState__ || { passed: 0, failed: 0, failures: [] };

// `it` bodies may be async; their assertions settle only once these resolve.
await Promise.all(shimState.pending || []);

console.log(`\n${'─'.repeat(60)}`);
console.log(`assertions passed: ${shimState.passed}`);
console.log(`assertions failed: ${shimState.failed}`);

if (shimState.failed > 0) {
  console.error('\nFAILED');
  process.exit(1);
}

if (shimState.passed === 0) {
  console.error('\nNo assertions ran — the harness is not wired up correctly.');
  process.exit(1);
}

console.log('\nPASSED');
process.exit(0);
