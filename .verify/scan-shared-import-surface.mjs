#!/usr/bin/env node
/**
 * Size the import-rewrite surface for the admin split.
 *
 * The boundary scanner (scan-admin-boundary.mjs) says WHICH files move. This says HOW MANY import
 * specifiers have to be rewritten to make the move compile — which is the real cost driver, and the
 * number that decides whether the split is one change or several.
 *
 * Sets, using the same seeds and resolution as scan-admin-boundary.mjs:
 *   A  = admin closure        A\W = admin-only  (moves to apps/admin)
 *   W  = web closure          A∩W = shared      (becomes packages/shared)
 *                             W\A = web-only    (stays in apps/airesume_app)
 *
 * Reports, for each side, how many files import into the SHARED set (those need `@shared/*`) and how
 * many import into their own set (those keep `@/`). Also checks the two directions that must be zero.
 *
 * Read-only. Prints a report; writes nothing.
 */
import fs from 'node:fs';
import path from 'node:path';

const REPO_ROOT = process.cwd();
const ROOT = fs.existsSync(path.join(REPO_ROOT, 'apps', 'airesume_app', 'src'))
  ? path.join(REPO_ROOT, 'apps', 'airesume_app')
  : REPO_ROOT;
const SRC = path.join(ROOT, 'src');
const EXTS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json'];
const ADMIN_SEED_DIRS = ['app/admin', 'components/admin', 'app/api/admin'];

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

const IMPORT_RE = /(?:from\s*|import\s*\(|require\s*\(\s*)['"]([^'"]+)['"]/g;

/** Returns [{ spec, resolved }] for every project-relative import in the file. */
function importsOf(file) {
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
    out.push({ spec, resolved: resolveSpec(spec, file) });
  }
  return out;
}

function depsOf(file) {
  return importsOf(file).map((i) => i.resolved).filter(Boolean);
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
  return (
    rel === 'app' || rel.startsWith('app' + path.sep) ||
    rel === 'components' || rel.startsWith('components' + path.sep)
  );
};

const adminSeeds = allFiles.filter(isAdminFile);
const webSeeds = allFiles.filter((f) => isSeed(f) && !isAdminFile(f));

const A = closure(adminSeeds);
const W = closure(webSeeds);

const onlyAdmin = new Set([...A].filter((f) => !W.has(f)));
const shared = new Set([...A].filter((f) => W.has(f)));
const onlyWeb = new Set([...W].filter((f) => !A.has(f)));

const rel = (f) => path.relative(ROOT, f);

/** For a group of files, split their project imports into "lands in shared" vs "lands locally". */
function surface(files, label) {
  let filesWithSharedImports = 0;
  let sharedSpecifiers = 0;
  let localSpecifiers = 0;
  const perDir = new Map();

  for (const f of files) {
    const imports = importsOf(f);
    let hit = 0;
    for (const { resolved } of imports) {
      if (!resolved) continue;
      if (shared.has(resolved)) {
        hit += 1;
        sharedSpecifiers += 1;
      } else {
        localSpecifiers += 1;
      }
    }
    if (hit > 0) {
      filesWithSharedImports += 1;
      const top = rel(f).split(path.sep).slice(0, 3).join('/');
      perDir.set(top, (perDir.get(top) || 0) + hit);
    }
  }

  console.log(`\n--- ${label} ---`);
  console.log(`  files                            ${files.length}`);
  console.log(`  files importing SHARED           ${filesWithSharedImports}`);
  console.log(`  specifiers -> shared             ${sharedSpecifiers}`);
  console.log(`  specifiers -> local              ${localSpecifiers}`);
  console.log(`  total project specifiers         ${sharedSpecifiers + localSpecifiers}`);
  return { filesWithSharedImports, sharedSpecifiers, perDir };
}

console.log('\n=== shared-import surface (the codemod cost) ===\n');
console.log(`total files under src/             ${allFiles.length}`);
console.log(`A \\ W  admin-only                  ${onlyAdmin.size}`);
console.log(`A ∩ W  shared                      ${shared.size}`);
console.log(`W \\ A  web-only                    ${onlyWeb.size}`);

const web = surface([...onlyWeb], 'web-only files (stay in apps/airesume_app)');
const shr = surface([...shared], 'shared files (become packages/shared)');
const adm = surface([...onlyAdmin], 'admin-only files (move to apps/admin)');

// The two directions that must be zero for the split to be sound.
console.log('\n--- integrity checks (must all be 0) ---');
let sharedToWeb = 0;
for (const f of shared) {
  for (const d of depsOf(f)) if (onlyWeb.has(d)) sharedToWeb += 1;
}
let sharedToAdmin = 0;
for (const f of shared) {
  for (const d of depsOf(f)) if (onlyAdmin.has(d)) sharedToAdmin += 1;
}
let webToAdmin = 0;
for (const f of onlyWeb) {
  for (const d of depsOf(f)) if (onlyAdmin.has(d)) webToAdmin += 1;
}
let adminToWeb = 0;
for (const f of onlyAdmin) {
  for (const d of depsOf(f)) if (onlyWeb.has(d)) adminToWeb += 1;
}

console.log(`  shared  -> web-only   (must be 0)  ${sharedToWeb}`);
console.log(`  shared  -> admin-only (must be 0)  ${sharedToAdmin}`);
console.log(`  web     -> admin-only (must be 0)  ${webToAdmin}`);
console.log(`  admin   -> web-only   (must be 0)  ${adminToWeb}`);

console.log('\n--- codemod totals ---');
const filesToTouch = web.filesWithSharedImports + shr.filesWithSharedImports + adm.filesWithSharedImports;
console.log(`  files needing at least one rewrite ${filesToTouch}`);
console.log(`  specifier rewrites                 ${web.sharedSpecifiers + shr.sharedSpecifiers + adm.sharedSpecifiers}`);
console.log('\n=== end ===\n');
