/**
 * postbuild-turbopack-patch.mjs
 *
 * Fixes Next.js 16 (v16.3.3) Turbopack monorepo bug where external modules
 * in server chunks have a 16-character hex hash appended to their names:
 * e.g. require("redis-2f68610f2a7abfdd") -> require("redis")
 *      require("mongoose-8e05a5c0a9bf4f3d") -> require("mongoose")
 *
 * Running this script post-build normalizes all hashed external package requires
 * in .next/server to prevent runtime MODULE_NOT_FOUND (HTTP 500) errors.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SERVER_DIR = path.join(PROJECT_ROOT, '.next', 'server');

// Matches require("package-name-16hex") or require('package-name-16hex')
// Example: require("redis-2f68610f2a7abfdd") or require("@sentry/nextjs-5ddc2e04d0b88d8e")
const HASHED_REQUIRE_REGEX = /require\((["'])([a-zA-Z0-9_@\/-]+)-[0-9a-f]{16}\1\)/g;

function patchDirectory(dir) {
  if (!fs.existsSync(dir)) return 0;
  let count = 0;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      count += patchDirectory(fullPath);
    } else if (entry.name.endsWith('.js') || entry.name.endsWith('.mjs')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (HASHED_REQUIRE_REGEX.test(content)) {
        const replaced = content.replace(HASHED_REQUIRE_REGEX, 'require($1$2$1)');
        fs.writeFileSync(fullPath, replaced, 'utf8');
        count++;
      }
    }
  }

  return count;
}

try {
  if (fs.existsSync(SERVER_DIR)) {
    const patchedCount = patchDirectory(SERVER_DIR);
    console.log(`[postbuild-turbopack-patch] Patched ${patchedCount} server chunk(s) with hashed external requires.`);
  } else {
    console.log('[postbuild-turbopack-patch] .next/server not found, skipping patch.');
  }
} catch (err) {
  console.error('[postbuild-turbopack-patch] Error patching server chunks:', err);
  process.exit(1);
}
