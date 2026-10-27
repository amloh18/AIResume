#!/usr/bin/env node
/**
 * Secret scanner — guards a PUBLIC repository.
 *
 * Three modes:
 *
 *   node tools/scan-secrets.mjs             # tracked files (CI / manual)
 *   node tools/scan-secrets.mjs --staged    # staged diff only (pre-commit)
 *   node tools/scan-secrets.mjs --history   # every line ever added, all refs
 *
 * Why `--history` matters: deleting a leaked key does NOT remove it from a
 * public repo — anyone can read it out of an old commit. The default mode keeps
 * CI fast; run `--history` before a public release and after any incident.
 *
 * Output never includes the secret itself. CI logs of a public repository are
 * public, so findings are reported as a redacted preview plus a stable hash that
 * lets you tell two different leaked values apart.
 *
 * Suppression: add `secret-scan:allow <reason>` to the offending line (or the
 * line above it) for intentional test fixtures. Suppressions are listed in the
 * summary so they do not silently accumulate.
 *
 * No dependencies: runs on Node >= 22 with git available.
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const MODE = process.argv.includes('--history')
  ? 'history'
  : process.argv.includes('--staged')
    ? 'staged'
    : 'tracked';

/** Provider-shaped tokens: high confidence, effectively never false positives. */
const TOKEN_PATTERNS = [
  ['google_api_key', /\bAIza[0-9A-Za-z_-]{35}\b/g],
  ['openai_api_key', /\bsk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{32,}\b/g],
  ['anthropic_api_key', /\bsk-ant-[A-Za-z0-9_-]{20,}\b/g],
  ['perplexity_api_key', /\bpplx-[A-Za-z0-9]{20,}\b/g],
  ['github_token', /\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{30,})\b/g],
  ['aws_access_key_id', /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g],
  ['stripe_live_key', /\b(?:sk|rk)_live_[A-Za-z0-9]{15,}\b/g],
  ['stripe_webhook_secret', /\bwhsec_[A-Za-z0-9]{20,}\b/g],
  ['razorpay_live_key', /\brzp_live_[A-Za-z0-9]{10,}\b/g],
  ['slack_token', /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g],
  ['sendgrid_key', /\bSG\.[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}\b/g],
  ['resend_key', /\bre_[A-Za-z0-9]{20,}\b/g],
  ['private_key_block', /-----BEGIN (?:RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/g],
  ['mongo_uri_with_password', /\bmongodb(?:\+srv)?:\/\/[^\s:@/'"`]+:[^\s@/'"`]+@[^\s'"`]+/g],
  ['postgres_uri_with_password', /\bpostgres(?:ql)?:\/\/[^\s:@/'"`]+:[^\s@/'"`]+@[^\s'"`]+/g],
  ['jwt_like_secret', /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g],
];

/**
 * A PEM header on its own is not a leak — documentation and comments quote the
 * format constantly. It only counts when real key material is present: base64
 * on the same line, or a header standing alone on its line (how a real .p8/.pem
 * always looks).
 */
const PEM_WITH_BODY = /-----BEGIN (?:RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----[A-Za-z0-9+/=\\n\s]{40,}/;
const PEM_ALONE = /^\s*["']?-----BEGIN (?:RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----\s*["']?\s*$/;

/**
 * `NAME=value` / `NAME: value` for credential-sounding names. Deliberately
 * conservative: the value must be long enough and must not look like code,
 * a template, or a documented placeholder.
 */
const ASSIGNMENT = /(?<![A-Za-z0-9_])([A-Z0-9_]*(?:SECRET|PASSWORD|PASSWD|API_?KEY|ACCESS_?KEY|PRIVATE_?KEY|CLIENT_SECRET|AUTH_TOKEN|WEBHOOK_SECRET|ENCRYPTION_KEY)[A-Z0-9_]*)\s*[=:]\s*["']?([^\s"'`,;#]{12,})/g;

/**
 * Markdown/CSV tables: `| \`AWS_SECRET_ACCESS_KEY\` | \`bAU49…\` |`. Documentation
 * leaks are usually written this way — no `=` anywhere — so the assignment rule
 * above misses them.
 */
const TABLE_ROW = /\|\s*`?([A-Z0-9_]*(?:SECRET|PASSWORD|API_?KEY|ACCESS_?KEY|PRIVATE_?KEY|CLIENT_SECRET|TOKEN)[A-Z0-9_]*)`?\s*\|\s*`?([A-Za-z0-9+/=_.-]{20,})`?\s*\|/g;

const PLACEHOLDER = new RegExp(
  [
    'your', 'my-', 'xxxx', 'changeme', 'change-me', 'replace', 'placeholder', 'example',
    'sample', 'dummy', 'redacted', 'todo', 'tbd', '\\bhere\\b', '_here', 'olduser', 'oldpass',
    'oldcluster', 'newuser', 'newpass', 'newcluster', '<', '\\$\\{', '%s', '\\*\\*\\*',
    'process\\.env', 'import\\.meta', '^sk_test_', '^pk_test_', '^rzp_test_', 'undefined',
    '^null$', '^none$', '^true$', '^false$', '^\\*+$', '^x+$', '^0+$',
  ].join('|'),
  'i'
);

/** Files that are generated, vendored, or binary — never worth scanning. */
const SKIP_PATH = [
  /(^|\/)package-lock\.json$/,
  /(^|\/)(?:yarn\.lock|pnpm-lock\.yaml)$/,
  /(^|\/)node_modules\//,
  /(^|\/)\.next\//,
  /(^|\/)dist\//,
  /(^|\/)build\//,
  /(^|\/)coverage\//,
  /\.(?:png|jpe?g|gif|webp|ico|pdf|zip|gz|tgz|woff2?|ttf|eot|mp[34]|webm|mov|wasm|map|snap)$/i,
  // This scanner's own pattern table is full of credential-shaped strings.
  /(^|\/)tools\/scan-secrets\.mjs$/,
  /(^|\/)tools\/secret-scan-allowlist\.json$/,
];

const SUPPRESS = /secret-scan:\s*allow\b/;

const hasOwn = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);

/**
 * Fingerprint allowlist for values that are permanently benign (test fixtures).
 * Keyed by fingerprint so the value is never stored. Missing file is fine.
 */
const ALLOWLIST_PATH = path.join(path.dirname(fileURLToPath(import.meta.url)), 'secret-scan-allowlist.json');
const USE_ALLOWLIST = !process.argv.includes('--no-allowlist');
let ALLOWED = new Map();
if (USE_ALLOWLIST) {
  try {
    const parsed = JSON.parse(readFileSync(ALLOWLIST_PATH, 'utf8'));
    for (const entry of parsed.allow ?? []) {
      if (entry?.fingerprint) ALLOWED.set(entry.fingerprint, entry.reason ?? 'no reason given');
    }
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.error(`secret-scan: could not read ${ALLOWLIST_PATH}: ${err.message}`);
      process.exit(2);
    }
  }
}

function redact(value) {
  const v = String(value);
  if (v.length <= 12) return `${v.slice(0, 2)}…(len ${v.length})`;
  return `${v.slice(0, 6)}…${v.slice(-4)} (len ${v.length})`;
}

function fingerprint(value) {
  return createHash('sha256').update(value).digest('hex').slice(0, 10);
}

function isPlaceholder(value) {
  if (PLACEHOLDER.test(value)) return true;
  if (new Set(value).size <= 2) return true;
  return false;
}

/**
 * A value that is a *reference* to a secret rather than the secret itself.
 *
 * `env.NEXTAUTH_SECRET`, `process.env.API_KEY` and `z.string().min(32)` all sit
 * on the right-hand side of a credential-looking assignment in ordinary source
 * code. A bare identifier (`INGESTION_WORKER_TOKEN`) is the same problem one
 * level up: it is what documentation tables use as a placeholder for a name.
 *
 * Only applied to the assignment and table rules — a value that matched a
 * provider token pattern is always treated as a credential, because AWS key ids
 * are themselves all-uppercase and would otherwise look like an identifier.
 */
function isCodeReference(value) {
  if (/^(?:env|process|import|os|this|window)\b/.test(value)) return true;
  if (/^[A-Za-z_$][\w$]*(?:\.[\w$]+)+\s*\(/.test(value)) return true; // z.string().min(32)
  if (/[()]/.test(value)) return true;
  if (/^[A-Z][A-Z0-9_]*$/.test(value)) return true; // bare identifier
  return false;
}

/** Scan one line; returns [{ kind, value }]. */
function scanLine(line) {
  const hits = [];

  for (const [kind, pattern] of TOKEN_PATTERNS) {
    // A PEM header is only a finding when key material follows it, and a
    // truncated sample (`MIGTAgEA…wIBAQQg...`) is documentation, not a key.
    if (kind === 'private_key_block') {
      const hasMaterial = PEM_WITH_BODY.test(line) || PEM_ALONE.test(line);
      const body = line.slice(line.indexOf('PRIVATE KEY-----') + 'PRIVATE KEY-----'.length);
      if (hasMaterial && !/(?:\.\.\.|…)/.test(body)) {
        hits.push({ kind, value: 'private key material' });
      }
      continue;
    }

    pattern.lastIndex = 0;
    for (const match of line.matchAll(pattern)) {
      // `mongodb+srv://<user>:<password>@…` and `user:oldpass@…` are templates.
      if (isPlaceholder(match[0])) continue;
      hits.push({ kind, value: match[0] });
    }
  }

  ASSIGNMENT.lastIndex = 0;
  for (const match of line.matchAll(ASSIGNMENT)) {
    const [, name, value] = match;
    if (isPlaceholder(value) || isCodeReference(value)) continue;
    if (hasOwn(TOKEN_KINDS, name)) continue; // already reported by a token rule
    hits.push({ kind: `assignment:${name}`, value });
  }

  TABLE_ROW.lastIndex = 0;
  for (const match of line.matchAll(TABLE_ROW)) {
    const [, name, value] = match;
    if (isPlaceholder(value) || isCodeReference(value)) continue;
    hits.push({ kind: `table:${name}`, value });
  }

  return hits;
}

const TOKEN_KINDS = Object.fromEntries(TOKEN_PATTERNS.map(([kind]) => [kind, true]));

function skipPath(path) {
  return SKIP_PATH.some(rx => rx.test(path));
}

function git(args, opts = {}) {
  return execFileSync('git', args, { encoding: 'utf8', maxBuffer: 512 * 1024 * 1024, ...opts });
}

const findings = [];
const suppressed = [];
let linesScanned = 0;

function record(path, line, lineNumber, hits, context) {
  for (const hit of hits) {
    const entry = {
      path,
      line: lineNumber,
      kind: hit.kind,
      preview: redact(hit.value),
      fingerprint: fingerprint(hit.value),
      context,
    };
    if (SUPPRESS.test(line)) {
      entry.reason = 'inline secret-scan:allow';
      suppressed.push(entry);
    } else if (ALLOWED.has(entry.fingerprint)) {
      entry.reason = ALLOWED.get(entry.fingerprint);
      suppressed.push(entry);
    } else {
      findings.push(entry);
    }
  }
}

// ── Mode: tracked files ──────────────────────────────────────────────────────
function scanTracked() {
  const files = git(['ls-files', '-z']).split('\0').filter(Boolean);
  for (const path of files) {
    if (skipPath(path)) continue;
    let text;
    try {
      text = readFileSync(path, 'utf8');
    } catch {
      continue; // unreadable or binary
    }
    if (text.includes('\0')) continue; // binary
    text.split('\n').forEach((line, i) => {
      linesScanned += 1;
      const hits = scanLine(line);
      if (hits.length) record(path, line, i + 1, hits, 'tracked');
    });
  }
}

// ── Mode: staged diff (pre-commit) ──────────────────────────────────────────
function scanStaged() {
  // -U0 keeps the diff to changed lines; only added lines are inspected.
  const diff = git(['diff', '--cached', '--unified=0', '--no-color', '--no-ext-diff']);
  let path = null;
  let newLine = 0;
  for (const line of diff.split('\n')) {
    if (line.startsWith('+++ b/')) {
      path = line.slice(6);
      continue;
    }
    if (line.startsWith('+++ /dev/null')) {
      path = null;
      continue;
    }
    const hunk = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(line);
    if (hunk) {
      newLine = Number(hunk[1]);
      continue;
    }
    if (line.startsWith('+') && !line.startsWith('+++')) {
      if (path && !skipPath(path)) {
        linesScanned += 1;
        const hits = scanLine(line.slice(1));
        if (hits.length) record(path, line.slice(1), newLine, hits, 'staged');
      }
      newLine += 1;
    }
  }
}

// ── Mode: history ───────────────────────────────────────────────────────────
function scanHistory() {
  const log = git(
    ['log', '--all', '--no-merges', '-p', '--unified=0', '--no-color', '--pretty=format:__COMMIT__%H'],
    { maxBuffer: 2 * 1024 * 1024 * 1024 }
  );
  let commit = null;
  let path = null;
  for (const line of log.split('\n')) {
    if (line.startsWith('__COMMIT__')) {
      commit = line.slice(10).trim();
      continue;
    }
    if (line.startsWith('+++ b/')) {
      path = line.slice(6);
      continue;
    }
    if (!line.startsWith('+') || line.startsWith('+++')) continue;
    if (!path || skipPath(path)) continue;
    const content = line.slice(1);
    linesScanned += 1;
    const hits = scanLine(content);
    if (hits.length) record(path, content, 0, hits, `commit ${commit?.slice(0, 8)}`);
  }
}

const MODE_LABEL = {
  tracked: 'tracked files',
  staged: 'staged changes',
  history: 'full history (all refs)',
};

try {
  if (MODE === 'tracked') scanTracked();
  else if (MODE === 'staged') scanStaged();
  else scanHistory();
} catch (err) {
  console.error(`secret-scan: failed to read ${MODE === 'history' ? 'history' : 'files'}: ${err.message}`);
  process.exit(2);
}

/** Suppressed findings are always listed — a silent allowlist is a blind spot. */
function reportSuppressed(stream) {
  if (!suppressed.length) return;
  const unique = new Map();
  for (const s of suppressed) {
    if (!unique.has(s.fingerprint)) unique.set(s.fingerprint, s);
  }
  stream(`secret-scan: ${suppressed.length} suppressed finding(s) in ${unique.size} distinct value(s):`);
  for (const s of unique.values()) {
    stream(`  [${s.fingerprint}] ${s.path} — ${s.reason}`);
  }
  stream('  (review with: node tools/scan-secrets.mjs --no-allowlist)');
}

if (findings.length === 0) {
  console.log(`secret-scan: clean — ${linesScanned} lines checked (${MODE_LABEL[MODE]})`);
  reportSuppressed(console.log);
  process.exit(0);
}

// Group by file so the report stays readable.
const byPath = new Map();
for (const f of findings) {
  if (!byPath.has(f.path)) byPath.set(f.path, []);
  byPath.get(f.path).push(f);
}

console.error(`\nsecret-scan: ${findings.length} potential secret(s) in ${byPath.size} file(s) — ${MODE_LABEL[MODE]}\n`);
for (const [path, items] of [...byPath].sort()) {
  console.error(`  ${path}`);
  for (const item of items) {
    const where = item.line ? `:${item.line}` : '';
    console.error(`    ${item.kind}  ${item.preview}  [${item.fingerprint}]  ${item.context}${where}`);
  }
}
console.error(`
Values are redacted on purpose (CI logs are public). To inspect a finding:
  git show <commit>:<path>        # history mode
  sed -n '<line>p' <path>         # tracked / staged mode

If this is a false positive, append  secret-scan:allow <reason>  to the line.
A real finding must be ROTATED — deleting it from the tree is not enough in a
public repository. See docs/deployment/secret-rotation.md.
`);

process.exit(1);
