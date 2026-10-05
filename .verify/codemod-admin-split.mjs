#!/usr/bin/env node
/**
 * Rewrite import specifiers for the admin split — REVISED design.
 *
 * The shared set does NOT move and is NOT rewritten. It stays in `apps/airesume_app/src`, and the admin app
 * points its own `@/` at that tree — see `apps/admin/next.config.ts` for why the alias is inverted
 * rather than the shared files repointed. A path alias is per-BUILD, so moving the shared code would
 * also have broken the 520 web-only files that reach it.
 *
 * Two things happen, and only one of them rewrites anything:
 *
 *   1. **Every ADMIN-ONLY file moves to `apps/admin/src/`**, preserving its `src`-relative path.
 *   2. Its imports are repointed **only where the move breaks them**:
 *
 *        a reference to ANOTHER ADMIN-ONLY file              ->  `@admin/...`
 *        a RELATIVE reference to SHARED code                 ->  `@/...`   (relative no longer reaches)
 *        a reference to SHARED code already written `@/...`   ->  left alone
 *        a relative reference to another admin-only file      ->  left alone (both move together)
 *
 * **No SHARED file is touched, and no WEB-ONLY file is touched.** That is the whole point of
 * *inverting* the alias rather than rewriting the shared set: `@/` means "the app's `src`" in BOTH
 * builds (see `apps/admin/next.config.ts`), so all ~151 shared files keep resolving exactly as they
 * are written, and the production app gets zero edits.
 *
 * The alternative — repointing every shared file's internal `@/...` at `@shared/...` so that admin's
 * `@/` could stay local — was the original design. It rewrites ~225 specifiers across ~151 files in
 * the PRODUCTION app in order to buy a tidier namespace in the NEW one. Rejected: it puts the blast
 * radius in the wrong repository. `@shared/...` still resolves in admin (it is a synonym for `@/`),
 * so nothing here depends on that decision being final.
 *
 * Refuses to run if any of the four cross-direction invariants is non-zero — a non-zero means the
 * split is unsound and a mechanical rewrite would produce broken imports.
 *
 * Usage:
 *   node .verify/codemod-admin-split.mjs           # dry run, prints a plan
 *   node .verify/codemod-admin-split.mjs --apply   # writes
 */
import fs from 'node:fs';
import path from 'node:path';

const APPLY = process.argv.includes('--apply');

const REPO_ROOT = process.cwd();
const APP = path.join(REPO_ROOT, 'apps', 'airesume_app');
const SRC = path.join(APP, 'src');
const ADMIN_DEST = path.join(REPO_ROOT, 'apps', 'admin', 'src');

const EXTS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json'];
const ADMIN_SEED_DIRS = ['app/admin', 'components/admin', 'app/api/admin'];

/**
 * Files the closure classifies as web-only but that the admin app also needs. Admin reaches them
 * through the web root layout today, so nothing in admin imports them and the closure cannot see
 * them — promoting them is mandatory or admin renders unstyled / throws on useSession.
 *
 * Under the revised design these stay exactly where they are, so promotion only affects
 * classification: it makes admin's references to them resolve through `@/`, which already points at
 * `apps/airesume_app/src` in the admin build. Nothing is rewritten for them either way.
 *
 * `apps/admin/src/app/globals.css` is **not** handled here. Admin has its own stylesheet, generated as
 * a **full verbatim copy** of `apps/airesume_app/src/app/globals.css` by `apps/admin/scripts/sync-styles.mjs`
 * (`npm run sync:styles`, which `predev`/`prebuild` run automatically). It is deliberately neither an
 * `@import` nor a curated subset — see that script's header for why. CSS is not in EXTS, so nothing
 * here would have touched it in any case.
 */
const PROMOTIONS = [
  'lib/fonts.ts',
  'components/providers/SessionProvider.tsx',
];

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
      if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
      walk(full, out);
    } else if (EXTS.includes(path.extname(e.name))) {
      out.push(full);
    }
  }
  return out;
}

function resolveSpec(spec, fromFile) {
  let base;
  if (spec.startsWith('@/')) base = path.join(SRC, spec.slice(2));
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

const IMPORT_RE = /(from\s*|import\s*\(\s*|require\s*\(\s*)['"]([^'"]+)['"]/g;

function depsOf(file) {
  let src;
  try {
    src = fs.readFileSync(file, 'utf8');
  } catch {
    return [];
  }
  const out = [];
  let m;
  IMPORT_RE.lastIndex = 0;
  while ((m = IMPORT_RE.exec(src)) !== null) {
    const spec = m[2];
    if (!spec.startsWith('@/') && !spec.startsWith('.')) continue;
    const r = resolveSpec(spec, file);
    if (r) out.push(r);
  }
  return out;
}

function closure(seeds) {
  const seen = new Set();
  const stack = [...seeds];
  while (stack.length) {
    const f = stack.pop();
    if (seen.has(f)) continue;
    seen.add(f);
    for (const d of depsOf(f)) if (!seen.has(d)) stack.push(d);
  }
  return seen;
}

// ── compute the boundary ───────────────────────────────────────────────────────
const allFiles = walk(SRC);
const isAdminFile = (f) => {
  const rel = path.relative(SRC, f);
  return ADMIN_SEED_DIRS.some((d) => rel === d || rel.startsWith(d + path.sep));
};
const isSeed = (f) => {
  const rel = path.relative(SRC, f);
  return (
    rel === 'app' || rel.startsWith('app' + path.sep) ||
    rel === 'components' || rel.startsWith('components' + path.sep)
  );
};

const A = closure(allFiles.filter(isAdminFile));
const W = closure(allFiles.filter((f) => isSeed(f) && !isAdminFile(f)));
const onlyAdmin = new Set([...A].filter((f) => !W.has(f)));
const shared = new Set([...A].filter((f) => W.has(f)));
const webOnly = new Set(allFiles.filter((f) => !A.has(f) && !W.has(f)));

// Force the promotions into the shared set (see PROMOTIONS above).
for (const rel of PROMOTIONS) {
  const abs = path.join(SRC, rel);
  if (!fs.existsSync(abs)) {
    console.error(`ABORT: promotion not found: ${rel}`);
    process.exit(1);
  }
  shared.add(abs);
  webOnly.delete(abs);
}

// ── refuse to run if the split is unsound ──────────────────────────────────────
const violations = { 'shared -> non-shared': [], 'shared -> admin-only': [], 'admin-only -> web-only': [] };
for (const f of shared) {
  for (const d of depsOf(f)) {
    if (!shared.has(d)) {
      violations['shared -> non-shared'].push(`${path.relative(SRC, f)} -> ${path.relative(SRC, d)}`);
      if (onlyAdmin.has(d)) {
        violations['shared -> admin-only'].push(`${path.relative(SRC, f)} -> ${path.relative(SRC, d)}`);
      }
    }
  }
}
for (const f of onlyAdmin) {
  for (const d of depsOf(f)) {
    if (webOnly.has(d)) {
      violations['admin-only -> web-only'].push(`${path.relative(SRC, f)} -> ${path.relative(SRC, d)}`);
    }
  }
}
let unsound = false;
for (const [name, list] of Object.entries(violations)) {
  if (list.length) {
    unsound = true;
    console.error(`\nABORT: ${name} is not closed (${list.length}):`);
    for (const l of list.slice(0, 20)) console.error(`  ${l}`);
  }
}
if (unsound) process.exit(1);

// ── the new specifier for a target ─────────────────────────────────────────────
// `@admin/...` for admin's own files; `@/...` for the shared codebase. Both strip the extension and
// collapse a trailing `/index`, matching how the source files are actually imported.
function specifierFor(prefix, resolved) {
  let rel = path.relative(SRC, resolved);
  if (rel.endsWith('.json')) return prefix + rel.split(path.sep).join('/');
  rel = rel.replace(/\.d\.ts$/, '').replace(/\.[cm]?[jt]sx?$/, '');
  if (path.basename(rel) === 'index') rel = path.dirname(rel);
  return prefix + rel.split(path.sep).join('/');
}

// ── build the plan: ONLY admin-only files are rewritten ────────────────────────
const rewrites = new Map(); // file -> [{ spec, next }]
let totalRewrites = 0;

for (const file of onlyAdmin) {
  let src;
  try {
    src = fs.readFileSync(file, 'utf8');
  } catch {
    continue;
  }
  const edits = [];
  let m;
  IMPORT_RE.lastIndex = 0;
  while ((m = IMPORT_RE.exec(src)) !== null) {
    const spec = m[2];
    if (!spec.startsWith('@/') && !spec.startsWith('.')) continue;
    const resolved = resolveSpec(spec, file);
    if (!resolved) continue;

    const targetIsAdmin = onlyAdmin.has(resolved);
    const relative = spec.startsWith('.');

    // A relative reference to another admin-only file stays correct — both files move together and
    // the `src`-relative layout is preserved.
    if (relative && targetIsAdmin) continue;

    // A reference to shared code already written as `@/...` needs no change: in the admin build `@/`
    // means the app's `src`, which is exactly where that file still lives.
    if (!relative && !targetIsAdmin) continue;

    const next = targetIsAdmin ? specifierFor('@admin/', resolved) : specifierFor('@/', resolved);
    if (next === spec) continue;

    // ── pre-flight: prove the offset arithmetic actually finds this specifier ─────────────────
    // This runs in the PLANNING pass, before anything is moved or written, so a mismatch aborts
    // with the tree untouched.
    //
    // It exists because the offset maths is the one way this script can silently destroy every file
    // it rewrites. `m.index` is the start of the whole match, and `m[1]` is the matched prefix —
    // `from `, `import(`, `require(` — which INCLUDES the whitespace before the quote. So the
    // opening quote is at `m.index + m[1].length`, and the specifier one character after it. An
    // off-by-one here consumes the specifier's first character AND the closing quote, turning
    // `from '@/lib/cache'` into `from '@@lib/cache` — valid-looking text, invalid syntax, and
    // invisible to a dry run.
    const quoteAt = m.index + m[1].length;
    const quote = src[quoteAt];
    if (
      (quote !== "'" && quote !== '"') ||
      src.slice(quoteAt + 1, quoteAt + 1 + spec.length) !== spec
    ) {
      console.error(
        `\nABORT: offset check failed while planning a rewrite in\n` +
          `  ${path.relative(REPO_ROOT, file)}\n` +
          `  specifier "${spec}" -> "${next}"\n` +
          `  expected a quoted specifier at offset ${quoteAt}, found ` +
          `${JSON.stringify(src.slice(quoteAt, quoteAt + spec.length + 2))}\n` +
          `\n  Nothing has been moved or written. The import regex and the slicing disagree,\n` +
          `  which means a rewrite would corrupt the file. Fix the arithmetic, not the data.`
      );
      process.exit(1);
    }

    edits.push({ spec, next });
  }
  if (edits.length) {
    rewrites.set(file, edits);
    totalRewrites += edits.length;
  }
}

const webOnlyFiles = allFiles.filter((f) => !shared.has(f) && !onlyAdmin.has(f));

console.log('\n=== admin-split codemod (revised: shared code does NOT move) ===\n');
console.log(`shared set (stays in apps/airesume_app/src, UNTOUCHED)  ${shared.size}`);
console.log(`admin-only set (moves)                         ${onlyAdmin.size}`);
console.log(`web-only set (NOT touched)                     ${webOnlyFiles.length}`);
console.log('');
console.log(`admin-only files needing a rewrite             ${rewrites.size}`);
console.log(`specifier rewrites                             ${totalRewrites}`);

console.log('\n--- move plan (admin-only set, by top dir) ---');
const moveMap = new Map();
for (const f of onlyAdmin) {
  const parts = path.relative(SRC, f).split(path.sep);
  const key = parts.length > 1 ? parts[0] : '(root)';
  moveMap.set(key, (moveMap.get(key) || 0) + 1);
}
for (const [k, v] of [...moveMap.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(k).padEnd(24)} ${v}`);
}

console.log('\n--- sample rewrites (all in admin-only files) ---');
let shown = 0;
for (const [file, edits] of rewrites) {
  if (shown++ >= 12) break;
  console.log(`  [admin] ${path.relative(REPO_ROOT, file)}`);
  for (const e of edits.slice(0, 3)) console.log(`      ${e.spec}  ->  ${e.next}`);
}

console.log('\n--- required config changes ---');
console.log('  apps/airesume_app/next.config.ts   NOTHING TO DO — this design never edits the web app');
console.log('  apps/airesume_app/tsconfig.json    NOTHING TO DO');
console.log('  apps/admin/next.config.ts DONE — turbopack.root = <repo>/apps');
console.log('                            resolveAlias  "@" / "@shared" -> <repo>/apps/airesume_app/src');
console.log('                                          "@admin"         -> <repo>/apps/admin/src');
console.log('  apps/admin/tsconfig.json  DONE — "@/*"       -> ../airesume_app/src/*');
console.log('                                   "@shared/*" -> ../airesume_app/src/*');
console.log('                                   "@admin/*"  -> ./src/*');
console.log('');
console.log('  NOTE: in the ADMIN build `@/` means the APP\'s src, not admin\'s own. That inversion is what');
console.log('  lets the ~151 shared files keep resolving unedited; `@admin/` is admin\'s own. `root` is');
console.log('  apps/, NOT the repo root — a repo-root `root` makes Turbopack watch the whole monorepo.');

if (!APPLY) {
  console.log('\n(dry run — pass --apply to write)\n');
  process.exit(0);
}

// ── apply ──────────────────────────────────────────────────────────────────────
console.log('\n--- applying ---');
const { execFileSync } = await import('node:child_process');

// 1. Move the admin-only files first, preserving each file's `src`-relative path.
let moved = 0;
const kept = []; // destinations that already existed and were deliberately NOT overwritten
const movedTo = new Map(); // original abs path -> new abs path
for (const f of onlyAdmin) {
  const rel = path.relative(SRC, f);
  const dest = path.join(ADMIN_DEST, rel);

  // A destination that already exists is NOT overwritten.
  //
  // `apps/admin` is a hand-written scaffold, not an empty directory: it deliberately carries its own
  // version of some files, and `app/admin/login/page.tsx` arrived by hand first (see the README).
  // `fs.renameSync` would silently replace those with the app's copy, reverting hand-written work with
  // no error — the exact failure mode this whole split keeps producing. So the SOURCE is deleted
  // instead: the file has still moved out of the web app, it simply got there by hand.
  if (fs.existsSync(dest)) {
    fs.rmSync(f);
    kept.push(rel);
    movedTo.set(f, dest);
    continue;
  }

  fs.mkdirSync(path.dirname(dest), { recursive: true });
  try {
    execFileSync('git', ['mv', path.relative(REPO_ROOT, f), path.relative(REPO_ROOT, dest)], {
      cwd: REPO_ROOT,
      stdio: 'pipe',
    });
  } catch {
    // Not tracked (or already moved) — fall back to a plain move so the run is idempotent.
    fs.renameSync(f, dest);
  }
  movedTo.set(f, dest);
  moved += 1;
}
console.log(`  moved ${moved} admin-only files into apps/admin/src`);
if (kept.length) {
  console.log(`  KEPT ${kept.length} pre-existing admin file(s); deleted the app-side source instead:`);
  for (const k of kept) console.log(`    apps/admin/src/${k.split(path.sep).join('/')}`);
}

// 2. Rewrite specifiers — ONLY in the moved admin-only files. No shared file is touched.
let written = 0;
for (const [file, edits] of rewrites) {
  const current = movedTo.get(file) ?? file;
  if (!fs.existsSync(current)) {
    console.error(`  SKIP (missing): ${path.relative(REPO_ROOT, current)}`);
    continue;
  }
  let src = fs.readFileSync(current, 'utf8');

  // Replace from the end so earlier indices stay valid.
  const positions = [];
  let m;
  IMPORT_RE.lastIndex = 0;
  while ((m = IMPORT_RE.exec(src)) !== null) {
    const spec = m[2];
    const edit = edits.find((e) => e.spec === spec);
    if (!edit) continue;
    // `m.index` is the start of the whole match and `m[1]` is the prefix (`from `, `require(`), which
    // INCLUDES the whitespace before the quote — so the opening quote is at `m.index + m[1].length`
    // and the specifier starts one character later. Do NOT add a further `+ 1` here: that off-by-one
    // eats the specifier's first character and the closing quote. The planning pass above asserts
    // this exact arithmetic against the source, so the two cannot drift apart silently.
    const quoteAt = m.index + m[1].length;
    positions.push({ start: quoteAt + 1, end: quoteAt + 1 + spec.length, next: edit.next });
  }
  for (const p of positions.sort((a, b) => b.start - a.start)) {
    src = src.slice(0, p.start) + p.next + src.slice(p.end);
  }

  fs.writeFileSync(current, src);
  written += 1;
}
console.log(`  rewrote ${written} files`);
console.log('\nDone. The admin-only files now live under apps/admin/src, paths preserved.');
console.log('No alias work is required — see "required config changes" above.');
console.log('\nNext:   cd apps/admin && npm install && npm run dev     (predev re-syncs the stylesheet)');
console.log('Gates:  next build in BOTH apps');
console.log('        npx tsc -p apps/admin/tsconfig.json --noEmit');
console.log('        npx vitest run   (baseline: 5 failures / 3 files, 677 passing)\n');
