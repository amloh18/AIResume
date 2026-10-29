/**
 * Verify role relevance + discover feed query construction.
 *
 * Run: npx tsx tests/verify-role-relevance.ts
 *
 * These are pure-logic checks: no database, no network. They pin the two
 * properties that made the old feed wrong — the role predicate must be
 * anchored and index-usable, and the total must come from the same filter as
 * the rows.
 */

import {
  buildRoleTitlePattern,
  buildRoleRelevanceClause,
  buildRoleRelevanceFallbackClause,
  collectRolePhrases,
} from '../src/lib/jobs/roleRelevance';
import { __internal } from '../src/lib/jobs/discoverFeed';

let passed = 0;
let failed = 0;

function check(name: string, condition: boolean, detail?: string) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

function section(title: string) {
  console.log(`\n${title}`);
}

function matches(pattern: string, title: string): boolean {
  return new RegExp(pattern).test(title.toLowerCase());
}

async function main() {
  // ── Phrase collection ────────────────────────────────────────────────────
  section('collectRolePhrases');

  const swePhrases = collectRolePhrases(['Software Engineer'], []);
  check('includes the target role verbatim', swePhrases.includes('software engineer'));
  check(
    'expands to the taxonomy family (developer)',
    swePhrases.includes('developer'),
    JSON.stringify(swePhrases)
  );
  check(
    'resolves the family even when roleFamilies is empty',
    swePhrases.includes('software developer'),
    JSON.stringify(swePhrases)
  );
  check('drops sub-3-character noise', collectRolePhrases(['a', 'go'], []).every((p) => p.length >= 3));
  check('returns nothing for an empty profile', collectRolePhrases([], []).length === 0);

  // ── Pattern shape ────────────────────────────────────────────────────────
  section('buildRoleTitlePattern');

  const pattern = buildRoleTitlePattern(['Software Engineer'], []);
  check('is anchored so MongoDB can use index bounds', !!pattern && pattern.startsWith('^'));
  check('has no case-insensitive flag baked in (lowercase corpus)', !!pattern && !pattern.includes('(?i)'));
  check('matches the bare role', matches(pattern!, 'software engineer'));
  check('matches a seniority-prefixed role', matches(pattern!, 'senior software engineer'));
  check('matches staff/lead prefixes', matches(pattern!, 'staff software engineer'));
  check('matches lead', matches(pattern!, 'lead software developer'));
  check('does not match an unrelated role', !matches(pattern!, 'accountant'));

  const dataAnalyst = buildRoleTitlePattern(['Data Analyst'], []);
  check('data analyst matches "senior data analyst"', matches(dataAnalyst!, 'senior data analyst'));
  check('data analyst does not match "data engineer"', !matches(dataAnalyst!, 'data engineer'));

  // Regex metacharacters in a target role must not break the pattern.
  const cppPattern = buildRoleTitlePattern(['c++ developer'], []);
  check('escapes regex metacharacters', !!cppPattern && cppPattern.includes('c\\+\\+'));
  check('escaped pattern matches literally', matches(cppPattern!, 'c++ developer'));

  const nodePattern = buildRoleTitlePattern(['node.js engineer'], []);
  check('escapes dots', !!nodePattern && nodePattern.includes('node\\.js'));

  // ── Clauses ──────────────────────────────────────────────────────────────
  section('buildRoleRelevanceClause');

  const clause = buildRoleRelevanceClause(['Software Engineer'], []);
  check('returns a normalizedTitle predicate', !!clause && !!clause.normalizedTitle?.$regex);
  check('no $options on the primary path', !!clause && !clause.normalizedTitle.$options);
  check('returns null without target roles', buildRoleRelevanceClause([], []) === null);
  check(
    'returns null for a profile whose roles are all too short',
    buildRoleRelevanceClause(['a', 'x'], []) === null
  );

  const familyOnly = buildRoleRelevanceClause([], ['DATA_SCIENCE']);
  check('builds a clause from role families alone', !!familyOnly && !!familyOnly.normalizedTitle);

  const fallback = buildRoleRelevanceFallbackClause(['Software Engineer'], []);
  check('fallback covers both fields case-insensitively', !!fallback && fallback.$or.length === 2);
  check(
    'fallback is case-insensitive',
    !!fallback && fallback.$or[0].normalizedTitle.$options === 'i'
  );

  // ── Feed query construction ──────────────────────────────────────────────
  section('discover feed clauses');

  const status = __internal.statusClause();
  check('status filter is index-friendly ($in, no $exists)', JSON.stringify(status) === '{"status":{"$in":["active","new"]}}');

  const remoteProfile: any = {
    targetRoles: ['Software Engineer'],
    roleFamilies: ['SOFTWARE_ENGINEERING'],
    hardConstraints: { remoteOnly: true, minSalary: 0, locations: [], visaRequired: false },
    softPreferences: { preferredIndustries: [], preferredCompanySizes: [], preferredWorkplace: 'remote' },
  };
  const remoteClauses = __internal.hardConstraintClauses(remoteProfile);
  check('remote-only profile yields a remote predicate', remoteClauses.length === 1);
  check(
    'remote predicate uses the normalised location field',
    JSON.stringify(remoteClauses[0]).includes('location.remote')
  );
  check(
    'no remote predicate when the profile is not remote-only',
    __internal.hardConstraintClauses({ ...remoteProfile, hardConstraints: { ...remoteProfile.hardConstraints, remoteOnly: false } }).length === 0
  );
  check('no predicate without a profile', __internal.hardConstraintClauses(null).length === 0);

  const baseOpts: any = {
    db: null,
    page: 1,
    limit: 20,
    unpersonalized: false,
    searchQuery: '',
    keywords: [],
    remoteOnly: false,
    countries: [],
    companies: [],
    locations: [],
    sources: [],
    atsTypes: [],
    workplaceTypes: [],
    roles: [],
    jobTypes: [],
    experienceLevels: [],
    datePosted: null,
    sponsorsVisa: false,
    easyApplyOnly: false,
    matchScoreMin: 0,
    matchScoreMax: 100,
    sortBy: 'matchScore',
    sortOrder: 'desc',
    excludeJobIds: new Set<string>(),
    profile: remoteProfile,
  };

  const curatedClauses = __internal.buildFilterClauses(baseOpts, buildRoleRelevanceClause(['Software Engineer'], []));
  const curatedJson = JSON.stringify(curatedClauses);
  check('curated filter carries the role predicate', curatedJson.includes('normalizedTitle'));
  check('curated filter carries the hard constraint', curatedJson.includes('location.remote'));

  const catalogueClauses = __internal.buildFilterClauses(baseOpts, null);
  check(
    'catalogue filter has no role predicate',
    !JSON.stringify(catalogueClauses).includes('normalizedTitle')
  );

  // Every UI filter must reach the query — this is the "filters lie" bug.
  const allFilters: any = {
    ...baseOpts,
    companies: ['Acme'],
    locations: ['London'],
    sources: ['greenhouse'],
    atsTypes: ['lever'],
    workplaceTypes: ['remote'],
    roles: ['engineer'],
    jobTypes: ['fulltime'],
    experienceLevels: ['senior'],
    datePosted: '7d',
    sponsorsVisa: true,
    easyApplyOnly: true,
    searchQuery: 'typescript',
  };
  const filterJson = JSON.stringify(__internal.buildFilterClauses(allFilters, null));
  for (const [label, token] of [
    ['companies', 'company.name'],
    ['locations', 'location.city'],
    ['sources', 'source.primary'],
    ['atsTypes', 'atsType'],
    ['workplace', 'location.remote'],
    ['roles', 'normalizedTitle'],
    ['jobTypes', 'employmentType'],
    ['experience', 'experience.level'],
    ['datePosted', 'postedAt'],
    ['visa', 'visaSponsorship'],
    ['easyApply', 'atsType'],
    ['search', 'descriptionText'],
  ] as const) {
    check(`filter "${label}" is applied in the query`, filterJson.includes(token), label);
  }

  // ── Sort ─────────────────────────────────────────────────────────────────
  section('page ordering');

  check(
    'match-score sort selects pages in freshness order',
    JSON.stringify(__internal.buildSort('matchScore', 'desc')) === '{"postedAt":-1,"postedDate":-1}'
  );
  check(
    'explicit postedDate sort is honoured',
    JSON.stringify(__internal.buildSort('postedDate', 'asc')) === '{"postedAt":1,"postedDate":1}'
  );
  check(
    'salary sort targets the salary range',
    JSON.stringify(__internal.buildSort('salary', 'desc')) === '{"salary.max":-1,"salary.min":-1}'
  );

  // ── Summary ──────────────────────────────────────────────────────────────
  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error('Test runner crashed:', err);
  process.exit(1);
});
