#!/usr/bin/env node
/**
 * Find references to documentation paths that no longer exist.
 *
 * After internal docs move to the private tree, source comments that pointed at them become dead
 * breadcrumbs. They break nothing — which is exactly why they go unnoticed. Measured before the
 * move: ~100 source files carried `docs/application-automation/fix-tasks.md` in a `@ts-nocheck`
 * marker, plus a handful of prose references.
 *
 * Reports each stale reference with its file:line, grouped by the path it points at, so the fix can
 * be a single scripted rewrite per group rather than 100 hand edits.
 *
 * Usage:
 *   node .verify/scan-doc-references.mjs            # scan apps/ and scripts/
 *   node .verify/scan-doc-references.mjs --roots src # scan a specific subdirectory
 */
import fs from 'node:fs';
import path from 'node:path';

const REPO_ROOT = process.cwd();

const EXTS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json', '.yml', '.yaml', '.sh', '.py']);
const SKIP_DIRS = new Set(['node_modules', '.git', '.next', 'dist', 'build', 'coverage', '.turbo', 'brag-output', '.verify']);

/** `docs/foo/bar.md`, `./docs/x.md`, `../docs/x.md` — with or without a leading ./ or ../. */
const DOC_REF_RE = /(?:\.{0,2}\/)*docs\/[A-Za-z0-9._@/-]+\.(?:md|mdx|txt)/g;

function walk(dir, out = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name) || e.name.startsWith('.')) continue;
      walk(full, out);
    } else if (EXTS.has(path.extname(e.name))) {
      out.push(full);
    }
  }
  return out;
}

const roots = process.argv.includes('--roots')
  ? [path.join(REPO_ROOT, process.argv[process.argv.indexOf('--roots') + 1])]
  : [path.join(REPO_ROOT, 'apps'), path.join(REPO_ROOT, 'scripts'), path.join(REPO_ROOT, 'deploy')];

const files = roots.flatMap((r) => walk(r));

/** path as written -> [{ file, line }] */
const refs = new Map();

for (const file of files) {
  let text;
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch {
    continue;
  }
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i += 1) {
    DOC_REF_RE.lastIndex = 0;
    let m;
    while ((m = DOC_REF_RE.exec(lines[i])) !== null) {
      const ref = m[0];
      // A reference is stale when the file it names is not present relative to the repo root,
      // nor relative to the referencing file (both conventions are in use here).
      const fromRoot = path.join(REPO_ROOT, ref);
      const fromFile = path.resolve(path.dirname(file), ref);
      if (fs.existsSync(fromRoot) || fs.existsSync(fromFile)) continue;
      if (!refs.has(ref)) refs.set(ref, []);
      refs.get(ref).push({ file: path.relative(REPO_ROOT, file), line: i + 1 });
    }
  }
}

console.log('\n=== stale documentation references ===\n');
console.log(`scanned ${files.length} file(s) under: ${roots.map((r) => path.relative(REPO_ROOT, r)).join(', ')}`);

if (!refs.size) {
  console.log('\nno stale references\n');
  process.exit(0);
}

const total = [...refs.values()].reduce((n, v) => n + v.length, 0);
console.log(`\n${refs.size} missing path(s), ${total} reference(s):\n`);

for (const [ref, hits] of [...refs.entries()].sort((a, b) => b[1].length - a[1].length)) {
  console.log(`  ${ref}  (${hits.length})`);
  for (const h of hits.slice(0, 3)) console.log(`      ${h.file}:${h.line}`);
  if (hits.length > 3) console.log(`      ... and ${hits.length - 3} more`);
}

console.log('\nFix by rewriting the breadcrumb, not by restoring the file. These are comments —');
console.log('point them at the register by name (e.g. "tracked as R14") or at the private tree.\n');
