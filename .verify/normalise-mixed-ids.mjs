#!/usr/bin/env node
/**
 * SB-06 data normalisation — make each `Mixed` id path store ONE BSON shape.
 *
 * Why this exists
 * ---------------
 * `Schema.Types.Mixed` disables Mongoose casting, so a query written for one shape silently misses
 * documents stored in the other. Every query in the tree is now guarded with `mixedIdFilter()`
 * (server_bugs.md SB-06), so nothing is broken *today* — but the guards only help queries that
 * remember to use them. Normalising the data means a future `{ userId: someId }` written without the
 * guard still works, which removes the whole defect class rather than papering over it.
 *
 * Safety
 * ------
 * DRY RUN BY DEFAULT. Nothing is written unless `APPLY=1` is set.
 * Only values that are *exactly* a 24-hex string (or an ObjectId) are touched; anything else is
 * counted and reported, never converted. A conversion is skipped if it would be a no-op.
 *
 * Run inside a container that already has MONGODB_URI and mongoose (the app image):
 *   docker cp .verify/normalise-mixed-ids.mjs <container>:/tmp/ && \
 *   docker exec <container> node /tmp/normalise-mixed-ids.mjs          # dry run
 *   docker exec -e APPLY=1 <container> node /tmp/normalise-mixed-ids.mjs
 */

import mongoose from 'mongoose';

const APPLY = process.env.APPLY === '1';

/**
 * `to` is the canonical shape for the path.
 *
 * `objectId` — the path is `Mixed`, so nothing casts; the ObjectId form is what every guarded query
 *              already prefers.
 * `string`   — the schema declares this path as `String`, so Mongoose casts reads to string and the
 *              string form is the one that matches without a cast. (Normalising these to ObjectId
 *              would fight the schema.)
 */
const TARGETS = [
  // Mixed paths — normalise to ObjectId
  { coll: 'jobapplications', path: 'userId', to: 'objectId' },
  { coll: 'applicationqueues', path: 'userId', to: 'objectId' },
  { coll: 'applicationqueues', path: 'applicationId', to: 'objectId' },
  { coll: 'applicationqueues', path: 'jobId', to: 'objectId' },
  { coll: 'coverletters', path: 'jobId', to: 'objectId' },
  { coll: 'coverletters', path: 'journeyId', to: 'objectId' },
  { coll: 'coverletters', path: 'cvId', to: 'objectId' },
  { coll: 'invoices', path: 'userId', to: 'objectId' },
  { coll: 'communications', path: 'jobId', to: 'objectId' },
  { coll: 'communications', path: 'applicationId', to: 'objectId' },
  { coll: 'usersettings', path: 'userId', to: 'objectId' },
  { coll: 'morichats', path: 'userId', to: 'objectId' },
  { coll: 'morichats', path: 'cvId', to: 'objectId' },
  { coll: 'paymentmethods', path: 'userId', to: 'objectId' },
  { coll: 'applicationevents', path: 'jobId', to: 'objectId' },
  { coll: 'companywatchlists', path: 'userId', to: 'objectId' },
  { coll: 'portalconnections', path: 'userId', to: 'objectId' },
  { coll: 'portaljobsynctasks', path: 'userId', to: 'objectId' },
  { coll: 'portaljobsynctasks', path: 'portalConnectionId', to: 'objectId' },
  { coll: 'autoapplyreservations', path: 'userId', to: 'objectId' },
  { coll: 'autoapplyreservations', path: 'applicationId', to: 'objectId' },
  { coll: 'autoapplyreservations', path: 'journeyId', to: 'objectId' },
  { coll: 'autoapplyreservations', path: 'queueItemId', to: 'objectId' },
  { coll: 'feedbacks', path: 'userId', to: 'objectId' },
  { coll: 'advocates', path: 'userId', to: 'objectId' },
  // String-typed schema paths — normalise to string
  { coll: 'applicationjourneys', path: 'userId', to: 'string' },
];

const HEX24 = /^[0-9a-fA-F]{24}$/;

function classify(value, to) {
  if (value === null || value === undefined) return 'null';
  if (Array.isArray(value)) return 'array';
  if (value instanceof mongoose.Types.ObjectId) return to === 'objectId' ? 'ok' : 'convertible';
  if (typeof value === 'string') {
    if (!HEX24.test(value)) return 'unparseable-string';
    return to === 'string' ? 'ok' : 'convertible';
  }
  if (typeof value === 'object') return 'object';
  return `other:${typeof value}`;
}

function target(value, to) {
  if (to === 'objectId') return new mongoose.Types.ObjectId(String(value));
  return String(value);
}

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('MONGODB_URI is not set — run this inside the app container.');
  process.exit(1);
}

console.log(`mode: ${APPLY ? 'APPLY' : 'DRY RUN'}\n`);
await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
const db = mongoose.connection.db;

let totalConverted = 0;
const problems = [];

for (const { coll, path, to } of TARGETS) {
  const c = db.collection(coll);
  const exists = await c.countDocuments({ [path]: { $exists: true } });
  if (exists === 0) {
    console.log(`${coll}.${path}  — no documents carry this path, skipped`);
    continue;
  }

  const docs = await c.find({ [path]: { $exists: true } }, { projection: { [path]: 1 } }).toArray();
  const buckets = {};
  const convertible = [];
  for (const d of docs) {
    const v = d[path];
    const k = classify(v, to);
    buckets[k] = (buckets[k] || 0) + 1;
    if (k === 'convertible') convertible.push({ _id: d._id, v });
  }

  for (const [k, n] of Object.entries(buckets)) {
    if (k !== 'ok' && k !== 'convertible') {
      problems.push(`${coll}.${path}: ${n} value(s) classified "${k}" — NOT converted`);
    }
  }

  const summary = Object.entries(buckets)
    .map(([k, n]) => `${k}=${n}`)
    .join('  ');
  console.log(`${coll}.${path} -> ${to}   ${summary}`);

  if (convertible.length === 0) continue;

  if (!APPLY) {
    totalConverted += convertible.length;
    continue;
  }

  let done = 0;
  for (const { _id, v } of convertible) {
    const res = await c.updateOne({ _id }, { $set: { [path]: target(v, to) } });
    done += res.modifiedCount;
  }
  totalConverted += done;
  console.log(`   → converted ${done}`);
}

console.log(`\n${APPLY ? 'converted' : 'would convert'}: ${totalConverted}`);
if (problems.length) {
  console.log('\nNOT converted (inspect before trusting the result):');
  for (const p of problems) console.log(`  - ${p}`);
}

await mongoose.disconnect();
