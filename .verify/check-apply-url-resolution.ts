/**
 * Proves the SB-20 fix against the real corpus, using the real functions.
 *
 * `detectAtsFromUrl()` was never wrong — it was never *given* the URL. This runs the actual
 * `resolveApplyUrl()` + `detectAtsFromUrl()` over every document in `jobs` and reports the ATS
 * distribution before (raw `applyUrl` only) and after (resolved), so the effect of the fix is
 * measured rather than argued.
 *
 * Read-only: `find` only, no writes.
 *
 * Run:  npx esbuild .verify/check-apply-url-resolution.ts --bundle --platform=node --format=esm \
 *         --alias:@=./src --external:mongodb --outfile=.verify/build/check-apply-url-resolution.mjs
 *       then pipe the bundle into the app container (which has MONGODB_URI and node_modules):
 *         docker exec -u 0 -i $CID sh -c 'cat > /app/check.mjs' < .verify/build/check-apply-url-resolution.mjs
 *         docker exec -u 0 -w /app $CID node /app/check.mjs
 */
import { MongoClient } from 'mongodb';
import { detectAtsFromUrl, resolveApplyUrl, isPlaywrightAutomatable } from '@/lib/jobs/autoApplySupport';

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('MONGODB_URI is not set');
  process.exit(2);
}

const NONE = '(none)';

const client = new MongoClient(uri);
await client.connect();
const db = client.db();
const jobs = db.collection('jobs');

const before: Record<string, number> = {};
const after: Record<string, number> = {};
let iterated = 0;

/** Jobs the fix moves from "no ATS resolved" to a type we can actually submit to. */
let unlocked = 0;
const unlockedBy: Record<string, number> = {};
/** Jobs where resolving changes the answer at all. */
let changed = 0;
/** Sanity: jobs that had a usable applyUrl before must keep exactly the same answer. */
let regressions = 0;
const regressionSamples: string[] = [];

for await (const doc of jobs.find({}, { projection: { applyUrl: 1, source: 1 } })) {
  iterated++;

  const rawUrl = typeof doc.applyUrl === 'string' ? doc.applyUrl : null;
  const resolvedUrl = resolveApplyUrl(doc);

  const beforeAts = detectAtsFromUrl(rawUrl) ?? NONE;
  const afterAts = detectAtsFromUrl(resolvedUrl) ?? NONE;

  before[beforeAts] = (before[beforeAts] ?? 0) + 1;
  after[afterAts] = (after[afterAts] ?? 0) + 1;

  if (beforeAts !== afterAts) {
    changed++;
    if (!isPlaywrightAutomatable(beforeAts) && isPlaywrightAutomatable(afterAts)) {
      unlocked++;
      unlockedBy[afterAts] = (unlockedBy[afterAts] ?? 0) + 1;
    }
    // A job that already resolved must not change — the fix only fills a gap.
    if (beforeAts !== NONE && afterAts !== beforeAts) {
      regressions++;
      if (regressionSamples.length < 5) regressionSamples.push(`${rawUrl} -> ${resolvedUrl}`);
    }
  }
}

function report(title: string, dist: Record<string, number>) {
  console.log(`\n--- ${title} ---`);
  for (const [k, v] of Object.entries(dist).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k.padEnd(16)}${String(v).padStart(7)}`);
  }
}

console.log(`jobs iterated: ${iterated}`);
report('ATS resolved BEFORE (raw jobs.applyUrl)', before);
report('ATS resolved AFTER  (resolveApplyUrl)', after);

console.log('\n--- effect ---');
console.log(`  documents whose resolved ATS changed : ${changed}`);
console.log(`  newly auto-applyable (the unlock)    : ${unlocked}`);
for (const [k, v] of Object.entries(unlockedBy).sort((a, b) => b[1] - a[1])) {
  console.log(`      ${k.padEnd(14)}${String(v).padStart(7)}`);
}
console.log(`  regressions (was resolved, now differs): ${regressions}`);
for (const s of regressionSamples) console.log(`      ${s}`);

await client.close();
process.exit(regressions > 0 ? 1 : 0);
