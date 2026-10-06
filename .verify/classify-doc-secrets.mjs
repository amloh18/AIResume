import fs from 'node:fs';

const files = [
  'docs/mongodb-local-vps-migration.md',
  'docs/application-automation/vps-worker-fixes.md',
  'docs/application-automation/email-audit.md',
  'docs/MIGRATION.md',
  'docs/deployment/vps-automation-workers.md',
  'docs/deployment/dokploy-worker-runbook.md',
  'docs/deployment/dokploy-worker-migration-plan.md',
];

const KEYS = [
  'MONGODB_URI', 'MONGODB_DB', 'JWT_SECRET', 'NEXTAUTH_SECRET', 'GEMINI_API_KEY',
  'CRON_SECRET', 'CRON_API_KEY', 'INGESTION_WORKER_TOKEN', 'STALWART_SMTP_PASSWORD',
  'STALWART_JMAP_PASSWORD', 'STALWART_ADMIN_PASSWORD', 'KV_URL', 'KV_REST_API_TOKEN',
  'REDIS_URL', 'STRIPE_SECRET_KEY', 'RAZORPAY_KEY_SECRET', 'POLAR_ACCESS_TOKEN',
  'AWS_SECRET_ACCESS_KEY', 'EMAIL_SERVER_PASSWORD', 'GOOGLE_CLIENT_SECRET',
  'TOKEN_ENCRYPTION_KEY', 'FIREBASE_PRIVATE_KEY', 'LINKEDIN_CLIENT_SECRET',
];

// A value is "real-looking" if it is non-empty and has none of the placeholder tells.
const PLACEHOLDER = /(<|>|your|xxx|example|placeholder|redacted|changeme|\.\.\.|_HERE|YOUR_|\[\s*\]|^-\s*$)/i;

const re = new RegExp(`\\b(${KEYS.join('|')})=([^\\s\`"',;)]*)`, 'g');

let realCount = 0;
let placeholderCount = 0;

for (const f of files) {
  if (!fs.existsSync(f)) continue;
  const lines = fs.readFileSync(f, 'utf8').split('\n');
  lines.forEach((line, i) => {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(line)) !== null) {
      const value = m[2];
      const isPlaceholder = value.length === 0 || PLACEHOLDER.test(value);
      if (isPlaceholder) placeholderCount++;
      else {
        realCount++;
        // report location + key ONLY. Never the value.
        console.log(`REAL-LOOKING  ${f}:${i + 1}  ${m[1]}  (${value.length} chars)`);
      }
    }
  });
}

console.log(`\nreal-looking: ${realCount}   placeholder/empty: ${placeholderCount}`);
