// Does the ingestion side actually produce jobs for the sources it declares as enabled?
// `src/lib/ingestion/engine.ts` declares bamboohr / smartrecruiters / recruitee / personio as
// `enabled: true`, and `INGESTION_SERVICE_SOURCES` lists them. If none appear here, the apply-side
// adapter question is premature — the pipeline that would feed it is silent.

const J = db.getCollection('jobs');

print('--- jobs by source.primary ---');
for (const r of J.aggregate([
  { $group: { _id: { $ifNull: ['$source.primary', '(absent)'] }, n: { $sum: 1 } } },
  { $sort: { n: -1 } },
  { $limit: 25 },
]).toArray()) {
  print('  ' + String(r._id).padEnd(22) + r.n);
}

print('');
print('--- jobs by source (flat string form, if any) ---');
for (const r of J.aggregate([
  { $match: { source: { $type: 'string' } } },
  { $group: { _id: '$source', n: { $sum: 1 } } },
  { $sort: { n: -1 } },
  { $limit: 15 },
]).toArray()) {
  print('  ' + String(r._id).padEnd(22) + r.n);
}

print('');
print('--- the sources the ingestion engine declares enabled ---');
const DECLARED = ['greenhouse', 'lever', 'ashby', 'workable', 'smartrecruiters', 'recruitee', 'personio', 'bamboohr', 'feashliaa'];
for (const s of DECLARED) {
  const n = J.countDocuments({
    $or: [{ 'source.primary': s }, { source: s }, { atsType: s }],
  });
  print('  ' + s.padEnd(22) + n + (n === 0 ? '   <-- declared enabled, produced nothing' : ''));
}
