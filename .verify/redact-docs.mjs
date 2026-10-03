#!/usr/bin/env node
/**
 * Repo-wide credential redaction for a public release.
 *
 * Sweeps every TRACKED text file (not a hand-maintained list — a fixed list is exactly how
 * a leak gets missed) and replaces real credentials with placeholders.
 *
 *   node .verify/redact-docs.mjs          # dry run
 *   node .verify/redact-docs.mjs --apply  # rewrite
 *
 * Never prints a matched value. Idempotent.
 */
import fs from 'node:fs';
import { execSync } from 'node:child_process';

const APPLY = process.argv.includes('--apply');

// Only text-ish files. Source code is excluded on purpose: it was already verified clean, and
// rewriting code is a different (riskier) operation than sanitising documentation.
const TEXT_EXT = /\.(md|mdx|txt|ya?ml|json|sh|example|sample|template|env)$/i;
const TEXT_NAME = /(^|\/)(env\.example|\.env\.example.*|Dockerfile.*|Makefile)$/i;

const tracked = execSync('git ls-files -z', { encoding: 'buffer' })
  .toString('utf8')
  .split('\0')
  .filter(Boolean)
  .filter((f) => TEXT_EXT.test(f) || TEXT_NAME.test(f));

const RULES = [
  // mongodb URI with credentials in the userinfo
  [/(mongodb(?:\+srv)?:\/\/)[^:@\s/`"']+:[^@\s/`"']+@/g, (m, s) => `${s}<user>:<password>@`, 'mongo-userinfo'],
  // any real Atlas host -> placeholder cluster (must run AFTER the userinfo rule, and must
  // consume the whole host: a narrower pattern leaves the real cluster id behind)
  [/[A-Za-z0-9_<>-]+(?:\.[A-Za-z0-9_<>-]+)*\.mongodb\.net/gi, () => '<cluster>.mongodb.net', 'atlas-host'],
  // secret keys assigned a real-looking value
  [
    /\b(MONGODB_URI|MONGODB_DB|JWT_SECRET|NEXTAUTH_SECRET|GEMINI_API_KEY|PERPLEXITY_API_KEY|CRON_SECRET|CRON_API_KEY|INGESTION_WORKER_TOKEN|INGESTION_SERVICE_TOKEN|STALWART_SMTP_PASSWORD|STALWART_JMAP_PASSWORD|STALWART_ADMIN_PASSWORD|KV_URL|KV_REST_API_TOKEN|KV_REST_API_READ_ONLY_TOKEN|REDIS_URL|STRIPE_SECRET_KEY|STRIPE_WEBHOOK_SECRET|RAZORPAY_KEY_SECRET|RAZORPAY_WEBHOOK_SECRET|POLAR_ACCESS_TOKEN|POLAR_WEBHOOK_SECRET|AWS_SECRET_ACCESS_KEY|AWS_ACCESS_KEY_ID|EMAIL_SERVER_PASSWORD|GOOGLE_CLIENT_SECRET|APPLE_SECRET|TOKEN_ENCRYPTION_KEY|FIREBASE_PRIVATE_KEY|LINKEDIN_CLIENT_SECRET|VERCEL_OIDC_TOKEN|BETTER_AUTH_SECRET)=([^\s`"',;)]{12,})/g,
    (m, key) => `${key}=<redacted>`,
    'secret-assign',
  ],
];

const PLACEHOLDER = /(<|>|your|xxx|example|placeholder|redacted|changeme|\.\.\.|_HERE|YOUR_|…)|\{\{|\$\{/i;

const changes = [];
let total = 0;

for (const file of tracked) {
  let original;
  try { original = fs.readFileSync(file, 'utf8'); } catch { continue; }
  if (original.length > 2_000_000) continue;
  let out = original;
  const perFile = {};

  for (const [re, repl, name] of RULES) {
    out = out.replace(re, (...args) => {
      const m = args[0];
      const captured = args.slice(1, args.length - 2);
      // atlas-host is special: its own output (`<cluster>.mongodb.net`) contains `<`, so the
      // generic placeholder guard would treat a half-redacted host as "already done" and skip
      // it forever. Skip only on the exact canonical form.
      if (name === 'atlas-host') {
        if (m === '<cluster>.mongodb.net') return m;
      } else {
        if (PLACEHOLDER.test(m)) return m;
        if (name === 'secret-assign' && PLACEHOLDER.test(captured[1] || '')) return m;
      }
      perFile[name] = (perFile[name] || 0) + 1;
      total++;
      return repl(...args);
    });
  }

  if (out !== original) {
    changes.push([file, perFile]);
    if (APPLY) fs.writeFileSync(file, out);
  }
}

console.log(APPLY ? '=== APPLIED ===' : '=== DRY RUN (pass --apply) ===');
console.log(`scanned ${tracked.length} tracked text files\n`);
if (!changes.length) {
  console.log('no credentials found — clean');
} else {
  for (const [file, perFile] of changes) {
    const summary = Object.entries(perFile).map(([k, v]) => `${k}×${v}`).join(', ');
    console.log(`  ${file}  →  ${summary}`);
  }
}
console.log(`\ntotal redactions: ${total}  across ${changes.length} files`);
