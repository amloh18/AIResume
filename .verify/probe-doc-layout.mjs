// Read-only probe: which documents layout is each user actually on?
// Answers "is the user looking at the 'grid' view or the 'compact' view?" —
// the two are different grid class strings, so editing the wrong one is a no-op.
// Usage: node .verify/probe-doc-layout.mjs
import { readFileSync } from 'node:fs';
import { MongoClient } from 'mongodb';

const env = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
const pick = (k) => (env.match(new RegExp(`^${k}=(.*)$`, 'm')) || [])[1]?.trim();
const uri = pick('MONGODB_URI');
const dbName = pick('MONGODB_DB') || 'airesume';

const client = new MongoClient(uri);
await client.connect();
const db = client.db(dbName);
console.log(`db = ${dbName}`);

const names = (await db.listCollections().toArray()).map((c) => c.name);
console.log(`collections matching /settings|user/: ${names.filter((n) => /setting|user/i.test(n)).join(', ')}`);

const collName = names.find((n) => n === 'usersettings') || names.find((n) => /settings/i.test(n));
if (!collName) {
  console.log('no settings collection found');
  process.exit(0);
}
console.log(`\nusing collection: ${collName}  (count=${await db.collection(collName).estimatedDocumentCount()})`);

const docs = await db
  .collection(collName)
  .find({}, { projection: { userId: 1, preferences: 1, updatedAt: 1 } })
  .limit(20)
  .toArray();

console.log(`\ndocuments: ${docs.length}`);
for (const d of docs) {
  const layout = d?.preferences?.dashboard?.layout;
  console.log(
    `  userId=${String(d.userId).slice(0, 12)}…  dashboard.layout=${JSON.stringify(layout)}  updated=${d.updatedAt?.toISOString?.() || '-'}`
  );
}

// Explicit split, so "0 on grid / 0 on compact" is distinguishable from "no docs".
const agg = await db
  .collection(collName)
  .aggregate([
    { $group: { _id: '$preferences.dashboard.layout', n: { $sum: 1 } } },
    { $sort: { n: -1 } },
  ])
  .toArray();
console.log('\nlayout distribution (undefined = never chose one -> defaults to grid):');
for (const r of agg) console.log(`  ${JSON.stringify(r._id)}: ${r.n}`);

await client.close();
