/**
 * Job match scoring — invariant harness for the recommendation path.
 * Run with: `npm run verify:match-scoring`.
 *
 * This file encodes the *acceptance criteria* for
 * `docs/application-automation/job-recommendation-plan.md`, so it is EXPECTED
 * TO FAIL until P0/P1 of that plan land. Each failing invariant names the
 * defect it pins; a fix that satisfies the invariant flips the line to `ok`
 * and the exit code to 0.
 *
 * Everything here is synthetic on purpose — no Mongo, no network — so it keeps
 * working as the `jobs` corpus and the ingestion schema evolve.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { scoreJobForCandidate, SCORING_WEIGHTS } from '../src/matching/deterministicScoring';

// ── Harness ─────────────────────────────────────────────────────────────────

type Result = { name: string; passed: boolean; detail: string };
const results: Result[] = [];

function invariant(name: string, fn: () => void | string) {
  try {
    const detail = fn();
    results.push({ name, passed: true, detail: typeof detail === 'string' ? detail : '' });
  } catch (err: any) {
    results.push({ name, passed: false, detail: err?.message ?? String(err) });
  }
}

// ── Fixtures ────────────────────────────────────────────────────────────────

/** Shape returned by extractCandidateProfile() — the COLD (cache-miss) path. */
const extractedProfile: any = {
  userId: 'u1',
  targetRoles: ['Senior Product Designer'],
  roleFamilies: ['designer'],
  targetLocations: ['London'],
  remotePreference: 'any',
  workplacePreference: 'any',
  experienceLevel: 'senior',
  experienceYears: 7,
  minSalary: 70000,
  salaryCurrency: 'GBP',
  skills: ['figma', 'design systems', 'user research', 'prototyping'],
  needsVisaSponsorship: false,
  preferredIndustries: [],
  hardConstraints: { remoteOnly: false, minSalary: 0, locations: ['London'], visaRequired: false },
  softPreferences: { preferredIndustries: [], preferredCompanySizes: [], preferredWorkplace: 'any' },
};

/**
 * Shape handed back by getOrComputeProfile() on a cache HIT — NormalizedUserProfile.
 * It carries `locations`/`seniority`, NOT `targetLocations`/`experienceLevel`, and
 * `discover/route.ts` substitutes it for `candidateProfile` when the cache hits.
 */
const cachedProfileShape: any = {
  userId: 'u1',
  targetRoles: ['Senior Product Designer'],
  roleFamilies: ['designer'],
  skills: ['figma', 'design systems', 'user research', 'prototyping'],
  seniority: 'senior',
  experienceYears: 7,
  locations: ['London'],
  remoteOnly: false,
  workplacePreference: 'any',
  minSalary: 70000,
  salaryCurrency: 'GBP',
  industries: [],
  availability: '',
  hardConstraints: { remoteOnly: false, minSalary: 0, locations: ['London'], visaRequired: false },
  softPreferences: { preferredIndustries: [], preferredCompanySizes: [], preferredWorkplace: 'any' },
};

const baseJob = {
  title: 'Product Designer',
  normalizedTitle: 'product designer',
  skills: [] as string[],
  roleFamily: 'designer',
  seniority: 'senior' as string | undefined,
  location: { city: 'London', country: 'GB', remote: false } as any,
  salary: {} as any,
  description: '',
};

const job = (overrides: Partial<typeof baseJob> = {}) => ({ ...baseJob, ...overrides });

const onsiteJob = job({
  skills: ['figma', 'design systems', 'user research', 'prototyping'],
  salary: { min: 80000, max: 95000, currency: 'GBP' },
});
const remoteJob = job({
  skills: ['figma', 'design systems', 'user research', 'prototyping'],
  salary: { min: 80000, max: 95000, currency: 'GBP' },
  location: { city: '', country: 'Global', remote: true },
});

// ── 1. The two profile shapes must score identically ────────────────────────
// Defect: on a profile-cache HIT the scorer throws for every non-remote job, so
// the route's catch-all assigns a flat 45. Ranking then depends on whether the
// 5-minute cache happened to be warm.

invariant('INV1 · extracted and cached profile shapes score identically', () => {
  const a = scoreJobForCandidate(onsiteJob, extractedProfile);
  const b = scoreJobForCandidate(onsiteJob, cachedProfileShape);
  assert.equal(b.score, a.score, `extracted=${a.score} cached=${b.score} (cache-hit reroutes to flat 45)`);
  return `both ${a.score}`;
});

// ── 2. The scorer must be total ─────────────────────────────────────────────
invariant('INV2 · scorer never throws for a well-formed profile', () => {
  for (const [label, p] of [['extracted', extractedProfile], ['cached', cachedProfileShape]] as const) {
    for (const [jobLabel, j] of [['onsite', onsiteJob], ['remote', remoteJob]] as const) {
      try {
        scoreJobForCandidate(j, p);
      } catch (err: any) {
        assert.fail(`${label} + ${jobLabel}: ${err.message}`);
      }
    }
  }
  return '4/4 combinations scored';
});

// ── 3. An unrelated role must not land in a "you might apply" band ──────────
invariant('INV3 · unrelated role scores below 40 (WEAK)', () => {
  const r = scoreJobForCandidate(
    job({ title: 'Accountant', normalizedTitle: 'accountant', roleFamily: 'accounting' }),
    extractedProfile
  );
  assert.ok(r.score < 40, `Accountant scored ${r.score} (${r.matchTier}) — bands: 80+ STRONG, 60+ GOOD, 40+ MODERATE`);
  return String(r.score);
});

// ── 4. Title-only agreement is not a strong match ───────────────────────────
// Defect: with zero skills, no location, no salary and unknown seniority, a
// title match still reaches 62–74 because no-evidence buckets pay out.

invariant('INV4 · title match with no supporting evidence scores below 60', () => {
  const bare = scoreJobForCandidate(
    job({ seniority: undefined, location: { city: '', country: '', remote: false } }),
    extractedProfile
  );
  assert.ok(bare.score < 60, `bare title match scored ${bare.score} (${bare.matchTier})`);

  const noSkills = scoreJobForCandidate(job(), extractedProfile);
  assert.ok(noSkills.score < 60, `title + location but no skills scored ${noSkills.score} (${noSkills.matchTier})`);
  return `bare=${bare.score} no-skills=${noSkills.score}`;
});

// ── 5. Unknown data must be worth zero, not a participation award ───────────
invariant('INV5 · unknown data pays no score', () => {
  const r = scoreJobForCandidate(job(), extractedProfile);
  assert.equal(r.breakdown.salary, 0, `absent salary paid ${r.breakdown.salary}`);
  assert.equal(r.breakdown.industry, 0, `no industry preference paid ${r.breakdown.industry}`);
  assert.equal(r.breakdown.workplace, 0, `no workplace preference paid ${r.breakdown.workplace}`);
  return `salary=${r.breakdown.salary} industry=${r.breakdown.industry} workplace=${r.breakdown.workplace}`;
});

// ── 6. Role matching must be precise, not bidirectional substring ───────────
// Defect: `jobTitleNorm.includes(normTarget) || normTarget.includes(jobTitleNorm)`
// grants the full 35 role points to every job containing the target string.

invariant('INV6 · a broad target role does not confer full role credit', () => {
  const managerProfile = { ...extractedProfile, targetRoles: ['manager'], roleFamilies: [] };
  const titles = ['Senior Engineering Manager', 'Account Manager', 'Product Marketing Manager'];
  const scores = titles.map(
    (t) => scoreJobForCandidate(job({ title: t, normalizedTitle: t.toLowerCase(), roleFamily: undefined }), managerProfile).score
  );
  const uniq = new Set(scores);
  assert.ok(uniq.size > 1, `all three unrelated "-manager" titles scored identically: ${scores.join(', ')}`);
  assert.ok(scores[1] < 60, `"Account Manager" scored ${scores[1]} against a "manager" target role`);
  return scores.join(', ');
});

// ── 7. Freshness must be a ranking input ────────────────────────────────────
// AGENTS §11 makes freshness first-class; the scorer has no recency dimension,
// so a 30-day-old repost and a 2-hour-old posting score the same.

invariant('INV7 · a stale posting scores below an identical fresh one', () => {
  const fresh = { ...onsiteJob, postedAt: new Date(Date.now() - 2 * 3600_000) };
  const stale = { ...onsiteJob, postedAt: new Date(Date.now() - 30 * 86400_000) };
  const a = scoreJobForCandidate(fresh, extractedProfile).score;
  const b = scoreJobForCandidate(stale, extractedProfile).score;
  assert.ok(b < a, `2h=${a} vs 30d=${b} — recency is not scored`);
  return `fresh=${a} stale=${b}`;
});

// ── 8. Explanations must not assert things the data does not say ────────────
invariant('INV8 · "experience matches" is not claimed for an unknown level', () => {
  const r = scoreJobForCandidate(job({ seniority: 'unknown' }), extractedProfile);
  const bogus = r.reasons.filter((reason) => /experience level matches/i.test(reason));
  assert.equal(bogus.length, 0, `claimed: ${bogus.join(' | ')}`);
  return `${r.reasons.length} reasons, none about experience`;
});

// ── 9. Hard constraints must be consumed, not merely recorded ───────────────
// Source-level guard: `hardConstraintViolations` is computed in the scorer and
// read by nobody, so a below-floor salary or an onsite job for a remote-only
// candidate is still recommended.
invariant('INV9 · the recommendation routes consume hardConstraintViolations', () => {
  const root = path.resolve(__dirname, '..');
  const consumers = [
    'src/app/api/jobs/discover/route.ts',
    'src/lib/services/recommendedJobsService.ts',
  ];
  const missing: string[] = [];
  for (const rel of consumers) {
    const src = fs.readFileSync(path.join(root, rel), 'utf8');
    if (!src.includes('hardConstraintViolations')) missing.push(rel);
  }
  assert.equal(missing.length, 0, `computed but never read in: ${missing.join(', ')}`);
  return `${consumers.length}/${consumers.length} consumers`;
});

// ── 10. Weights must stay a coherent, documented distribution ───────────────
invariant('INV10 · scoring weights sum to 1.0', () => {
  const sum = Object.values(SCORING_WEIGHTS).reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(sum - 1) < 1e-9, `weights sum to ${sum}`);
  return sum.toFixed(2);
});

// ── Report ──────────────────────────────────────────────────────────────────

const failed = results.filter((r) => !r.passed);
for (const r of results) {
  console.log(`  ${r.passed ? 'ok  ' : 'FAIL'}  ${r.name}${r.detail ? `  — ${r.detail}` : ''}`);
}
console.log(`\n${results.length - failed.length}/${results.length} invariants hold`);

if (failed.length > 0) {
  console.log(
    `\n${failed.length} invariant(s) unmet. This harness pins the acceptance criteria for\n` +
      `docs/application-automation/job-recommendation-plan.md — expect it to fail until\n` +
      `the P0/P1 fixes land.`
  );
  process.exit(1);
}
