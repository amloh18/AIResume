// The feashliaa source produces 42,338 of the 48,812 jobs and is documented as a
// "Pre-aggregated multi-ATS cloud sync from GitHub CDN (Workday, Greenhouse, Ashby, Lever…)".
// If those documents carry no applyUrl, `detectAtsFromUrl` can never resolve them and they are
// structurally un-automatable — which would matter far more than any missing adapter.

const J = db.getCollection('jobs');

const nFeash = J.countDocuments({ 'source.primary': 'feashliaa' });
print('feashliaa jobs: ' + nFeash);
print('');

// 1. Which fields do these documents actually carry?
const s = J.findOne({ 'source.primary': 'feashliaa' });
print('--- keys on a sample feashliaa job ---');
print('  ' + (s ? Object.keys(s).sort().join(', ') : '(none)'));
print('');

// 2. Every URL-ish field, and how often it is populated.
const CANDIDATES = [
  'applyUrl', 'url', 'jobUrl', 'applicationUrl', 'externalUrl', 'link', 'job_url',
  'sourceUrl', 'originalUrl', 'postingUrl', 'redirectUrl', 'companyUrl', 'source.url',
  'source.jobUrl', 'metadata.url', 'raw.url',
];
print('--- URL-ish field population (feashliaa only) ---');
for (const f of CANDIDATES) {
  const total = J.countDocuments({ 'source.primary': 'feashliaa', [f]: { $exists: true, $ne: null, $ne: '' } });
  if (total > 0) print('  ' + f.padEnd(20) + total);
}
print('');

// 3. Does ANY feashliaa job resolve to a Workday URL anywhere in the document?
const WD = /myworkdayjobs\.com|myworkdaysite\.com/i;
let workdayHits = 0;
let withAnyUrl = 0;
const samples = [];
for (const d of J.find({ 'source.primary': 'feashliaa' }).toArray()) {
  const flat = JSON.stringify(d);
  if (WD.test(flat)) {
    workdayHits++;
    if (samples.length < 5) {
      samples.push({
        title: d.title,
        applyUrl: d.applyUrl,
        url: d.url,
        jobUrl: d.jobUrl,
        source: d.source,
      });
    }
  }
  if (d.applyUrl) withAnyUrl++;
}
print('feashliaa jobs containing a workday URL ANYWHERE in the doc: ' + workdayHits);
print('feashliaa jobs with a populated applyUrl: ' + withAnyUrl + ' of ' + nFeash);
print('');
print('--- samples ---');
for (const x of samples) print('  ' + JSON.stringify(x));
print('');

// 4. And the same question for bambooHR / paylocity.
for (const [label, re] of [
  ['bamboohr', /bamboohr\.com/i],
  ['paylocity', /paylocity\.com/i],
]) {
  let n = 0;
  for (const d of J.find({ 'source.primary': 'feashliaa' }, { applyUrl: 1, url: 1, jobUrl: 1, title: 1 }).toArray()) {
    if (re.test(JSON.stringify(d))) n++;
  }
  print('feashliaa jobs mentioning ' + label + ': ' + n);
}
