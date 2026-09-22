// Read-only probe: what does the DB actually say about documents for a given job?
// Usage: node .verify/probe-journey-docs.mjs "<title regex>" "<company regex>"
import { readFileSync } from 'node:fs';
import { MongoClient } from 'mongodb';

const env = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
const pick = (k) => (env.match(new RegExp(`^${k}=(.*)$`, 'm')) || [])[1]?.trim();
const uri = pick('MONGODB_URI');
const dbName = pick('MONGODB_DB') || 'airesume';

const title = process.argv[2] || 'Data Entry Specialist';
const company = process.argv[3] || 'SupportYourApp';

const client = new MongoClient(uri);
await client.connect();
const db = client.db(dbName);
console.log(`db = ${dbName}`);

const jobs = await db
  .collection('jobapplications')
  .find({ jobTitle: { $regex: title, $options: 'i' }, company: { $regex: company, $options: 'i' } })
  .toArray();

console.log(`\n=== JobApplication matches: ${jobs.length} ===`);
for (const j of jobs) {
  console.log({
    _id: String(j._id),
    jobTitle: j.jobTitle,
    company: j.company,
    status: j.status,
    cvId: j.cvId ?? null,
    coverLetterId: j.coverLetterId ?? null,
    atsScore: j.atsScore ?? null,
    journeyId: j.journeyId ?? null,
    updatedAt: j.updatedAt,
    statusHistory: (j.statusHistory || []).map((h) => `${h.status}@${h.changedAt?.toISOString?.() || h.changedAt}`),
  });
}

const jobIds = jobs.map((j) => String(j._id));
const userIds = [...new Set(jobs.map((j) => String(j.userId)))];

const journeys = await db
  .collection('applicationjourneys')
  .find({ $or: [{ jobId: { $in: jobIds } }, { userId: { $in: userIds } }] })
  .sort({ updatedAt: -1 })
  .toArray();

console.log(`\n=== ApplicationJourney rows for these users: ${journeys.length} ===`);
for (const jy of journeys) {
  const isTarget = jobIds.includes(String(jy.jobId));
  console.log({
    target: isTarget,
    _id: String(jy._id),
    jobId: String(jy.jobId),
    jobIdType: typeof jy.jobId,
    jobTitle: jy.jobTitle,
    status: jy.status,
    cvId: jy.cvId ?? null,
    coverLetterId: jy.coverLetterId ?? null,
    updatedAt: jy.updatedAt,
  });
}

// How many journeys does each user have in total? (/api/journeys hard-caps at 50.)
for (const u of userIds) {
  const total = await db.collection('applicationjourneys').countDocuments({ userId: u });
  console.log(`\nuserId ${u} → total journeys = ${total} (API returns at most 50)`);
  const docs = await db
    .collection('cvs')
    .countDocuments({ userId: u });
  const cls = await db.collection('coverletters').countDocuments({ userId: u });
  console.log(`   cvs=${docs} coverletters=${cls}`);
}

await client.close();
