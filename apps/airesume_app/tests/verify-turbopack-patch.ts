/**
 * Turbopack hashed-external patch checks — run with `npm run verify:turbopack-patch`.
 *
 * WHY THIS EXISTS
 * ---------------
 * Production could not load Playwright, so no application was ever submitted
 * automatically. The build emitted
 *
 *   a.y("playwright-486435c03838073d")
 *
 * and the runtime's `externalImport(id)` is `await import(id)`, so Node was asked
 * for a package literally named `playwright-486435c03838073d` and threw
 * ERR_MODULE_NOT_FOUND. The old postbuild script only rewrote
 * `require("pkg-<hash>")`, so the async-loader shape sailed straight through.
 *
 * These fixtures pin the three shapes Turbopack emits, plus the cases the patch
 * must NOT touch. The negative cases matter as much as the positive ones: an
 * over-eager rewrite would corrupt chunk contents.
 *
 * Pure functions, so this needs no build and no database.
 */
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  EXTERNAL_FORMS,
  collectInstalledPackageNames,
  findUnresolvedHashedSpecifiers,
  patchSource,
  patchTraceSource,
  readInstalledPackageNames,
} from '../scripts/postbuild-turbopack-patch.mjs';

let checks = 0;
const ok = (label: string) => {
  checks += 1;
  console.log(`  ok  ${label}`);
};

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Only these are treated as real packages, so the tests are deterministic. */
const INSTALLED = new Set(['playwright', 'playwright-core', 'puppeteer', 'redis', '@sentry/nextjs']);

const PLAYWRIGHT_HASH = 'playwright-486435c03838073d';
const PUPPETEER_HASH = 'puppeteer-7a7dca4da22e6a24';
const REDIS_HASH = 'redis-2f68610f2a7abfdd';
const SENTRY_HASH = '@sentry/nextjs-5ddc2e04d0b88d8e';

// ---------------------------------------------------------------------------
// 1. The shape that actually broke production: the async external loader.
//
// This is the real chunk body, byte for byte, from
// .next/server/chunks/[externals]_playwright_0desi97._.js
// ---------------------------------------------------------------------------
{
  const chunk = `module.exports=[393804,a=>a.a(async(t,c)=>{try{var r=await ${EXTERNAL_FORMS.asyncLoader(
    PLAYWRIGHT_HASH
  )};a.n(r),c()}catch(a){c(a)}},!0)];`;

  const { content, changed, rewrites } = patchSource(chunk, INSTALLED);

  assert.ok(changed, 'the async-loader form must be rewritten');
  assert.ok(content.includes('a.y("playwright")'), 'the hashed specifier must become the real package');
  assert.ok(!content.includes('486435c03838073d'), 'no trace of the hash may remain');
  assert.equal(rewrites.length, 1);
  assert.equal(rewrites[0].to, 'playwright');
  ok('async external loader a.y("pkg-hash") is rewritten to the real package');
}

// ---------------------------------------------------------------------------
// 2. The factory form. It already resolves (the factory supplies a clean
//    require), but it must be normalised too so the key matches reality.
// ---------------------------------------------------------------------------
{
  const chunk = `t.exports=e.x(${JSON.stringify(PUPPETEER_HASH)},()=>require("puppeteer"))`;
  const { content, changed } = patchSource(chunk, INSTALLED);

  assert.ok(changed, 'the factory form must be normalised');
  assert.ok(
    content.includes('e.x("puppeteer",()=>require("puppeteer"))'),
    'the hashed key becomes the real package name and the factory is untouched'
  );
  ok('factory form e.x("pkg-hash", () => require("pkg")) is normalised');
}

// ---------------------------------------------------------------------------
// 3. The plain require form the old script already handled. Must not regress.
// ---------------------------------------------------------------------------
{
  const { content, changed } = patchSource(`require(${JSON.stringify(REDIS_HASH)})`, INSTALLED);

  assert.ok(changed, 'the plain require form must still be rewritten');
  assert.equal(content, 'require("redis")');
  ok('plain require("pkg-hash") is still rewritten (no regression)');
}

// ---------------------------------------------------------------------------
// 4. Scoped packages. `/` is not in the base-name character class, so the
//    scope needs its own handling or the literal never matches.
// ---------------------------------------------------------------------------
{
  const { content, changed } = patchSource(`require(${JSON.stringify(SENTRY_HASH)})`, INSTALLED);

  assert.ok(changed, 'a scoped package must be rewritten');
  assert.equal(content, 'require("@sentry/nextjs")');
  ok('scoped package require("@scope/pkg-hash") is rewritten');
}

// ---------------------------------------------------------------------------
// 5. Build traces (.nft.json) carry the same hashed path. Inert without
//    `output: "standalone"`, but wrong the day someone enables it.
// ---------------------------------------------------------------------------
{
  const trace = `{"files":["../../../../../node_modules/mongoose-8e05a5c0a9bf4f3d","../../../../../node_modules/${PLAYWRIGHT_HASH}"]}`;
  const { content, changed } = patchTraceSource(trace, new Set([...INSTALLED, 'mongoose']));

  assert.ok(changed, 'trace paths must be rewritten');
  assert.ok(content.includes('node_modules/playwright"'), 'the hashed trace path loses its hash');
  assert.ok(content.includes('node_modules/mongoose"'), 'mongoose trace path is normalised too');
  assert.deepEqual(findUnresolvedHashedSpecifiers(content), [], 'no hashed trace path may survive');
  ok('.nft.json trace paths are normalised');
}

// ---------------------------------------------------------------------------
// 6. NEGATIVE: a package we do not ship must be left exactly as found.
//
// Guessing here would mean rewriting strings that are not specifiers at all.
// ---------------------------------------------------------------------------
{
  const source = `var x="totally-made-up-pkg-0123456789abcdef";`;
  const { content, changed, unknown } = patchSource(source, INSTALLED);

  assert.equal(changed, false, 'an uninstalled package must not be rewritten');
  assert.equal(content, source, 'content must be byte-identical');
  assert.deepEqual(unknown, ['totally-made-up-pkg'], 'and it must be reported, not silently kept');
  ok('a hashed literal for an uninstalled package is left alone and reported');
}

// ---------------------------------------------------------------------------
// 7. NEGATIVE: a hex suffix of the wrong length is not a Turbopack hash.
// ---------------------------------------------------------------------------
{
  for (const bad of ['redis-0123456789abcde', 'redis-0123456789abcdef0', 'redis-0123456789ABCDEF']) {
    const source = `require("${bad}")`;
    const { content } = patchSource(source, INSTALLED);
    assert.equal(content, source, `${bad} must not match a 16-char lowercase-hex hash`);
  }
  ok('a non-16-char or uppercase suffix is not treated as a hash');
}

// ---------------------------------------------------------------------------
// 8. NEGATIVE: unquoted occurrences are data, not specifiers.
// ---------------------------------------------------------------------------
{
  const source = `// see ${PLAYWRIGHT_HASH} in the docs`;
  const { content, changed } = patchSource(source, INSTALLED);
  assert.equal(changed, false, 'an unquoted mention must not be rewritten');
  assert.equal(content, source);
  ok('an unquoted mention of a hashed name is not rewritten');
}

// ---------------------------------------------------------------------------
// 9. Idempotency. The patch runs on every build, and a double run must not
//    corrupt anything.
// ---------------------------------------------------------------------------
{
  const chunk = `a.y(${JSON.stringify(PLAYWRIGHT_HASH)}),require(${JSON.stringify(REDIS_HASH)})`;
  const once = patchSource(chunk, INSTALLED);
  const twice = patchSource(once.content, INSTALLED);

  assert.ok(once.changed);
  assert.equal(twice.changed, false, 'a second pass must be a no-op');
  assert.equal(twice.content, once.content);
  ok('patching is idempotent');
}

// ---------------------------------------------------------------------------
// 10. The regression guard that matters most: after patching, nothing hashed
//     may survive. A survivor fails at runtime exactly as Playwright did.
// ---------------------------------------------------------------------------
{
  const chunk = [
    `a.y(${JSON.stringify(PLAYWRIGHT_HASH)})`,
    EXTERNAL_FORMS.factory(PUPPETEER_HASH, 'puppeteer'),
    `require(${JSON.stringify(REDIS_HASH)})`,
  ].join(',');

  assert.equal(findUnresolvedHashedSpecifiers(chunk).length, 3, 'fixture must start with 3 hashed specifiers');

  const { content } = patchSource(chunk, INSTALLED);
  assert.deepEqual(findUnresolvedHashedSpecifiers(content), [], 'no hashed specifier may survive the patch');
  ok('no hashed specifier survives the patch');
}

// ---------------------------------------------------------------------------
// 11. Against the real installed tree, so this test fails loudly if the
//     allowlist ever stops seeing Playwright.
// ---------------------------------------------------------------------------
{
  const installed = collectInstalledPackageNames(PROJECT_ROOT);
  assert.ok(installed.size > 100, `expected a populated node_modules, saw ${installed.size} packages`);

  for (const pkg of ['playwright', 'playwright-core', 'puppeteer', 'mongoose']) {
    assert.ok(installed.has(pkg), `${pkg} must be discovered as installed`);
  }
  ok('the installed-package allowlist finds the serverExternalPackages entries');

  const realChunk = `a.y(${JSON.stringify(PLAYWRIGHT_HASH)})`;
  const { content } = patchSource(realChunk, installed);
  assert.ok(content.includes('a.y("playwright")'), 'the real allowlist must rewrite the real specifier');
  ok('the real allowlist rewrites the real Playwright specifier');
}

// ---------------------------------------------------------------------------
// 12. A missing node_modules must not throw — it must report "nothing".
// ---------------------------------------------------------------------------
{
  const names = readInstalledPackageNames(path.join(PROJECT_ROOT, 'definitely-not-here'));
  assert.equal(names.size, 0);
  ok('a missing node_modules yields an empty set instead of throwing');
}

console.log(`\nverify-turbopack-patch: ${checks} checks passed`);
