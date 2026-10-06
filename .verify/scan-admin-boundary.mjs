#!/usr/bin/env node
/**
 * Measure the real extraction boundary for splitting the admin panel out of the
 * single Next.js app.
 *
 * It computes the transitive import closure of two seed sets:
 *
 *   A (admin) = src/app/admin/**  +  src/components/admin/**  +  src/app/api/admin/**
 *   W (web)   = src/app/**  (minus admin)  +  src/components/**  (minus admin)
 *
 * and reports:
 *   A \ W  → files only the admin side reaches  (safe to MOVE into apps/admin)
 *   A ∩ W  → files both sides reach             (MUST become a shared package)
 *   W \ A  → web-only                           (stays in apps/web)
 *
 * Read-only. Prints a report; writes nothing.
 */
import fs from 'node:fs';
import path from 'node:path';

// The app's source lives at `apps/airesume_app/src` in the monorepo. Resolve it from the repository root so
// this stays runnable as `node .verify/scan-admin-boundary.mjs` without a `cd`.
const REPO_ROOT = process.cwd();
const ROOT = fs.existsSync(path.join(REPO_ROOT, 'apps', 'airesume_app', 'src'))
  ? path.join(REPO_ROOT, 'apps', 'airesume_app')
  : REPO_ROOT;
const SRC = path.join(ROOT, 'src');
const EXTS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json'];

const ADMIN_SEED_DIRS = [
  'app/admin',
  'components/admin',
  'app/api/admin',
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
  if (spec.startsWith('@/')) {
    base = path.join(SRC, spec.slice(2));
  } else if (spec.startsWith('.')) {
    base = path.resolve(path.dirname(fromFile), spec);
  } else {
    return null; // external package
  }
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

const IMPORT_RE =
  /(?:from\s*|import\s*\(|require\s*\(\s*)['"]([^'"]+)['"]/g;

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
    const spec = m[1];
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

const allFiles = walk(SRC);

const isAdminFile = (f) => {
  const rel = path.relative(SRC, f);
  return ADMIN_SEED_DIRS.some((d) => rel === d || rel.startsWith(d + path.sep));
};

const isSeed = (f) => {
  const rel = path.relative(SRC, f);
  return rel === 'app' || rel.startsWith('app' + path.sep) ||
         rel === 'components' || rel.startsWith('components' + path.sep);
};

const adminSeeds = allFiles.filter(isAdminFile);
const webSeeds = allFiles.filter((f) => isSeed(f) && !isAdminFile(f));

const A = closure(adminSeeds);
const W = closure(webSeeds);

const onlyAdmin = [...A].filter((f) => !W.has(f));
const shared = [...A].filter((f) => W.has(f));
const onlyWeb = [...W].filter((f) => !A.has(f));

function byTopDir(files) {
  const m = new Map();
  for (const f of files) {
    const rel = path.relative(SRC, f);
    const parts = rel.split(path.sep);
    const key = parts.length > 1 ? parts[0] : '(root)';
    m.set(key, (m.get(key) || 0) + 1);
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

function rel(f) {
  return path.relative(ROOT, f);
}

const pad = (s, n) => String(s).padEnd(n);

console.log('\n=== admin boundary scan ===\n');
console.log(`total files under src/            ${allFiles.length}`);
console.log(`admin seed files                  ${adminSeeds.length}`);
console.log(`web seed files                    ${webSeeds.length}`);
console.log('');
console.log(`A  admin closure                  ${A.size}`);
console.log(`W  web closure                    ${W.size}`);
console.log(`A \\ W  admin-only (can MOVE)      ${onlyAdmin.length}`);
console.log(`A ∩ W  shared (must EXTRACT)      ${shared.length}`);
console.log(`W \\ A  web-only (stays in web)    ${onlyWeb.length}`);

console.log('\n--- A \\ W  admin-only, by top dir (these move into apps/admin) ---');
for (const [k, v] of byTopDir(onlyAdmin)) console.log(`  ${pad(k, 24)} ${v}`);

console.log('\n--- A ∩ W  shared, by top dir (these become packages) ---');
for (const [k, v] of byTopDir(shared)) console.log(`  ${pad(k, 24)} ${v}`);

console.log('\n--- shared: the src/lib subtree, by second level ---');
const libShared = shared.filter((f) => path.relative(SRC, f).startsWith('lib' + path.sep));
const libMap = new Map();
for (const f of libShared) {
  const parts = path.relative(SRC, f).split(path.sep);
  const key = parts.length > 2 ? `${parts[0]}/${parts[1]}` : parts.join('/');
  libMap.set(key, (libMap.get(key) || 0) + 1);
}
for (const [k, v] of [...libMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 40)) {
  console.log(`  ${pad(k, 40)} ${v}`);
}

console.log('\n--- admin-only files (full list, first 120) ---');
for (const f of onlyAdmin.sort().slice(0, 120)) console.log(`  ${rel(f)}`);
if (onlyAdmin.length > 120) console.log(`  … and ${onlyAdmin.length - 120} more`);

console.log('\n--- shared files pulled in ONLY by admin api routes, sample ---');
const sharedNonUi = shared
  .filter((f) => {
    const r = path.relative(SRC, f);
    return r.startsWith('lib' + path.sep) || r.startsWith('models' + path.sep) ||
           r.startsWith('services' + path.sep) || r.startsWith('platforms' + path.sep);
  })
  .sort();
for (const f of sharedNonUi.slice(0, 80)) console.log(`  ${rel(f)}`);
if (sharedNonUi.length > 80) console.log(`  … and ${sharedNonUi.length - 80} more`);

console.log('\n=== end ===\n');
