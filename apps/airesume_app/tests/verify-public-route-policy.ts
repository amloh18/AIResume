/**
 * Public-access POLICY checks — the rules that decide what an anonymous visitor
 * can reach, and what stays behind the session. Run with:
 * `npx tsx tests/verify-public-route-policy.ts`.
 *
 * These are source-level assertions on purpose. Middleware behaviour is a
 * property of the route lists, not of a request — and the failure mode we care
 * about ("someone opened `/api/jobs` to make the public page work") is a change
 * to a list, which a request-level test would only catch if it happened to probe
 * the exact path.
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

let checks = 0;
const ok = (label: string) => {
  checks += 1;
  console.log(`  ok  ${label}`);
};

const APP_ROOT = process.cwd();
const read = (...segments: string[]) => {
  const file = join(APP_ROOT, ...segments);
  assert.ok(existsSync(file), `expected ${file} to exist — run this from apps/airesume_app`);
  return readFileSync(file, 'utf8');
};
const exists = (...segments: string[]) => existsSync(join(APP_ROOT, ...segments));

/**
 * Strip comments so a source check cannot be satisfied — or tripped — by prose.
 *
 * Several of these files carry a comment that *names* the pattern being banned
 * (e.g. "do not add `export function generateStaticParams()` here"). Matching the
 * raw file would read that warning as the offence. The `[^:]` guard keeps
 * `https://` from being eaten as a line comment.
 */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

/** Extract the literal array assigned to a `const NAME = [ ... ]` declaration. */
function literalArray(source: string, name: string): string {
  // Tolerates an optional type annotation, e.g. `const navLinks: NavLink[] = [`.
  // NOTE: take the LAST '[' of the match — the first one would be the '[]' of the
  // type annotation, not the array literal.
  const decl = new RegExp(`const\\s+${name}\\s*(?::[^=]*)?=\\s*\\[`).exec(source);
  assert.ok(decl, `could not find \`const ${name} = [\``);
  const open = decl.index + decl[0].lastIndexOf('[');
  const close = source.indexOf('];', open);
  assert.ok(close > open, `could not find the end of \`${name}\``);
  return source.slice(open, close + 1);
}

// ---------------------------------------------------------------------------
// 1. Middleware route policy
// ---------------------------------------------------------------------------
const proxy = read('src', 'proxy.ts');

const protectedRoutes = literalArray(proxy, 'protectedRoutes');
const publicRoutes = literalArray(proxy, 'publicRoutes');

assert.ok(
  publicRoutes.includes("'/explore/jobs'"),
  'the public job hub must be declared in publicRoutes'
);
ok('/explore/jobs is an explicitly declared public route');

assert.ok(
  !protectedRoutes.includes("'/explore'"),
  '/explore must not be a protected prefix — it would take job discovery private'
);
assert.ok(
  protectedRoutes.includes("'/dashboard'"),
  '/dashboard must remain protected — the authenticated Jobs Hub lives there'
);
ok('/dashboard stays protected while /explore stays public');

// API policy: the public job API is opened by the `/api/public` prefix, and the
// authenticated job API is NOT opened.
const publicApiBlock = proxy.slice(proxy.indexOf('const publicApiRoutes'));
const publicApiList = publicApiBlock.slice(0, publicApiBlock.indexOf('];'));
assert.ok(publicApiList.includes("'/api/public'"), "'/api/public' must be an allowed API prefix");
assert.ok(
  !/['"]\/api\/jobs['"]/.test(publicApiList),
  "the authenticated '/api/jobs' API must NOT be on the public allowlist"
);
ok('only /api/public is opened; /api/jobs stays deny-by-default');
assert.ok(proxy.includes('return pass();'), 'middleware still falls through for unmatched routes');
ok('middleware behaviour beyond the lists is unchanged');

// ---------------------------------------------------------------------------
// 2. Public API routes exist, and are session-free / user-data-free
// ---------------------------------------------------------------------------
const listRoute = read('src', 'app', 'api', 'public', 'jobs', 'route.ts');
const detailRoute = read('src', 'app', 'api', 'public', 'jobs', '[id]', 'route.ts');

for (const [name, source] of [
  ['list', listRoute],
  ['detail', detailRoute],
] as const) {
  assert.ok(
    !source.includes('getAuthenticatedUser') && !source.includes('getServerSession'),
    `public ${name} route must not read a session`
  );
  assert.ok(
    !source.includes('JobApplication') && !source.includes('jobapplications'),
    `public ${name} route must not touch application data`
  );
  assert.ok(
    !/searchParams\.get\(\s*['"]userId['"]\s*\)/.test(source),
    `public ${name} route must never accept a caller-supplied userId`
  );
  assert.ok(source.includes('rateLimiter'), `public ${name} route must be rate limited`);
  // The projection is now applied in two legitimate ways: the list route names it
  // directly, while the detail route delegates to the shared resolver — which
  // applies it on every read (asserted in section 8). What must never happen is a
  // read that reaches the collection with no allowlist at all.
  assert.ok(
    source.includes('PUBLIC_JOB_PROJECTION') || source.includes('findPublicJobByIdentifier'),
    `public ${name} route must reach the collection only through PUBLIC_JOB_PROJECTION ` +
      `(directly, or via the shared resolver that applies it)`
  );
}
ok('public job APIs are session-free, user-data-free, rate limited and allowlist-projected');

// ---------------------------------------------------------------------------
// 3. Public pages must not be wrapped in the client auth guard
// ---------------------------------------------------------------------------
const exploreJobsPage = read('src', 'app', 'explore', 'jobs', 'page.tsx');
assert.ok(
  !exploreJobsPage.includes('RouteGuard'),
  '/explore/jobs must not be wrapped in RouteGuard — anonymous visitors must reach it'
);
assert.ok(
  /index:\s*true/.test(exploreJobsPage),
  '/explore/jobs must be indexable (robots.index = true)'
);
ok('/explore/jobs is unguarded and indexable');

const detailPage = read('src', 'app', 'explore', 'jobs', '[id]', 'page.tsx');
assert.ok(!detailPage.includes('RouteGuard'), 'the public job detail must not be guarded');
assert.ok(
  detailPage.includes('JobPosting'),
  'the public job detail must emit structured JobPosting data'
);
assert.ok(
  detailPage.includes('notFound()'),
  'the public job detail must 404 an unknown/unavailable listing'
);

// ⚠️ REGRESSION GUARD — measured on a production `next start` build:
// a `generateStaticParams` that returns `[]` on this route makes Next register it
// as static-with-zero-entries and then 500 EVERY request (digest
// DYNAMIC_SERVER_USAGE), valid ids included — which also swallowed notFound().
// `revalidate` is not the trigger; the empty param list is. Removing the empty
// declaration (keeping `revalidate`) fixed it: /ok and /missing both render.
// The comment block above the config names the variant, so strip comments first —
// otherwise this matches the very warning that forbids the pattern.
assert.ok(
  !/export\s+(?:async\s+)?function\s+generateStaticParams/.test(stripComments(detailPage)),
  'the public job detail must NOT declare generateStaticParams — an empty param list ' +
    'makes Next 500 every request on this route (DYNAMIC_SERVER_USAGE)'
);
ok('public job detail renders server-side with structured data and a not-found state');

// The authenticated hub must keep its guard.
const hubPage = read('src', 'app', 'dashboard', 'jobs', 'page.tsx');
assert.ok(
  hubPage.includes('RouteGuard') && hubPage.includes('requireAuth'),
  'the authenticated Jobs Hub must keep its RouteGuard'
);
ok('the authenticated /dashboard/jobs hub is still guarded');

// ---------------------------------------------------------------------------
// 4. The shared card has a public variant with no user-scoped affordances
// ---------------------------------------------------------------------------
const jobCard = read('src', 'components', 'jobs', 'JobCard.tsx');
assert.ok(jobCard.includes("variant === 'public'"), 'JobCard must support a public variant');
assert.ok(
  jobCard.includes('Apply with AIResume'),
  'the public card must offer the AIResume apply CTA'
);
assert.ok(
  jobCard.includes('isPublic ? null :'),
  'the public card must not pass a jobId to CompanyLogo (it would fire an authenticated PUT)'
);
ok('the shared JobCard renders a public variant that avoids authenticated calls');

// ---------------------------------------------------------------------------
// 5. Portal tabs are gated on a CONNECTED connection, in the search section
// ---------------------------------------------------------------------------
const filtersBar = read('src', 'components', 'dashboard', 'JobsDashboard', 'FiltersBar.tsx');
assert.ok(
  filtersBar.includes('isConnectedState'),
  'portal tabs must be gated on the server-projected connected state'
);
assert.ok(
  filtersBar.includes('connectedPortals') && filtersBar.includes('handleSelectPortal'),
  'portal tabs must render from the connected list'
);
assert.ok(
  filtersBar.includes('Sync Latest Jobs'),
  'the portal tab must expose a "Sync Latest Jobs" action'
);
// The bar must not hard-code the sync endpoint — it calls back into the Hub,
// which owns the fetch. A second copy of the URL here is how the two drift.
assert.ok(
  !/fetch\(\s*[`'"]\/api\/portal-connections/.test(filtersBar),
  'FiltersBar must not call the sync endpoint itself; it must delegate via onSyncPortal'
);
assert.ok(
  filtersBar.includes('portalSource'),
  'the active portal must be tracked in filters so the tab can be highlighted'
);
ok('portal tabs appear only for connected sources, with an inline Sync action');

const jobsDashboard = read('src', 'components', 'dashboard', 'JobsDashboard.tsx');
assert.ok(
  jobsDashboard.includes('portal-connections') && jobsDashboard.includes('/sync'),
  'the Jobs Hub must sync through the existing portal-connections endpoint'
);
assert.ok(
  jobsDashboard.includes('handleSyncPortal'),
  'the Jobs Hub must implement a per-portal sync handler'
);
ok('the Jobs Hub wires the sync button to the existing portal-connections API');

// ---------------------------------------------------------------------------
// 6. The public → authenticated handoff creates nothing before auth
// ---------------------------------------------------------------------------
const handoff = read('src', 'lib', 'jobs', 'publicJobHandoff.ts');
assert.ok(
  handoff.includes('isSafeInternalPath'),
  'the handoff must validate its return destination'
);
const applyButton = read('src', 'components', 'jobs', 'PublicApplyButton.tsx');
assert.ok(
  !applyButton.includes('/api/jobs'),
  'the public Apply button must not call any application API — creation happens post-auth'
);
ok('the public Apply CTA only routes to sign-in; it creates no application');

assert.ok(
  jobsDashboard.includes('fromPublic') && jobsDashboard.includes('/api/public/jobs/'),
  'the authenticated Hub must provision the application from the canonical listing on handoff'
);
assert.ok(
  jobsDashboard.includes('/api/jobs') && jobsDashboard.includes("source: 'discovery'"),
  'the handoff must create the application through the existing POST /api/jobs route'
);
ok('the handoff reuses the existing create-application route (deduped, quota-free)');

// ---------------------------------------------------------------------------
// 7. Landing-page entry point + navbar link for public job discovery
// ---------------------------------------------------------------------------
const landingSection = read('src', 'components', 'landing', 'ExploreJobs.tsx');

// The section must send browsing to the public surface and auto-apply to sign-up,
// because auto-apply consumes the application pipeline and plan quota.
// Count both CTAs: asserting "at least one" would let either one silently drift.
const exploreHrefs = (landingSection.match(/href="\/explore\/jobs"/g) || []).length;
const signUpHrefs = (landingSection.match(/href="\/sign-up"/g) || []).length;
assert.ok(
  exploreHrefs >= 2,
  `both browsing CTAs must link to the public /explore/jobs surface (found ${exploreHrefs})`
);
assert.ok(
  signUpHrefs >= 2,
  `both auto-apply CTAs must route through /sign-up (found ${signUpHrefs})`
);
for (const guarded of ['/dashboard', '/studio', '/profile', '/admin']) {
  assert.ok(
    !landingSection.includes(`href="${guarded}"`),
    `the landing section must not link straight at the authenticated ${guarded} surface`
  );
}
assert.ok(
  !landingSection.includes('fetch(') && !landingSection.includes('useSession'),
  'the landing section must be a static mockup — no API calls, no session reads'
);
ok('the landing Explore Jobs section is a static mockup that splits the auth boundary');

const landingContent = read('src', 'components', 'landing', 'LandingPageContent.tsx');
assert.ok(
  landingContent.includes("import('@/components/landing/ExploreJobs')"),
  'LandingPageContent must lazy-load the ExploreJobs section'
);
{
  const howItWorks = landingContent.indexOf('<HowItWorks />');
  const exploreJobs = landingContent.indexOf('<ExploreJobs />');
  const chromeExtension = landingContent.indexOf('<ChromeExtension />');
  assert.ok(howItWorks >= 0, 'LandingPageContent must still render <HowItWorks />');
  assert.ok(exploreJobs >= 0, 'LandingPageContent must render <ExploreJobs />');
  assert.ok(
    howItWorks < exploreJobs && exploreJobs < chromeExtension,
    'the section must sit between HowItWorks and ChromeExtension'
  );
}
ok('the section is mounted on the landing page between HowItWorks and ChromeExtension');

// --- navbar -----------------------------------------------------------------
const navigation = read('src', 'data', 'navigation.tsx');
const navLinks = literalArray(navigation, 'navLinks');

// A direct top-level entry, so the one public surface is one click from anywhere.
// It is the LAST 'Explore Jobs' in the file (the first is the Products submenu
// entry), and unlike that one it is a bare link: no description, no icon.
const topLevelIdx = navLinks.lastIndexOf("label: 'Explore Jobs'");
assert.ok(topLevelIdx > 0, "navLinks must expose a top-level 'Explore Jobs' entry");
{
  const entry = navLinks.slice(navLinks.lastIndexOf('{', topLevelIdx), navLinks.indexOf('}', topLevelIdx));
  assert.ok(
    entry.includes("href: '/explore/jobs'"),
    "the top-level 'Explore Jobs' entry must point at /explore/jobs"
  );
  assert.ok(
    !entry.includes('submenu') && !entry.includes('description') && !entry.includes('icon'),
    'the top-level Explore Jobs entry must be a direct link, not a dropdown'
  );
  assert.ok(
    entry.includes('ariaLabel'),
    'the top-level Explore Jobs entry must carry an ariaLabel'
  );
}
ok("the navbar has a direct top-level 'Explore Jobs' link to the public surface");

{
  const submenuIdx = navLinks.indexOf("label: 'Explore Jobs'");
  const submenuEntry = navLinks.slice(
    navLinks.lastIndexOf('{', submenuIdx),
    navLinks.indexOf('}', submenuIdx)
  );
  assert.ok(
    submenuIdx > 0 && submenuIdx !== topLevelIdx && submenuEntry.includes("href: '/explore/jobs'"),
    "the Products submenu must also list Explore Jobs, where people look for 'jobs'"
  );
  assert.ok(
    submenuEntry.includes('description') && submenuEntry.includes('icon'),
    'the submenu entry must be the rich variant (description + icon), not a duplicate bare link'
  );
}
ok('Explore Jobs is also discoverable from the Products submenu');

// The link must be a path, not a '#anchor' — CardNav.scrollToSection only routes
// non-hash hrefs, and only anchors are scroll targets.
assert.ok(
  !navLinks.includes("label: 'Explore Jobs',\n    href: '#") &&
    !/label:\s*'Explore Jobs'[^}]*?href:\s*'#/.test(navLinks),
  "the Explore Jobs link must be a route path, not a '#hash' scroll target"
);
ok('the navbar link is a route path, so it navigates instead of scrolling');

// --- width guard for the extra nav item -------------------------------------
// Adding a 5th item overflowed the desktop bar between 769px and ~871px. The
// compaction band below is what keeps the row on one line; if it is removed the
// labels wrap and the row overflows its rounded card.
const cardNavCss = read('src', 'components', 'landing', 'CardNav.css');
assert.ok(
  /@media\s*\(min-width:\s*769px\)\s*and\s*\(max-width:\s*900px\)/.test(cardNavCss),
  'CardNav.css must keep the 769-900px compaction band that the 5th nav item requires'
);
{
  const bandStart = cardNavCss.indexOf('@media (min-width: 769px)');
  const band = cardNavCss.slice(bandStart, cardNavCss.indexOf('}', cardNavCss.indexOf('white-space', bandStart)) + 1);
  assert.ok(
    band.includes('white-space: nowrap'),
    'the compaction band must set white-space: nowrap so a long label can never wrap'
  );
  assert.ok(
    band.includes('gap: 1rem') && band.includes('font-size: 12px'),
    'the compaction band must reuse the same gap/type scale as the 768px breakpoint'
  );
}
ok('CardNav.css keeps the width guard that the 5th nav item depends on');

// The mobile menu renders every navLinks entry, so the new link must not be
// hidden from small screens by being dropdown-only.
const cardNavTsx = read('src', 'components', 'landing', 'CardNav.tsx');
assert.ok(
  cardNavTsx.includes('mobile-menu-content') && cardNavTsx.includes('links.map('),
  'the mobile menu must render every navLinks entry, including the new one'
);
assert.ok(
  cardNavTsx.includes("href.startsWith('#')"),
  'scrollToSection must keep routing non-hash hrefs through the router'
);
ok('the new link also reaches the mobile menu and routes correctly');

// ---------------------------------------------------------------------------
// 8. Readable slug urls — one url per job, no duplicated lookup
// ---------------------------------------------------------------------------
// `/explore/jobs/<sha256>` became `/explore/jobs/<readable-slug>`. Three rules
// keep that honest:
//   - the slug is DERIVED, so no slug column / migration / unique index appears,
//   - exactly ONE resolver answers "which job is this segment?", so the page and
//     the API cannot disagree, and
//   - a legacy hash url permanently redirects to the slug (and a slug url never
//     redirects, or the redirect would loop).
const publicJobView = read('src', 'lib', 'jobs', 'publicJobView.ts');
const jobIdentifier = read('src', 'lib', 'jobs', 'jobIdentifier.ts');

assert.ok(
  !/slug:\s*canonicalId\b/.test(stripComments(publicJobView)),
  'the public slug must be DERIVED (buildJobSlug), not an alias of the canonicalId'
);
assert.ok(
  publicJobView.includes('export function buildJobSlug') &&
    publicJobView.includes('export function parseJobSlugSuffix'),
  'publicJobView must own the slug builders'
);
ok('the public slug is derived by buildJobSlug, not aliased to the hash');

// The anchor must be validated BEFORE it reaches a $regex — a caller-supplied
// pattern must never be compiled.
assert.ok(
  /const suffix = parseJobSlugSuffix\(id\);\s*if \(!suffix\) return null;/.test(jobIdentifier),
  'the slug anchor must be validated by parseJobSlugSuffix and rejected before the $regex'
);
assert.ok(
  jobIdentifier.includes('MAX_SLUG_CANDIDATES'),
  'the slug prefix scan must be bounded so a colliding prefix cannot cause an unbounded read'
);
ok('the slug lookup validates its anchor and bounds the prefix scan');

// The detail route no longer names PUBLIC_JOB_PROJECTION itself — it delegates to
// this resolver. That moves the allowlist guarantee here, so pin it: EVERY read in
// the resolver must carry the projection. A future third lookup added without one
// would leak `userId`/`savedBy`/`sourceMetadata` straight to an anonymous visitor.
{
  // Tolerate a line-wrapped call: `await jobs\n  .find(...)`.
  const readCalls = (jobIdentifier.match(/jobs\s*\.\s*(?:findOne|find)\(/g) || []).length;
  const projectionUses = (jobIdentifier.match(/projection:\s*PUBLIC_JOB_PROJECTION/g) || []).length;
  assert.ok(readCalls >= 2, `expected the resolver to read the collection (found ${readCalls})`);
  assert.equal(
    projectionUses,
    readCalls,
    `every read in the shared resolver must project through PUBLIC_JOB_PROJECTION ` +
      `(${readCalls} reads, ${projectionUses} projections)`
  );
}
ok('every read in the shared resolver is allowlist-projected');

// No stored slug: a `slug` column would need a backfill, and a *unique* slug
// index would re-introduce on the write path the very race that `jobs_canonicalId`
// is deliberately non-unique to avoid.
const ingestionEngine = read('src', 'lib', 'ingestion', 'engine.ts');
assert.ok(
  !/createIndex\(\s*\{\s*slug/.test(stripComments(ingestionEngine)),
  'no slug index may be added — the slug is derived, and a unique slug index would ' +
    'race concurrent upserts exactly like the canonicalId index was designed not to'
);
ok('no slug column or slug index is introduced');

// --- the page -----------------------------------------------------------------
{
  const page = stripComments(detailPage);
  assert.ok(
    page.includes('findPublicJobByIdentifier'),
    'the detail page must resolve through the shared identifier resolver'
  );
  assert.ok(
    !/canonicalId:\s*identifier/.test(page) && !page.includes('new ObjectId('),
    'the detail page must not hand-roll its own canonicalId/ObjectId lookup'
  );
  // ⚠️ WHERE the redirect is thrown matters as much as that it is thrown.
  // Next flushes the <head> as soon as generateMetadata resolves, so a redirect
  // from the page body arrives after the response has started and is degraded to
  // `200 OK` + `<meta http-equiv="refresh">`. Measured on this route. A crawler
  // then never sees a redirect at all — only a duplicate of the slug page.
  {
    const metaStart = page.indexOf('export async function generateMetadata');
    const bodyStart = page.indexOf('export default async function');
    assert.ok(
      metaStart >= 0 && bodyStart > metaStart,
      'could not locate the generateMetadata / page boundary in the detail page'
    );
    const metadataFn = page.slice(metaStart, bodyStart);
    assert.ok(
      /if\s*\(\s*needsRedirect\s*\)\s*permanentRedirect\(/.test(metadataFn),
      'the permanent redirect must be thrown from generateMetadata, guarded by needsRedirect — ' +
        'an unconditional redirect would loop on a slug url, and one thrown from the page body ' +
        'is degraded to a 200 + <meta refresh> that crawlers do not treat as a redirect'
    );
  }
  assert.ok(
    page.includes('`https://buildairesume.com/explore/jobs/${slug}`'),
    'the canonical + OpenGraph url must be the slug url'
  );
  assert.ok(
    !page.includes('/explore/jobs/${job.canonicalId}'),
    'the canonical url must not fall back to the raw hash'
  );
  // The root layout's `title.template` is '%s | AIResume'; appending it here too
  // renders the brand twice in the <title> of every job page.
  assert.ok(
    !/title:\s*['"`][^'"`]*\|\s*AIResume/.test(page),
    'the detail page must not append "| AIResume" itself — the layout title.template already does'
  );
}
ok('the detail page resolves by slug and permanently redirects legacy urls to it');

// --- the API ------------------------------------------------------------------
{
  const route = stripComments(detailRoute);
  assert.ok(
    route.includes('findPublicJobByIdentifier'),
    'the public detail API must use the same resolver as the page'
  );
  assert.ok(
    !route.includes('permanentRedirect') && !route.includes('redirect('),
    'the public detail API must NOT redirect a legacy id — it echoes the canonical slug in the payload'
  );
  assert.ok(
    route.includes('MAX_JOB_IDENTIFIER_LENGTH'),
    'the public detail API must bound the identifier length through the shared constant'
  );
}
ok('the public detail API shares the resolver and never redirects');

// --- the list, the sitemap ----------------------------------------------------
const exploreClient = read('src', 'app', 'explore', 'jobs', 'ExploreJobsClient.tsx');
assert.ok(
  exploreClient.includes('`/explore/jobs/${encodeURIComponent(job.slug)}`'),
  'the public list must navigate by slug'
);
assert.ok(
  !exploreClient.includes('encodeURIComponent(job.canonicalId)'),
  'the public list must not link to the raw hash url'
);
// The apply handoff is the exception, and deliberately so: the authenticated Hub
// dedupes the provisioned application on `canonicalId`, not on the slug.
assert.ok(
  exploreClient.includes('buildPublicApplyHref(job.canonicalId)'),
  'the Apply handoff must keep the canonicalId — the Hub dedupes on it'
);
ok('the public list links by slug while the Apply handoff keeps the canonicalId');

const sitemap = read('src', 'app', 'sitemap.ts');
assert.ok(
  sitemap.includes('buildJobSlug'),
  'the sitemap must advertise the slug url the page actually serves'
);
assert.ok(
  !sitemap.includes('/explore/jobs/${row.canonicalId}'),
  'the sitemap must not submit the hash url — every submitted url would be a redirect'
);
assert.ok(
  sitemap.includes("'company.name': 1"),
  'the sitemap must project the fields the slug is derived from'
);
ok('the sitemap submits the slug url and projects the fields it derives from');

console.log(`\npublic-route-policy: ${checks} checks passed`);
