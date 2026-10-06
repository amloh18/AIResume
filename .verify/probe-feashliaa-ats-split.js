// The feashliaa source is a pre-aggregated multi-ATS sync. Its jobs carry the real form URL at
// `source.applicationUrl`, which the discover response never forwards and the client never posts.
//
// If a meaningful share of those 42,338 jobs sits on an ATS we ALREADY automate, then fixing the
// URL resolution alone unlocks auto-apply for them — no new adapter required. That is the number
// that decides whether the adapter work is the priority.

const J = db.getCollection('jobs');

const PATTERNS = [
  ['greenhouse', /greenhouse\.io|grnh\.se|gh_jid=/i],
  ['lever', /lever\.co|lever-origins?=/i],
  ['ashby', /ashbyhq\.com|ashby_jid=/i],
  ['workable', /workable\.com/i],
  ['workday', /myworkdayjobs\.com|myworkdaysite\.com/i],
  ['icims', /icims\.com/i],
  ['smartrecruiters', /smartrecruiters\.com/i],
  ['successfactors', /successfactors\.com|sapsf\./i],
  ['taleo', /taleo\.net/i],
  ['bamboohr', /bamboohr\.com/i],
  ['paylocity', /paylocity\.com/i],
];
const AUTOMATABLE = ['greenhouse', 'lever', 'ashby', 'workable'];

const counts = {};
let noUrl = 0;
let other = 0;
const otherHosts = new Map();

for (const d of J.find({ 'source.primary': 'feashliaa' }, { 'source.applicationUrl': 1 }).toArray()) {
  const u = String(d?.source?.applicationUrl || '');
  if (!u) {
    noUrl++;
    continue;
  }
  const hit = PATTERNS.find(([, re]) => re.test(u));
  if (!hit) {
    other++;
    let h = '(unparseable)';
    try { h = new URL(u).hostname.toLowerCase(); } catch { /* keep */ }
    otherHosts.set(h, (otherHosts.get(h) || 0) + 1);
    continue;
  }
  counts[hit[0]] = (counts[hit[0]] || 0) + 1;
}

print('--- feashliaa source.applicationUrl, resolved by ATS ---');
let automatableTotal = 0;
for (const [k, v] of Object.entries(counts).sort((a, b) => b[1] - a[1])) {
  const auto = AUTOMATABLE.includes(k);
  if (auto) automatableTotal += v;
  print('  ' + k.padEnd(18) + String(v).padStart(6) + (auto ? '   <-- ALREADY automatable' : ''));
}
print('  ' + '(no applicationUrl)'.padEnd(18) + String(noUrl).padStart(6));
print('  ' + '(unrecognised host)'.padEnd(18) + String(other).padStart(6));
print('');
print('>>> jobs unlocked by fixing URL resolution ALONE: ' + automatableTotal);
print('>>> jobs still needing a NEW adapter:          ' + (Object.entries(counts)
  .filter(([k]) => !AUTOMATABLE.includes(k))
  .reduce((s, [, v]) => s + v, 0)));
print('');
print('--- top unrecognised hosts among feashliaa jobs ---');
for (const [h, n] of [...otherHosts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15)) {
  print('  ' + String(n).padStart(6) + '  ' + h);
}
