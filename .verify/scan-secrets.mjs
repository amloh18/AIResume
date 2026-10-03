#!/usr/bin/env node
/**
 * Hardcoded-secret scanner.
 *
 * Reports file:line + the RULE that matched + the match length. It NEVER prints the
 * matched value, because this output lands in a transcript. Read-only.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SKIP_DIRS = new Set([
  'node_modules', '.git', '.next', 'dist', 'build', 'coverage',
  '.tmp-mongo', 'brag-output', '.verify/build', 'out',
]);
const SKIP_FILE_RE = /(^|\/)(package-lock\.json|.*\.map|.*\.min\.js)$/;

const RULES = [
  ['stripe-live-secret', /\bsk_live_[A-Za-z0-9]{6,}/],
  ['stripe-test-secret', /\bsk_test_[A-Za-z0-9]{6,}/],
  ['stripe-restricted', /\brk_live_[A-Za-z0-9]{6,}/],
  ['razorpay-live', /\brzp_live_[A-Za-z0-9]{6,}/],
  ['razorpay-test', /\brzp_test_[A-Za-z0-9]{6,}/],
  ['google-api-key', /\bAIza[A-Za-z0-9_-]{20,}/],
  ['openai-key', /\bsk-[A-Za-z0-9]{32,}/],
  ['aws-access-key', /\bAKIA[0-9A-Z]{12,}/],
  ['jwt-literal', /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\./],
  ['private-key-block', /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ['mongo-uri-with-creds', /mongodb(\+srv)?:\/\/[^\s'"`]*:[^\s'"`@]{6,}@/],
  ['slack-token', /\bxox[baprs]-[A-Za-z0-9-]{10,}/],
  ['github-pat', /\bghp_[A-Za-z0-9]{20,}/],
  ['sendgrid-key', /\bSG\.[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{16,}/],
  ['polar-token', /\bpolar_(oat|pat)_[A-Za-z0-9]{10,}/],
  // assignments of a literal to a secret-ish name — the classic hardcode
  ['literal-secret-assign',
    /(?:secret|password|passwd|api[_-]?key|apikey|access[_-]?token|auth[_-]?token|private[_-]?key)\s*[:=]\s*['"`][^'"`\s]{12,}['"`]/i],
];

function walk(dir, out = []) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    const rel = path.relative(ROOT, full);
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name) || SKIP_DIRS.has(rel)) continue;
      walk(full, out);
    } else if (/\.(ts|tsx|js|jsx|mjs|cjs|json|yml|yaml|sh|py|env|example|md)$/.test(e.name)) {
      if (SKIP_FILE_RE.test(rel)) continue;
      out.push(full);
    }
  }
  return out;
}

const files = walk(ROOT);
const hits = [];
for (const f of files) {
  let src;
  try { src = fs.readFileSync(f, 'utf8'); } catch { continue; }
  const lines = src.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.length > 2000) continue;
    for (const [name, re] of RULES) {
      const m = re.exec(line);
      if (m) {
        hits.push({
          file: path.relative(ROOT, f),
          line: i + 1,
          rule: name,
          len: m[0].length,
          // deliberately NOT the value
        });
      }
    }
  }
}

console.log(`scanned ${files.length} files\n`);
if (!hits.length) {
  console.log('NO hardcoded-secret hits.');
} else {
  const byRule = new Map();
  for (const h of hits) byRule.set(h.rule, (byRule.get(h.rule) || 0) + 1);
  console.log('hits by rule:');
  for (const [k, v] of [...byRule.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k.padEnd(26)} ${v}`);
  }
  console.log('\nlocations (value redacted):');
  for (const h of hits.slice(0, 120)) {
    console.log(`  ${h.file}:${h.line}  [${h.rule}] (${h.len} chars)`);
  }
  if (hits.length > 120) console.log(`  … and ${hits.length - 120} more`);
}
