// What are the 211 jobs whose applyUrl matches no ATS we know?
// The answer decides which adapter is worth building — building one for a host with zero
// jobs would be work with no user-visible effect.

const J = db.getCollection('jobs');

const KNOWN = [
  ['greenhouse', /greenhouse\.io|grnh\.se|gh_jid=/],
  ['lever', /lever\.co|lever-origins?=/],
  ['ashby', /ashbyhq\.com|ashby_jid=/],
  ['workable', /workable\.com/],
  ['workday', /myworkdayjobs\.com|myworkdaysite\.com/],
  ['naukri', /naukri\.com/],
  ['indeed', /indeed\./],
  ['adzuna', /adzuna\./],
];

const AUTOMATABLE = ['greenhouse', 'lever', 'ashby', 'workable'];

const hosts = new Map();
for (const d of J.find({ applyUrl: { $type: 'string', $ne: '' } }, { applyUrl: 1 }).toArray()) {
  const u = String(d.applyUrl);
  let host = '(unparseable)';
  try {
    host = new URL(u).hostname.toLowerCase();
  } catch {
    /* keep the placeholder */
  }
  const hit = KNOWN.find(([, re]) => re.test(u));
  const key = (hit ? hit[0] : 'UNKNOWN') + '\t' + host;
  hosts.set(key, (hosts.get(key) || 0) + 1);
}

print('--- applyUrl hosts, grouped by detection (top 40) ---');
const rows = [...hosts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 40);
for (const [k, n] of rows) {
  const [det, host] = k.split('\t');
  const mark = det === 'UNKNOWN' ? '  <-- no adapter' : AUTOMATABLE.includes(det) ? '' : '  (detected, not automatable)';
  print('  ' + String(n).padStart(5) + '  ' + det.padEnd(16) + host + mark);
}

print('');
print('--- UNKNOWN hosts only, full list ---');
const unknown = [...hosts.entries()]
  .filter(([k]) => k.startsWith('UNKNOWN\t'))
  .sort((a, b) => b[1] - a[1]);
print('  distinct unknown hosts: ' + unknown.length);
print('  jobs affected: ' + unknown.reduce((s, [, n]) => s + n, 0));
for (const [k, n] of unknown) print('  ' + String(n).padStart(5) + '  ' + k.split('\t')[1]);
