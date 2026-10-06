// ATS coverage probe — how many live jobs sit behind each ATS, and how many of those the
// platform can actually auto-apply to today.
//
// Reads only. Run as a mongosh script inside the `mongodb` container:
//   ssh … 'docker exec -i mongodb mongosh "$MONGODB_URI" --quiet' < .verify/probe-ats-coverage.js

const J = db.getCollection('jobs');
const A = db.getCollection('jobapplications');

print('jobs total: ' + J.countDocuments({}));
print('jobapplications total: ' + A.countDocuments({}));
print('');

// ── 1. What field holds the apply URL? Sample and report, so a wrong guess is visible. ──
const sample = J.findOne({}, { applyUrl: 1, url: 1, jobUrl: 1, atsType: 1, source: 1, title: 1 });
print('sample job keys: ' + (sample ? Object.keys(sample).join(', ') : '(none)'));
print('');

const URL_FIELDS = ['applyUrl', 'url', 'jobUrl'];

function byHost(field, patterns) {
  print('--- jobs.' + field + ' host match ---');
  for (const [label, re] of patterns) {
    const n = J.countDocuments({ [field]: { $regex: re, $options: 'i' } });
    print('  ' + label.padEnd(16) + n);
  }
  const known = patterns.map(([, re]) => re);
  const total = J.countDocuments({ [field]: { $type: 'string', $ne: '' } });
  print('  ' + '(any string)'.padEnd(16) + total);
  print('');
}

// Host patterns mirror `detectAtsFromUrl` (src/lib/jobs/autoApplySupport.ts) so the counts
// line up with what the code would actually detect.
const PATTERNS = [
  ['greenhouse', 'greenhouse\\.io|grnh\\.se|gh_jid='],
  ['lever', 'lever\\.co|lever-origins?='],
  ['ashby', 'ashbyhq\\.com|ashby_jid='],
  ['workable', 'workable\\.com'],
  ['workday', 'myworkdayjobs\\.com|myworkdaysite\\.com'],
  ['bamboohr', 'bamboohr\\.com'],
  ['paylocity', 'paylocity\\.com|recruiting\\.paylocity'],
  ['icims', 'icims\\.com'],
  ['smartrecruiters', 'smartrecruiters\\.com'],
  ['successfactors', 'successfactors\\.com|sapsf\\.'],
  ['taleo', 'taleo\\.net'],
];

for (const f of URL_FIELDS) {
  if (J.countDocuments({ [f]: { $type: 'string', $ne: '' } }) > 0) byHost(f, PATTERNS);
}

// ── 2. What is actually stored on atsType, and what is parked? ──
print('--- jobs.atsType distribution ---');
for (const r of J.aggregate([
  { $group: { _id: { $ifNull: ['$atsType', '(null/absent)'] }, n: { $sum: 1 } } },
  { $sort: { n: -1 } },
  { $limit: 20 },
]).toArray()) {
  print('  ' + String(r._id).padEnd(20) + r.n);
}
print('');

print('--- jobapplications.atsType distribution ---');
for (const r of A.aggregate([
  { $group: { _id: { $ifNull: ['$atsType', '(null/absent)'] }, n: { $sum: 1 } } },
  { $sort: { n: -1 } },
  { $limit: 20 },
]).toArray()) {
  print('  ' + String(r._id).padEnd(20) + r.n);
}
print('');

// ── 3. The number that matters: jobs whose applyUrl is an ATS we cannot submit to. ──
print('--- auto-applyable vs not (by applyUrl host) ---');
const AUTOMATABLE = ['greenhouse', 'lever', 'ashby', 'workable'];
let auto = 0;
let notAuto = 0;
let noUrl = 0;
for (const f of URL_FIELDS) {
  auto = 0;
  notAuto = 0;
  noUrl = 0;
  for (const d of J.find({}, { [f]: 1 }).toArray()) {
    const u = String(d[f] || '');
    if (!u) {
      noUrl++;
      continue;
    }
    const hit = PATTERNS.find(([, re]) => new RegExp(re, 'i').test(u));
    if (hit && AUTOMATABLE.includes(hit[0])) auto++;
    else notAuto++;
  }
  if (auto + notAuto + noUrl === 0) continue;
  print('  ' + f + ':  auto-applyable=' + auto + '  NOT=' + notAuto + '  no-url=' + noUrl);
}
