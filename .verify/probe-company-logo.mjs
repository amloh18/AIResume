// Read-only probe: is `companyLogo` actually populated, and for which records?
// Answers "will the job-detail sidebar show a real logo, or fall back to initials?"
// Usage: node .verify/probe-company-logo.mjs ["<title regex>"] ["<company regex>"]
import { readFileSync } from 'node:fs';
import { MongoClient } from 'mongodb';

const env = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
const pick = (k) => (env.match(new RegExp(`^${k}=(.*)$`, 'm')) || [])[1]?.trim();
const uri = pick('MONGODB_URI');
const dbName = pick('MONGODB_DB') || 'airesume';

const title = process.argv[2] || 'Principal Data Engineer';
const company = process.argv[3] || 'svb';

const client = new MongoClient(uri);
await client.connect();
const db = client.db(dbName);
console.log(`db = ${dbName}`);

const hasLogo = { companyLogo: { $exists: true, $nin: [null, ''] } };

for (const name of ['jobapplications', 'jobs', 'applicationunified']) {
  let total = 0;
  let withLogo = 0;
  let coll;
  try {
    coll = db.collection(name);
    total = await coll.estimatedDocumentCount();
    withLogo = await coll.countDocuments(hasLogo);
  } catch (e) {
    console.log(`\n=== ${name} === (unavailable: ${e.message})`);
    continue;
  }
  const pct = total ? ((withLogo / total) * 100).toFixed(1) : '0.0';
  console.log(`\n=== ${name} ===`);
  console.log(`  total=${total}  withCompanyLogo=${withLogo}  (${pct}%)`);

  const sample = await coll
    .find(hasLogo, { projection: { company: 1, jobTitle: 1, companyLogo: 1 } })
    .limit(5)
    .toArray();
  for (const s of sample) {
    console.log(`   • ${s.company ?? '?'} / ${s.jobTitle ?? '?'} → ${s.companyLogo}`);
  }
}

console.log(`\n=== target: title~/${title}/ company~/${company}/ ===`);
for (const name of ['jobapplications', 'jobs']) {
  const rows = await db
    .collection(name)
    .find(
      { jobTitle: { $regex: title, $options: 'i' }, company: { $regex: company, $options: 'i' } },
      { projection: { company: 1, jobTitle: 1, companyLogo: 1, updatedAt: 1 } }
    )
    .limit(10)
    .toArray();
  console.log(`  [${name}] matches=${rows.length}`);
  for (const r of rows) {
    console.log(`   • _id=${String(r._id)} company=${JSON.stringify(r.company)} logo=${JSON.stringify(r.companyLogo ?? null)}`);
  }
}

await client.close();
