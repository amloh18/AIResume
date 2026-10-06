/**
 * Bundle the standalone background worker (`src/workers/entry.ts`) into `dist/worker.mjs`.
 *
 * Why a bundle instead of running TypeScript directly:
 *   - the worker is a plain Node process, so it cannot use Next's compiler for the `@/...` path
 *     aliases or for TypeScript syntax;
 *   - `tsx`/`ts-node` would have to be installed and started in the image, re-transpiling on boot;
 *   - bundling keeps the shipped artifact small and makes `dist/worker.mjs` the exact code under test.
 *
 * `packages: external` is deliberate: `node_modules` is already in the image for the web tier, so the
 * worker only needs the project's own modules inlined. That keeps the bundle small and avoids
 * duplicating mongoose/Gemini clients.
 *
 * The build ends by verifying that every external specifier in the output can actually be resolved by
 * Node. That check exists because of a real failure: `next/headers` (reached via a *lazy* import that
 * esbuild inlines) resolved fine for the bundler and crashed the worker at boot with
 * ERR_MODULE_NOT_FOUND. A broken bundle should fail the image build, not the deploy.
 *
 * Run: `npm run build:worker` (called by the Dockerfile's `worker` stage).
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync, statSync } from 'node:fs';

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = 'src/workers/entry.ts';
const OUTFILE = path.join(PROJECT_ROOT, 'dist', 'worker.mjs');

/**
 * Specifiers that resolve for the bundler but not for plain Node, mapped to shims.
 *
 * `server-only` throws unless React's `react-server` condition is set, which never happens in a plain
 * Node process. `next/headers` has no resolvable entry point outside Next's compiler.
 */
const SHIMS = {
  'server-only': path.join(PROJECT_ROOT, 'scripts', 'server-only-shim.js'),
  'next/headers': path.join(PROJECT_ROOT, 'scripts', 'next-headers-shim.mjs'),
};

let esbuild;
try {
  esbuild = await import('esbuild');
} catch {
  console.error(
    '[build:worker] esbuild is not installed. It is declared in devDependencies — run `npm ci` ' +
      '(with dev dependencies) before building the worker.'
  );
  process.exit(1);
}

const result = await esbuild.build({
  absWorkingDir: PROJECT_ROOT,
  entryPoints: [ENTRY],
  outfile: OUTFILE,
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'node22',
  packages: 'external',
  tsconfig: path.join(PROJECT_ROOT, 'tsconfig.json'),
  alias: SHIMS,
  // Some transitively imported modules call `require()`; under ESM output esbuild rewrites that to a
  // `__require` that throws. Give the bundle a real `require`.
  banner: { js: 'import{createRequire}from"module";const require=createRequire(import.meta.url);' },
  sourcemap: 'linked',
  metafile: true,
  logLevel: 'warning',
});

const relativeOut = path.relative(PROJECT_ROOT, OUTFILE);

/** Verify the externals the bundle will `import` at runtime are resolvable by this Node. */
function findUnresolvableExternals() {
  const output = result.metafile.outputs[relativeOut];
  const specifiers = new Set(
    [...(output?.imports ?? []), ...(output?.dynamicImports ?? [])]
      .filter((imp) => imp.external)
      .map((imp) => imp.path)
  );

  const shimmed = new Set(Object.keys(SHIMS));
  const unresolvable = [];

  for (const specifier of specifiers) {
    if (shimmed.has(specifier) || specifier.startsWith('node:')) continue;
    try {
      import.meta.resolve(specifier);
    } catch {
      unresolvable.push(specifier);
    }
  }

  return [...specifiers].length === 0 ? null : unresolvable;
}

const unresolvable = findUnresolvableExternals();
if (unresolvable && unresolvable.length > 0) {
  console.error(
    `[build:worker] ${relativeOut} imports specifiers Node cannot resolve:\n` +
      unresolvable.map((s) => `  - ${s}`).join('\n') +
      '\nAdd a shim to SHIMS in scripts/build-worker.mjs (or remove the dependency from the worker graph) ' +
      'and rebuild; otherwise the worker crashes at startup.'
  );
  process.exit(1);
}

// The bundle must not depend on the Next.js runtime; catching it here keeps the worker honest.
const bundled = readFileSync(OUTFILE, 'utf8');
if (/["']next\/(?!(headers)["'])/.test(bundled)) {
  const match = bundled.match(/["']next\/[a-z/-]+["']/g) || [];
  console.warn(`[build:worker] bundle references Next.js runtime modules: ${[...new Set(match)].join(', ')}`);
}

const size = statSync(OUTFILE).size;
console.log(
  `[build:worker] wrote ${relativeOut} (${(size / 1024).toFixed(0)} KB, ` +
    `${result.warnings.length} warnings, externals verified)`
);
