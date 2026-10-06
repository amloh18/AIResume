#!/usr/bin/env node
/**
 * Hardcoded-secret scanner.
 *
 * Reports file:line + the RULE that matched + the match length. It NEVER prints the
 * matched value, because this output lands in a transcript. Read-only.
 *
 * ── Why the rules are split into two groups ────────────────────────────────────
 * A `.env.example` template is *supposed* to contain values shaped like secrets —
 * `JWT_SECRET=your-super-secret-jwt-key`. Running the assignment rules there produces
 * permanent, known false positives, and a scanner with permanent noise is a scanner
 * people learn to skim. So the ASSIGNMENT rules are skipped in template files; only the
 * CREDENTIAL-SHAPE rules run there, because a real key pasted into a template must still
 * fail the gate.
 *
 * ── Why the assignment floor is 8 characters, not 12 ───────────────────────────
 * It was 12. That single digit is why this scanner reported clean while
 * `const PROD_ADMIN_PASSWORD = 'Y@nknenadd1'` — eleven characters — sat in
 * `apps/airesume_app/scripts/setup-production-admin.ts` and `vps_worker_secure_secret_2026` sat in
 * two test stubs. A length floor is a false-negative generator: the value that gets
 * hardcoded is usually a short human-chosen password, not a 40-char generated token.
 * 8 is the shortest value plausibly a secret rather than a word.
 *
 * ── What this scanner deliberately does NOT do ─────────────────────────────────
 * It looks for *credential shapes*, not *internal information*. A document naming the
 * production VPS address, a real customer email or an internal service topology is a
 * disclosure this script cannot see. Do not read "NO hardcoded-secret hits" as "nothing in
 * this tree is sensitive".
 *
 * ⚠️ That gap is not hypothetical. `.verify/docs-visibility.mjs` used to hold the production
 * VPS IPv4/IPv6, both Dokploy application ids and the Atlas cluster id as *detection markers* —
 * in a tracked file, so the guard published exactly what it guarded. This scanner reported
 * "no hits" the whole time, correctly: those are not credential shapes. It was deleted
 * 2026-10-05.
 *
 * There is no longer a redaction pass to hand such identifiers to. The three repositories start
 * from fresh histories, so there is nothing to purge, and `scripts/publish/verify-public-repos.sh`
 * only *checks* shapes — it cannot redact. **If you need to confirm an infrastructure identifier is
 * absent, search for its literal text.** No scanner in this repository can find it for you.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SKIP_DIRS = new Set([
  'node_modules', '.git', '.next', 'dist', 'build', 'coverage',
  '.tmp-mongo', 'brag-output', '.verify/build', 'out',
]);
const SKIP_FILE_RE = /(^|\/)(package-lock\.json|.*\.map|.*\.min\.js)$/;

/**
 * A template, not a real env file. Placeholders are the point of these files.
 * Matches `env.example`, `.env.example`, `.env.example.prod`, `foo.env.example`.
 */
const TEMPLATE_RE = /(^|\/)\.?env\.example(\.[^/]*)?$/;

/** Values that are obviously placeholders, never secrets. */
const PLACEHOLDER_VALUE_RE =
  /^(?:your|my|our|change|replace|example|placeholder|sample|dummy|fake|stub|test|local|dev|todo|tbd|xxx|abc|foo|bar|none|null|undefined|empty|unset|redacted|removed|string|value|literal|some|any|new|old)[-_ .]/i;

/** Interpolation or template syntax — not a literal. */
const NOT_A_LITERAL_RE = /[<{}$]/;

/**
 * Real credential shapes. These run EVERYWHERE, templates included: a live key pasted
 * into `.env.example` is exactly the accident this gate exists to catch.
 */
const CREDENTIAL_SHAPES = [
  ['stripe-live-secret', /\bsk_live_[A-Za-z0-9]{6,}/],
  ['stripe-test-secret', /\bsk_test_[A-Za-z0-9]{6,}/],
  ['stripe-restricted', /\brk_live_[A-Za-z0-9]{6,}/],
  ['razorpay-live', /\brzp_live_[A-Za-z0-9]{6,}/],
  ['razorpay-test', /\brzp_test_[A-Za-z0-9]{6,}/],
  ['google-api-key', /\bAIza[A-Za-z0-9_-]{20,}/],
  ['openai-key', /\bsk-[A-Za-z0-9]{32,}/],
  ['aws-access-key', /\bAKIA[0-9A-Z]{12,}/],
  ['jwt-literal', /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\./],
  ['mongo-uri-with-creds', /mongodb(\+srv)?:\/\/[^\s'"`]*:[^\s'"`@]{6,}@/],
  ['slack-token', /\bxox[baprs]-[A-Za-z0-9-]{10,}/],
  ['github-pat', /\bghp_[A-Za-z0-9]{20,}/],
  ['sendgrid-key', /\bSG\.[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{16,}/],
  ['polar-token', /\bpolar_(oat|pat)_[A-Za-z0-9]{10,}/],
];

/**
 * A literal assigned to a secret-ish name. Skipped in template files (see header).
 * Each entry is [name, regex, captureGroupOfTheValue].
 *
 * The name alternation is intentionally broad — bare `token` and `credential` are in
 * there because `INGESTION_WORKER_TOKEN` and `STUB_WORKER_TOKEN` are the exact names the
 * real leak used, and neither was covered by the narrower `access_token|auth_token`.
 */
const ASSIGNMENT_SHAPES = [
  ['private-key-block', /-----BEGIN [A-Z ]*PRIVATE KEY-----/, 0],
  ['literal-secret-assign',
    /(?:secret|password|passwd|api[_-]?key|apikey|access[_-]?token|auth[_-]?token|private[_-]?key|token|credential)\s*[:=]\s*['"`]([^'"`\s]{8,})['"`]/i,
    1],
  // `process.env.X_TOKEN || 'literal'` — a hardcoded fallback defeats the whole point of
  // reading the env var, and it is invisible to a reviewer skimming for `=` assignments.
  ['literal-secret-fallback',
    /[A-Za-z0-9_]*(?:TOKEN|SECRET|PASSWORD|PASSWD|API_KEY|APIKEY|CREDENTIAL)[A-Za-z0-9_]*\s*[:=][^;'"`\n]*\|\|\s*['"`]([^'"`\s]{8,})['"`]/,
    1],
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

/** Is this captured value a placeholder rather than a secret? */
function isPlaceholderValue(value) {
  if (!value) return true;
  if (PLACEHOLDER_VALUE_RE.test(value)) return true;
  if (NOT_A_LITERAL_RE.test(value)) return true;
  return false;
}

const files = walk(ROOT);
const hits = [];
let templatesSkipped = 0;

for (const f of files) {
  let src;
  try { src = fs.readFileSync(f, 'utf8'); } catch { continue; }
  const rel = path.relative(ROOT, f);
  const isTemplate = TEMPLATE_RE.test(rel);
  if (isTemplate) templatesSkipped += 1;

  const lines = src.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.length > 2000) continue;

    for (const [name, re] of CREDENTIAL_SHAPES) {
      const m = re.exec(line);
      if (m) hits.push({ file: rel, line: i + 1, rule: name, len: m[0].length });
    }

    if (isTemplate) continue; // assignment rules do not apply to templates

    for (const [name, re, group] of ASSIGNMENT_SHAPES) {
      const m = re.exec(line);
      if (!m) continue;
      // The fallback rule matches a name AND a value; only the value is judged.
      if (group > 0 && isPlaceholderValue(m[group])) continue;
      hits.push({ file: rel, line: i + 1, rule: name, len: m[0].length });
    }
  }
}

console.log(`scanned ${files.length} files (${templatesSkipped} template(s): assignment rules skipped)\n`);
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
