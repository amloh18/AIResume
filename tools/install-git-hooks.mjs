#!/usr/bin/env node
/**
 * Point git at the repository's tracked hooks (.githooks) so the pre-commit
 * secret scan actually runs. Idempotent; run once per clone:
 *
 *   npm run hooks:install
 *
 * core.hooksPath is a local git setting — it is not committed, so a fresh clone
 * must run this again (CI enforces the same rules independently).
 */
import { execFileSync } from 'node:child_process';
import { chmodSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const hooksDir = path.join(root, '.githooks');
const hook = path.join(hooksDir, 'pre-commit');

try {
  chmodSync(hook, 0o755);
  execFileSync('git', ['-C', root, 'config', 'core.hooksPath', '.githooks'], { stdio: 'inherit' });
  console.log('hooks installed: core.hooksPath = .githooks (pre-commit secret scan active)');
  console.log('verify with: git config core.hooksPath');
} catch (err) {
  console.error(`hooks:install failed: ${err.message}`);
  process.exit(1);
}
