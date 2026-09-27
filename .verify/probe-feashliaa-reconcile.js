// Settle the disagreement between the two earlier probes.
//
//   probe-feashliaa-shape.js    matched /myworkdayjobs/ against JSON.stringify(wholeDoc)  -> 25,584
//   probe-feashliaa-ats-split.js matched it against source.applicationUrl only            -> 0
//
// The first is almost certainly matching Workday links inside `description` text. This probe
// separates the two sources of truth and prints every total, so the arithmetic has to add up.

const J = db.getCollection('jobs');

const FEASH = { 'source.primary': 'feashliaa' };
const TOTAL = J.countDocuments(FEASH);
print('feashliaa countDocuments: ' + TOTAL);
print('');

const WD = /myworkdayjobs\.com|myworkdaysite\.com/i;

let hasAppUrl = 0;
let appUrlIsWorkday = 0;
let descHasWorkday = 0;
let descHasWorkdayButNoAppUrl = 0;
let appUrlWorkdayAndDescWorkday = 0;

const cursor = J.find(FEASH, { 'source.applicationUrl': 1, description: 1, descriptionText: 1 });
let iterated = 0;
for (const d of cursor) {
  iterated++;
  const appUrl = String(d?.source?.applicationUrl || '');
  const desc = String(d?.description || '') + String(d?.descriptionText || '');
  const a = WD.test(appUrl);
  const b = WD.test(desc);
  if (appUrl) hasAppUrl++;
  if (a) appUrlIsWorkday++;
  if (b) descHasWorkday++;
  if (b && !appUrl) descHasWorkdayButNoAppUrl++;
  if (a && b) appUrlWorkdayAndDescWorkday++;
}
print('iterated (must equal the count above): ' + iterated);
print('');
print('  source.applicationUrl populated:              ' + hasAppUrl);
print('  source.applicationUrl IS a workday URL:       ' + appUrlIsWorkday);
print('  description/descriptionText mentions workday: ' + descHasWorkday);
print('  ...of those, applicationUrl is EMPTY:         ' + descHasWorkdayButNoAppUrl);
print('  both:                                         ' + appUrlWorkdayAndDescWorkday);
print('');

// And the thing that actually matters: what does the client end up posting?
// `jobs.applyUrl` is what the three call sites read.
print('--- jobs.applyUrl on feashliaa jobs (what the client posts) ---');
print('  populated: ' + J.countDocuments({ ...FEASH, applyUrl: { $type: 'string', $ne: '' } }));
print('  absent/empty: ' + J.countDocuments({ ...FEASH, $or: [{ applyUrl: { $exists: false } }, { applyUrl: '' }] }));
print('');

// Full-corpus workday count, whichever field holds it.
print('--- corpus-wide workday URLs (any of the three fields) ---');
print('  applyUrl is workday:                ' + J.countDocuments({ applyUrl: WD }));
print('  source.applicationUrl is workday:   ' + J.countDocuments({ 'source.applicationUrl': WD }));
