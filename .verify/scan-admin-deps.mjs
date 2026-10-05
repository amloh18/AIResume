#!/usr/bin/env node
/**
 * Report bare (npm) packages the ADMIN app's import closure needs but does not declare.
 *
 * `apps/admin/package.json` is NOT a copy of the app's, and it is not a trimmed guess — it was
 * derived by hand from what the admin closure was believed to need. The first real `next build`
 * disproved that: `lodash/isEqual` is imported by `components/admin/CampaignFilters.tsx` and was
 * not declared, so the build died with "Module not found" after compiling everything else.
 *
 * This script does it mechanically instead. It walks `apps/admin/src`, follows the build's own
 * aliases into the shared tree (`@/`, `@shared/` → apps/airesume_app/src; `@admin/` → apps/admin/src),
 * collects every bare specifier, and diffs the package names against package.json.
 *
 * Read-only. Prints file:line for each missing package so the fix is a lookup, not a hunt.
 *
 * ⚠️ A naive `from "..."` regex also matches the *contents* of string literals — a log line
 * containing `from "was connected, now"` is not an import. Every candidate is therefore filtered
 * against the npm package-name grammar before it is reported.
 */
import fs from 'node:fs';
import path from 'node:path';

const REPO = process.cwd();
const ADMIN = path.join(REPO, 'apps', 'admin');
const ADMIN_SRC = path.join(ADMIN, 'src');
const APP_SRC = path.join(REPO, 'apps', 'airesume_app', 'src');
const EXTS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json'];

/** npm package names: optional scope, then a name with no spaces or glob characters. */
const VALID_PKG_RE = /^(@[a-z0-9-._~]+\/)?[a-z0-9-._~]+$/i;

const NODE_BUILTINS = new Set([
  'assert', 'async_hooks', 'buffer', 'child_process', 'cluster', 'console', 'constants', 'crypto',
  'dgram', 'diagnostics_channel', 'dns', 'domain', 'events', 'fs', 'http', 'http2', 'https',
  'inspector', 'module', 'net', 'os', 'path', 'perf_hooks', 'process', 'punycode', 'querystring',
  'readline', 'repl', 'stream', 'string_decoder', 'timers', 'tls', 'trace_events', 'tty', 'url',
  'util', 'v8', 'vm', 'wasi', 'worker_threads', 'zlib',
]);

function resolveLocal(spec, fromFile) {
  let base = null;
  if (spec.startsWith('@admin/')) base = path.join(ADMIN_SRC, spec.slice('@admin/'.length));
  else if (spec.startsWith('@shared/')) base = path.join(APP_SRC, spec.slice('@shared/'.length));
  else if (spec.startsWith('@/')) base = path.join(APP_SRC, spec.slice(2));
  else if (spec.startsWith('.')) base = path.resolve(path.dirname(fromFile), spec);
  else return null;

  for (const ext of EXTS) {
    const p = base + ext;
    if (fs.existsSync(p) && fs.statSync(p).isFile()) return p;
  }
  for (const ext of EXTS) {
    const p = path.join(base, 'index' + ext);
    if (fs.existsSync(p) && fs.statSync(p).isFile()) return p;
  }
  if (fs.existsSync(base) && fs.statSync(base).isFile()) return base;
  return null;
}

const IMPORT_RE = /(?:from\s*|import\s*\(\s*|require\s*\(\s*)['"]([^'"]+)['"]/g;

function lineOf(src, index) {
  let line = 1;
  for (let i = 0; i < index; i++) if (src.charCodeAt(i) === 10) line++;
  return line;
}

function scan(file) {
  let src;
  try { src = fs.readFileSync(file, 'utf8'); } catch { return { local: [], bare: [] }; }
  const local = [];
  const bare = [];
  let m;
  IMPORT_RE.lastIndex = 0;
  while ((m = IMPORT_RE.exec(src)) !== null) {
    const spec = m[1];
    if (spec.startsWith('.') || spec.startsWith('@/') || spec.startsWith('@admin/') || spec.startsWith('@shared/')) {
      const r = resolveLocal(spec, file);
      if (r) local.push(r);
    } else if (spec.startsWith('node:')) {
      // runtime builtin
    } else {
      bare.push({ spec, line: lineOf(src, m.index) });
    }
  }
  return { local, bare };
}

function walk(dir, out = []) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
      walk(full, out);
    } else if (EXTS.includes(path.extname(e.name))) {
      out.push(full);
    }
  }
  return out;
}

const pkgName = (spec) => {
  const parts = spec.split('/');
  return spec.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
};

// ── transitive closure from apps/admin/src, through the build's aliases ────────
const seen = new Set();
const stack = [...walk(ADMIN_SRC)];
const byPkg = new Map(); // package -> { specs:Set, sites:Set }
let rejected = 0;

while (stack.length) {
  const f = stack.pop();
  if (seen.has(f)) continue;
  seen.add(f);
  const rel = path.relative(REPO, f);
  const { local, bare } = scan(f);
  for (const { spec, line } of bare) {
    const n = pkgName(spec);
    if (!VALID_PKG_RE.test(n)) { rejected += 1; continue; } // string-literal false positive
    if (!byPkg.has(n)) byPkg.set(n, { specs: new Set(), sites: new Set() });
    const rec = byPkg.get(n);
    rec.specs.add(spec);
    if (rec.sites.size < 3) rec.sites.add(`${rel}:${line}`);
  }
  for (const l of local) if (!seen.has(l)) stack.push(l);
}

const pkg = JSON.parse(fs.readFileSync(path.join(ADMIN, 'package.json'), 'utf8'));
const declared = new Set([
  ...Object.keys(pkg.dependencies || {}),
  ...Object.keys(pkg.devDependencies || {}),
  ...Object.keys(pkg.peerDependencies || {}),
]);

const missing = [...byPkg.keys()].filter((n) => !declared.has(n) && !NODE_BUILTINS.has(n)).sort();
const unused = [...declared].filter((n) => !byPkg.has(n)).sort();

console.log('\n=== admin dependency closure ===\n');
console.log(`closure files                ${seen.size}`);
console.log(`bare packages imported       ${byPkg.size}`);
console.log(`declared in package.json     ${declared.size}`);
console.log(`string-literal false +ves    ${rejected}  (filtered out)`);
console.log('');

if (missing.length) {
  console.log(`❌ MISSING — imported but not declared (${missing.length}):`);
  for (const n of missing) {
    const { specs, sites } = byPkg.get(n);
    console.log(`\n   ${n}`);
    console.log(`     specifiers: ${[...specs].slice(0, 4).join(', ')}`);
    for (const s of sites) console.log(`     used at:    ${s}`);
  }
} else {
  console.log('✅ MISSING: none');
}

console.log('');
if (unused.length) {
  console.log(`⚠️  DECLARED BUT NOT IMPORTED (${unused.length}) — do NOT bulk-remove. Several are`);
  console.log('   required for `serverExternalPackages` resolution at RUNTIME (an externalised');
  console.log('   package is not bundled, so Node resolves it from apps/admin/node_modules), and');
  console.log('   the rest are build tooling.');
  for (const n of unused) console.log(`   ${n}`);
} else {
  console.log('✅ UNUSED: none');
}
console.log('');
