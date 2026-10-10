/**
 * Public job discovery — unit checks for the projection, query parser and
 * handoff helpers. Run with: `npx tsx tests/verify-public-jobs.ts`.
 *
 * These are the checks that fail loudly if someone later:
 *   - adds a private field to the `jobs` document and assumes it is safe,
 *   - widens the public query surface past its bounds,
 *   - or loosens the open-redirect guard on the Apply handoff.
 *
 * Every assertion here is about a *rule*, not a fixture — the data is synthetic
 * on purpose so the test keeps working as the ingestion schema evolves.
 */
import assert from 'node:assert/strict';
import {
  PUBLIC_JOB_PROJECTION,
  PUBLIC_JOBS_MAX_PAGE_SIZE,
  JOB_SLUG_SUFFIX_LENGTH,
  buildJobSlug,
  parseJobSlugSuffix,
  parsePublicJobQuery,
  toPublicJobSummary,
  toPublicJobDetail,
  escapeRegex,
  htmlToPlainText,
} from '../src/lib/jobs/publicJobView';
import {
  isSafeInternalPath,
  buildPublicJobReturnTo,
  buildPublicApplyHref,
  PUBLIC_HANDOFF_FLAG,
} from '../src/lib/jobs/publicJobHandoff';

let checks = 0;
const ok = (label: string) => {
  checks += 1;
  console.log(`  ok  ${label}`);
};

// ---------------------------------------------------------------------------
// 1. The projection is an ALLOWLIST — private fields must never survive
// ---------------------------------------------------------------------------
{
  const rawJob = {
    _id: '507f1f77bcf86cd799439011',
    canonicalId: 'a'.repeat(64),
    title: 'Senior Frontend Engineer',
    company: { name: 'Acme', logoUrl: 'https://cdn/acme.png', domain: 'acme.com' },
    location: { city: 'Berlin', country: 'Germany', countryCode: 'DE', remote: false },
    employmentType: 'full_time',
    salary: { min: 80000, max: 110000, currency: 'EUR', period: 'year' },
    skills: ['React', 'TypeScript'],
    status: 'active',
    postedAt: new Date('2026-10-01T00:00:00Z'),
    atsType: 'greenhouse',
    source: { primary: 'greenhouse', sourceUrl: 'https://acme.com/jobs/1' },
    applyUrl: 'https://acme.com/apply/1',
    description: '<p>Build <b>things</b>.</p><ul><li>Ship features</li></ul>',
    descriptionText: 'Build things. Ship features',
    // ── everything below is user-scoped or internal and must NOT leak ──
    userId: 'user-secret-123',
    matchScore: 94,
    matchBreakdown: { role: 0.9 },
    savedBy: ['user-secret-123'],
    applicationId: 'app-secret-1',
    internalNotes: 'recruiter is a friend',
    sourceMetadata: { apiKey: 'sk-live-do-not-leak' },
    ingestionRunId: 'run-42',
    rawPayload: { cookie: 'session=abc' },
  };

  const summary = toPublicJobSummary(rawJob) as Record<string, any>;
  const detail = toPublicJobDetail(rawJob) as Record<string, any>;

  const forbidden = [
    'userId',
    'matchScore',
    'matchBreakdown',
    'savedBy',
    'applicationId',
    'internalNotes',
    'sourceMetadata',
    'ingestionRunId',
    'rawPayload',
    '_id',
  ];
  for (const key of forbidden) {
    assert.ok(!(key in summary), `public summary must not expose "${key}"`);
    assert.ok(!(key in detail), `public detail must not expose "${key}"`);
  }
  ok('projection drops every private/internal field (summary + detail)');

  // A serialised copy must not contain the secrets either — catches a nested leak.
  const serialised = JSON.stringify(detail);
  assert.ok(!serialised.includes('sk-live-do-not-leak'), 'api key leaked into public payload');
  assert.ok(!serialised.includes('user-secret-123'), 'user id leaked into public payload');
  assert.ok(!serialised.includes('session=abc'), 'raw payload leaked into public payload');
  ok('serialised public detail contains no credential or user identifier');

  // The projection itself must not name a private field.
  const projectionKeys = Object.keys(PUBLIC_JOB_PROJECTION);
  for (const key of ['userId', 'matchScore', 'savedBy', 'sourceMetadata', 'rawPayload']) {
    assert.ok(!projectionKeys.includes(key), `PUBLIC_JOB_PROJECTION must not include "${key}"`);
  }
  ok('PUBLIC_JOB_PROJECTION is free of private fields');

  // And it must actually describe the fields the projection relies on.
  assert.equal(summary.id, '507f1f77bcf86cd799439011');
  assert.equal(summary.company.name, 'Acme');
  assert.equal(summary.location.label, 'Berlin, Germany');
  assert.equal(summary.location.remote, false);
  assert.equal(summary.salary?.min, 80000);
  assert.equal(summary.openForApplication, true);
  assert.equal(summary.applyUrl, 'https://acme.com/apply/1');
  ok('public summary carries the fields the UI renders');
}

// ---------------------------------------------------------------------------
// 2. Closed listings are flagged, never silently presented as open
// ---------------------------------------------------------------------------
{
  const closed = toPublicJobSummary({ title: 'Old role', company: { name: 'X' }, status: 'expired' });
  assert.equal(closed.openForApplication, false);
  ok('a non-active status sets openForApplication=false');

  const legacy = toPublicJobSummary({ title: 'Legacy', company: { name: 'X' } });
  assert.equal(legacy.openForApplication, true, 'rows without a status field are treated as open');
  ok('a legacy row with no status defaults to open');
}

// ---------------------------------------------------------------------------
// 3. Query parser — bounds, escaping, sort allowlist
// ---------------------------------------------------------------------------
{
  const parsed = parsePublicJobQuery(new URLSearchParams(''));
  assert.equal(parsed.page, 1);
  assert.equal(parsed.pageSize, 20);
  assert.deepEqual(parsed.sort, { postedAt: -1, firstSeenAt: -1 });
  // Status scoping is unconditional — a public search can never see non-active jobs.
  assert.deepEqual(parsed.filter, { status: { $in: ['active', 'new'] } });
  ok('empty query → page 1, newest-first, status-scoped');

  const huge = parsePublicJobQuery(new URLSearchParams('pageSize=100000&page=-5'));
  assert.equal(huge.pageSize, PUBLIC_JOBS_MAX_PAGE_SIZE);
  assert.equal(huge.page, 1);
  ok(`page size is capped at ${PUBLIC_JOBS_MAX_PAGE_SIZE} and page cannot go below 1`);

  // ReDoS / injection: the raw pattern must never reach the driver unescaped.
  const hostile = parsePublicJobQuery(new URLSearchParams('q=.*.*.*.*'));
  const serialisedFilter = JSON.stringify(hostile.filter);
  assert.ok(serialisedFilter.includes('\\\\.'), 'regex metacharacters were not escaped');
  assert.ok(!serialisedFilter.includes('"$regex":".*.*.*.*"'), 'raw pattern reached the query');
  ok('search terms are regex-escaped before they reach MongoDB');

  assert.equal(escapeRegex('a.b*c(d)'), 'a\\.b\\*c\\(d\\)');
  ok('escapeRegex escapes the full metacharacter set');

  // Sort is an allowlist; anything unknown degrades to newest.
  const badSort = parsePublicJobQuery(new URLSearchParams('sort=postedAt;db.dropDatabase()'));
  assert.deepEqual(badSort.sort, { postedAt: -1, firstSeenAt: -1 });
  assert.equal(badSort.normalized.sort, 'recent');
  const salarySort = parsePublicJobQuery(new URLSearchParams('sort=salary'));
  assert.deepEqual(salarySort.sort, { 'salary.max': -1, postedAt: -1 });
  ok('sort is restricted to the supported keys');

  // Remote / source / date filters produce scoped clauses, not "match everything".
  const remote = parsePublicJobQuery(new URLSearchParams('workplaceType=remote'));
  assert.ok(JSON.stringify(remote.filter).includes('"location.remote":true'));
  const sourced = parsePublicJobQuery(new URLSearchParams('source=naukri'));
  const srcFilter = JSON.stringify(sourced.filter);
  assert.ok(srcFilter.includes('"atsType":"naukri"') && srcFilter.includes('"source.primary":"naukri"'));
  ok('workplace and source filters are applied as scoped clauses');

  const dated = parsePublicJobQuery(new URLSearchParams('datePosted=24h'));
  assert.ok(JSON.stringify(dated.filter).includes('$gte'));
  const bogusDate = parsePublicJobQuery(new URLSearchParams('datePosted=9999y'));
  assert.ok(!JSON.stringify(bogusDate.filter).includes('$gte'), 'an unknown date window must be ignored');
  ok('posting-date window is validated');
}

// ---------------------------------------------------------------------------
// 4. HTML → plain text (description rendering)
// ---------------------------------------------------------------------------
{
  assert.equal(htmlToPlainText('<p>Hello &amp; welcome</p><ul><li>One</li></ul>'), 'Hello & welcome\n• One');
  ok('htmlToPlainText strips tags and decodes entities');
}

// ---------------------------------------------------------------------------
// 5. Handoff — open-redirect guard + destination preservation
// ---------------------------------------------------------------------------
{
  assert.equal(isSafeInternalPath('/dashboard/jobs?tab=applications'), true);
  assert.equal(isSafeInternalPath('//evil.com'), false);
  assert.equal(isSafeInternalPath('/\\evil.com'), false);
  assert.equal(isSafeInternalPath('https://evil.com'), false);
  assert.equal(isSafeInternalPath('http://evil.com/x'), false);
  assert.equal(isSafeInternalPath('javascript:alert(1)'), false);
  assert.equal(isSafeInternalPath('dashboard/jobs'), false);
  assert.equal(isSafeInternalPath(''), false);
  assert.equal(isSafeInternalPath(null), false);
  assert.equal(isSafeInternalPath(123 as any), false);
  ok('return destinations must be internal relative paths');

  const canonicalId = 'f'.repeat(64);
  const returnTo = buildPublicJobReturnTo(canonicalId);
  assert.ok(returnTo, 'a valid canonical id must produce a destination');
  assert.equal(isSafeInternalPath(returnTo), true);
  assert.ok(returnTo!.includes(`jobId=${canonicalId}`), 'the selected job must be preserved');
  assert.ok(returnTo!.includes(`${PUBLIC_HANDOFF_FLAG}=1`), 'the handoff flag must be present');
  assert.ok(returnTo!.startsWith('/dashboard/jobs'), 'must land in the authenticated Jobs Hub');
  ok('Apply preserves the canonical job id into the Jobs Hub');

  // A hostile "id" must never be echoed into a URL.
  assert.equal(buildPublicJobReturnTo('../../etc/passwd'), null);
  assert.equal(buildPublicJobReturnTo('a b'), null);
  assert.equal(buildPublicJobReturnTo('x'.repeat(200)), null);
  assert.equal(buildPublicJobReturnTo(''), null);
  ok('an unusable job id yields no destination');

  const applyHref = buildPublicApplyHref(canonicalId);
  assert.ok(applyHref.startsWith('/sign-in?callbackUrl='), 'Apply must use the existing sign-in flow');
  const decoded = decodeURIComponent(applyHref.split('callbackUrl=')[1]);
  assert.equal(decoded, returnTo);
  assert.equal(isSafeInternalPath(decoded), true);
  ok('Apply href round-trips a validated internal destination');

  assert.equal(buildPublicApplyHref('../../evil'), '/sign-in');
  ok('an invalid id degrades to a bare sign-in, never a broken redirect');
}

// ---------------------------------------------------------------------------
// 6. Readable slug — derived from the listing, reversible to a lookup anchor
// ---------------------------------------------------------------------------
// The public url is `/explore/jobs/<slug>`. These checks pin the three
// properties that make that safe:
//   - the slug is READABLE and URL-safe (that is the whole point of the change),
//   - it is REVERSIBLE — the trailing hex block is a prefix of `canonicalId`, so
//     a slug can be looked up without a stored slug column, and
//   - it is NEVER confusable with a legacy canonicalId/ObjectId, because the
//     detail page redirects anything that is not already the slug. If a legacy
//     id parsed as a slug, a slug url would redirect to itself and loop.
{
  const canonicalId = '4f2a1b3c' + 'd'.repeat(56);

  // --- shape -----------------------------------------------------------------
  const slug = buildJobSlug({
    title: 'Senior Product Designer',
    company: { name: 'Linear' },
    canonicalId,
  });
  assert.equal(slug, 'senior-product-designer-linear-4f2a1b3c');
  assert.ok(!slug.includes(canonicalId), 'the slug must not embed the full sha256');
  assert.ok(slug.length < 100, 'a readable slug must stay short enough to read');
  ok('buildJobSlug produces `title-company-<anchor>` from the listing');

  // --- URL hygiene -----------------------------------------------------------
  const messy = buildJobSlug({
    title: 'Ingénieur & Développeur C++',
    company: { name: 'Zürich Labs' },
    canonicalId,
  });
  assert.equal(messy, 'ingenieur-and-developpeur-c-zurich-labs-4f2a1b3c');
  ok('accents fold, `&` becomes `and`, and punctuation collapses to a dash');

  // --- reversibility ---------------------------------------------------------
  assert.equal(
    parseJobSlugSuffix(slug),
    canonicalId.slice(0, JOB_SLUG_SUFFIX_LENGTH),
    'the anchor must be recoverable from the slug alone'
  );
  ok('the lookup anchor is recoverable from the slug alone');

  // ⚠️ LOOP PREVENTION — a legacy identifier must NOT look like a slug.
  assert.equal(parseJobSlugSuffix(canonicalId), null, 'a sha256 canonicalId must not parse as a slug');
  assert.equal(
    parseJobSlugSuffix('507f1f77bcf86cd799439011'),
    null,
    'an ObjectId must not parse as a slug'
  );
  ok('legacy canonicalIds and ObjectIds never parse as slugs (no redirect loop)');

  // Non-slug junk resolves to nothing, so it 404s instead of scanning.
  for (const junk of ['', 'nope-xyz', 'a'.repeat(300), '-4f2a1b3', 'no-dashes-here']) {
    assert.equal(parseJobSlugSuffix(junk), null, `"${junk}" must not parse as a slug`);
  }
  ok('non-slug segments yield no anchor, so they 404 rather than scan');

  // --- determinism + collision resistance -----------------------------------
  const again = buildJobSlug({ title: 'Senior Product Designer', company: { name: 'Linear' }, canonicalId });
  assert.equal(again, slug, 'the same listing must always produce the same slug');
  ok('the slug is deterministic');

  // Identical words, different listings → different slugs. The anchor is what
  // separates two genuinely distinct jobs that happen to share a title.
  const twinA = buildJobSlug({ title: 'Designer', company: { name: 'Acme' }, canonicalId: 'aaaa1111' + '0'.repeat(56) });
  const twinB = buildJobSlug({ title: 'Designer', company: { name: 'Acme' }, canonicalId: 'bbbb2222' + '0'.repeat(56) });
  assert.notEqual(twinA, twinB);
  assert.notEqual(parseJobSlugSuffix(twinA), parseJobSlugSuffix(twinB));
  ok('two listings sharing a title and company still get distinct slugs');

  // --- degenerate documents --------------------------------------------------
  // No canonicalId → fall back to `_id`, which is always present.
  const idOnly = buildJobSlug({ title: 'Engineer', company: { name: 'X' }, _id: '507f1f77bcf86cd799439011' });
  assert.ok(idOnly.endsWith('-507f1f77'), `expected an _id anchor, got "${idOnly}"`);
  assert.equal(parseJobSlugSuffix(idOnly), '507f1f77');
  ok('a row with no canonicalId falls back to its _id as the anchor');

  // Nothing readable at all → still a valid, resolvable slug.
  const bare = buildJobSlug({ canonicalId });
  assert.equal(bare, `job-${canonicalId.slice(0, JOB_SLUG_SUFFIX_LENGTH)}`);
  assert.equal(parseJobSlugSuffix(bare), canonicalId.slice(0, JOB_SLUG_SUFFIX_LENGTH));
  ok('a listing with no title or company still produces a resolvable slug');

  // --- length cap ------------------------------------------------------------
  // A 200-character title must not become a 200-character url, and the cut must
  // never leave a trailing dash (which would break the `-<anchor>` shape).
  const longTitle = buildJobSlug({ title: 'x'.repeat(200), company: { name: 'Y' }, canonicalId });
  assert.ok(longTitle.length <= 72 + 1 + JOB_SLUG_SUFFIX_LENGTH, `slug too long: ${longTitle.length}`);
  assert.equal(parseJobSlugSuffix(longTitle), canonicalId.slice(0, JOB_SLUG_SUFFIX_LENGTH));

  // Boundary: the cap lands exactly on the joining dash.
  const dashEdge = buildJobSlug({ title: 'a'.repeat(71), company: { name: 'B' }, canonicalId });
  assert.ok(!dashEdge.includes('--'), `slug must not contain a double dash: "${dashEdge}"`);
  assert.equal(parseJobSlugSuffix(dashEdge), canonicalId.slice(0, JOB_SLUG_SUFFIX_LENGTH));
  ok('an over-long title is capped, and the cut never leaves a broken anchor');

  // Every slug produced above must be safe as a path segment with no escaping.
  for (const candidate of [slug, messy, twinA, twinB, idOnly, bare, longTitle, dashEdge]) {
    assert.match(candidate, /^[a-z0-9-]+$/, `"${candidate}" is not a safe path segment`);
    assert.ok(!candidate.startsWith('-') && !candidate.endsWith('-'), `"${candidate}" has a stray dash`);
    assert.ok(!candidate.includes('--'), `"${candidate}" has a double dash`);
  }
  ok('every generated slug is a safe, unescaped path segment');

  // --- the projection actually serves the slug -------------------------------
  const summary = toPublicJobSummary({
    _id: '507f1f77bcf86cd799439011',
    canonicalId,
    title: 'Senior Product Designer',
    company: { name: 'Linear' },
  });
  assert.equal(summary.slug, 'senior-product-designer-linear-4f2a1b3c');
  assert.notEqual(summary.slug, summary.canonicalId, 'the public slug must not be the raw hash');
  assert.equal(parseJobSlugSuffix(summary.slug), summary.canonicalId.slice(0, JOB_SLUG_SUFFIX_LENGTH));
  ok('toPublicJobSummary emits the readable slug, not the hash');
}

console.log(`\npublic-jobs: ${checks} checks passed`);
