/**
 * postbuild-turbopack-patch.mjs
 *
 * Fixes a Next.js 16 (v16.3.3) Turbopack monorepo bug where external modules in
 * server chunks carry a 16-character hex hash appended to the package name:
 * e.g. require("redis-2f68610f2a7abfdd") -> require("redis")
 *      require("mongoose-8e05a5c0a9bf4f3d") -> require("mongoose")
 *
 * Turbopack emits that hashed name as the *module specifier itself*, in three
 * different syntactic shapes (see `EXTERNAL_FORMS` below). The runtime's
 * `externalImport(id)` is literally `await import(id)`, so the hashed name is
 * handed straight to Node's resolver and fails with
 *
 *   Failed to load external module playwright-486435c03838073d:
 *   Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'playwright-486435c03838073d'
 *
 * This is not a cosmetic error. It is why Playwright cannot load in production,
 * and therefore why no application could ever be submitted automatically: the
 * worker detects the ATS, then dies on the import, and the job is parked for
 * manual submission. It affects every `serverExternalPackages` entry, not just
 * Playwright.
 *
 * The rewrite is a single, form-agnostic rule: any quoted string literal of the
 * shape `<package>-<16 hex chars>` whose `<package>` is a real installed package
 * loses its hash. That covers all three shapes at once because in every one of
 * them the hashed literal is the specifier the runtime ultimately resolves.
 *
 * The installed-package allowlist is what makes this safe. Without it we would
 * be pattern-matching arbitrary strings that merely look like
 * `something-0123456789abcdef`, which could corrupt real data in a chunk.
 *
 * Exported as pure functions so `tests/verify-turbopack-patch.ts` can exercise
 * them without a build. The CLI only runs when this file is executed directly.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SERVER_DIR = path.join(PROJECT_ROOT, '.next', 'server');

/**
 * Matches `<package>-<16 hex>` occupying an entire quoted string. The base-name
 * group is greedy, so a package whose real name ends in hex-like characters
 * still resolves to its longest valid split; the installed-package check then
 * decides the outcome.
 *
 * Handles scoped names via the optional `@scope/` prefix, because `/` is not in
 * the base-name character class.
 *
 * Deliberately anchored to the whole literal: a chunk contains plenty of quoted
 * strings, and a looser pattern would start rewriting things that are not module
 * specifiers.
 */
const HASHED_SPECIFIER_REGEX = /(["'])((?:@[a-zA-Z0-9._-]+\/)?[a-zA-Z0-9._-]+)-[0-9a-f]{16}\1/g;

/**
 * Matches a hashed package directory inside a build-trace path, e.g.
 * `../../../../../node_modules/playwright-486435c03838073d`.
 *
 * Traces are JSON path lists rather than quoted specifiers, so the hash sits
 * mid-string and needs its own rule. Kept narrow by anchoring on `node_modules/`
 * — the only place a trace names a package.
 */
const HASHED_TRACE_PATH_REGEX = /node_modules\/((?:@[a-zA-Z0-9._-]+\/)?[a-zA-Z0-9._-]+)-[0-9a-f]{16}/g;

/** The three syntactic shapes Turbopack emits. Documented here for the tests. */
export const EXTERNAL_FORMS = {
  /** Async external loader: `a.y("pkg-<hex>")` — no factory, specifier is used verbatim. */
  asyncLoader: (specifier) => `a.y(${JSON.stringify(specifier)})`,
  /** Factory form: `e.x("pkg-<hex>", () => require("pkg"))` — works today, normalised anyway. */
  factory: (specifier, real) => `e.x(${JSON.stringify(specifier)},()=>require(${JSON.stringify(real)}))`,
  /** Plain CJS require: `require("pkg-<hex>")` — the only shape the old script handled. */
  require: (specifier) => `require(${JSON.stringify(specifier)})`,
};

/**
 * Collect the names of every package actually installed under `nodeModulesDir`.
 * Scoped packages are recorded with their scope, matching the literal Turbopack
 * writes (`@sentry/nextjs`).
 */
export function readInstalledPackageNames(nodeModulesDir) {
  const names = new Set();
  if (!fs.existsSync(nodeModulesDir)) return names;

  for (const entry of fs.readdirSync(nodeModulesDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith('.')) continue;

    if (entry.name.startsWith('@')) {
      const scopeDir = path.join(nodeModulesDir, entry.name);
      let scoped = [];
      try {
        scoped = fs.readdirSync(scopeDir, { withFileTypes: true });
      } catch {
        continue;
      }
      for (const sub of scoped) {
        if (sub.isDirectory()) names.add(`${entry.name}/${sub.name}`);
      }
      continue;
    }

    names.add(entry.name);
  }

  return names;
}

/**
 * Walk up from `startDir` collecting installed package names, so a hoisted
 * monorepo root is covered as well as the app-local `node_modules`.
 */
export function collectInstalledPackageNames(startDir) {
  const names = new Set();
  let dir = path.resolve(startDir);

  for (;;) {
    for (const name of readInstalledPackageNames(path.join(dir, 'node_modules'))) {
      names.add(name);
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  return names;
}

/**
 * Rewrite every hashed external specifier in `content` whose package is in
 * `packageNames`. Returns the new source plus what was changed, so callers (and
 * tests) can assert on the specific specifiers rather than a byte count.
 */
export function patchSource(content, packageNames) {
  const rewrites = [];
  const unknown = [];

  const patched = content.replace(HASHED_SPECIFIER_REGEX, (match, quote, base) => {
    const replacement = `${quote}${base}${quote}`;

    if (packageNames.has(base)) {
      rewrites.push({ from: `${base}-hash`, to: base, matched: match });
      return replacement;
    }

    // Looks hashed but is not a package we ship. Leave it alone — it may be real
    // data — but report it so a genuinely broken specifier is not silently kept.
    unknown.push(base);
    return match;
  });

  return {
    content: patched,
    changed: rewrites.length > 0,
    rewrites,
    unknown: [...new Set(unknown)],
  };
}

/**
 * Rewrite hashed package directories inside a `.nft.json` build trace.
 *
 * Traces are inert while `output: 'standalone'` is off, but a trace pointing at
 * a directory that does not exist is a landmine: the day someone enables
 * standalone output, the copy step silently misses the package and we are back
 * to ERR_MODULE_NOT_FOUND. Same allowlist, narrower pattern.
 */
export function patchTraceSource(content, packageNames) {
  const rewrites = [];
  const unknown = [];

  const patched = content.replace(HASHED_TRACE_PATH_REGEX, (match, base) => {
    if (packageNames.has(base)) {
      rewrites.push({ from: `${base}-hash`, to: base, matched: match });
      return `node_modules/${base}`;
    }
    unknown.push(base);
    return match;
  });

  return {
    content: patched,
    changed: rewrites.length > 0,
    rewrites,
    unknown: [...new Set(unknown)],
  };
}

/**
 * Any `<pkg>-<16 hex>` reference still present after patching, in either shape.
 * Used as a post-hoc assertion: a non-empty result means a hashed reference
 * survived and will fail at runtime exactly as Playwright did.
 */
export function findUnresolvedHashedSpecifiers(content) {
  const found = new Set();

  HASHED_SPECIFIER_REGEX.lastIndex = 0;
  let match;
  while ((match = HASHED_SPECIFIER_REGEX.exec(content)) !== null) {
    found.add(match[2]);
  }

  HASHED_TRACE_PATH_REGEX.lastIndex = 0;
  while ((match = HASHED_TRACE_PATH_REGEX.exec(content)) !== null) {
    found.add(match[1]);
  }

  return [...found];
}

/** Files whose contents can carry a runtime-resolved specifier. */
const PATCHABLE = ['.js', '.mjs', '.cjs'];
/** Build traces. Harmless without `output: 'standalone'`, wrong if we ever enable it. */
const TRACE = '.nft.json';

function patchDirectory(dir, packageNames, stats) {
  if (!fs.existsSync(dir)) return;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      patchDirectory(fullPath, packageNames, stats);
      continue;
    }

    const isPatchable = PATCHABLE.some((ext) => entry.name.endsWith(ext));
    const isTrace = entry.name.endsWith(TRACE);
    if (!isPatchable && !isTrace) continue;

    const original = fs.readFileSync(fullPath, 'utf8');
    const result = isTrace ? patchTraceSource(original, packageNames) : patchSource(original, packageNames);

    for (const base of result.unknown) stats.unknown.add(base);

    if (!result.changed) continue;

    fs.writeFileSync(fullPath, result.content, 'utf8');
    if (isTrace) stats.traces += 1;
    else stats.chunks += 1;
  }
}

function main() {
  const packageNames = collectInstalledPackageNames(PROJECT_ROOT);

  if (packageNames.size === 0) {
    console.error(
      '[postbuild-turbopack-patch] No installed packages found under node_modules; refusing to patch.'
    );
    process.exit(1);
  }

  if (!fs.existsSync(SERVER_DIR)) {
    console.log('[postbuild-turbopack-patch] .next/server not found, skipping patch.');
    return;
  }

  const stats = { chunks: 0, traces: 0, unknown: new Set() };
  patchDirectory(SERVER_DIR, packageNames, stats);

  console.log(
    `[postbuild-turbopack-patch] Patched ${stats.chunks} server chunk(s) and ${stats.traces} build trace(s) ` +
      `against ${packageNames.size} installed package(s).`
  );

  if (stats.unknown.size > 0) {
    console.warn(
      `[postbuild-turbopack-patch] Left ${stats.unknown.size} hashed specifier(s) untouched because the package is not installed: ` +
        `${[...stats.unknown].slice(0, 10).join(', ')}`
    );
  }
}

const invokedDirectly =
  process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (invokedDirectly) {
  try {
    main();
  } catch (err) {
    console.error('[postbuild-turbopack-patch] Error patching server chunks:', err);
    process.exit(1);
  }
}
