/**
 * Deterministic Scoring
 *
 * Scores a job against a candidate profile using deterministic rules.
 * Implements the target model from docs/application-automation/job-recommendation-plan.md:
 * - Renormalised fit with zero-payment for unknown data (SB-27)
 * - Token and role-family equality instead of bidirectional substring (SB-28)
 * - Required skill coverage via semantic matching (SB-29)
 * - Recency / Freshness scoring curve (SB-30)
 * - Hard constraint detection & machine-readable violations (SB-31)
 * - Safe scoring profile normalization (SB-26)
 */

import { CandidateMatchingProfile } from './candidateProfileExtractor';
import { resolveRoleFamily, ROLE_TAXONOMY } from '@/lib/taxonomy/roleTaxonomy';
import { normalizeScoringProfile, ScoringProfile } from './scoringProfile';
import { computeFreshnessScore } from './freshness';
import { checkSemanticMatch } from '@/lib/services/semantic-matcher-service';

// ── Configurable Weights (Fit Dimensions) ──────────────────────────────────
// Acceptance criterion INV10: sum of weights MUST strictly equal 1.0.
export const SCORING_WEIGHTS = {
  ROLE_ALIGNMENT: 0.35,   // 35%
  SKILLS: 0.25,           // 25%
  EXPERIENCE: 0.15,       // 15%
  LOCATION: 0.10,         // 10%
  WORKPLACE: 0.05,        // 5%
  SALARY: 0.05,           // 5%
  INDUSTRY: 0.05,         // 5%
} as const;

// ── Types ───────────────────────────────────────────────────────────────────

export interface MatchScoreResult {
  /**
   * Candidate FIT — the % the UI shows as "N% Match".
   *
   * Sum of the seven fit dimensions: role, skills, experience, location,
   * workplace, salary, industry. It answers exactly one question — "how well
   * does this job fit this candidate" — and nothing else. See `opportunityScore`
   * for the ranking figure.
   */
  score: number; // 0 - 100
  /**
   * OPPORTUNITY — fit blended with freshness and application readiness.
   *
   * `0.75·fit + 0.15·freshness + 0.10·readiness`. Used to ORDER a feed (a fresh,
   * applicable job is worth more attention than a stale identical one) and never
   * displayed as the match percentage: recency is not a property of the
   * candidate, so folding it into "your match" made two identical jobs read as
   * 87% and 50% purely because of their posting date.
   */
  opportunityScore: number; // 0 - 100
  /** Fit-only points (identical to `score`; kept explicit for readers). */
  fitScore: number;
  freshnessScore: number; // 0 - 100, recency curve
  readinessScore: number; // 0 - 100, auto-apply feasibility
  breakdown: {
    roleAlignment: number;
    skills: number;
    experience: number;
    location: number;
    workplace: number;
    salary: number;
    industry: number;
  };
  reasons: string[];
  matchTier: 'STRONG' | 'GOOD' | 'MODERATE' | 'WEAK';
  hardConstraintViolations: string[];
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

/**
 * Token form of a skill name, punctuation-insensitive.
 *
 * `Node.js`, `nodejs`, `Node JS` and `NODE.JS` all have to collapse to the same
 * thing before a job's requirement can be compared to a CV's skill, otherwise a
 * candidate who lists "Node.js" is scored as not knowing it when the posting
 * writes "NodeJS" — one of the ways the old coverage ratio understated obvious
 * matches. `+` becomes "plus" rather than being dropped, so `C++` does not
 * silently become `C`.
 */
function skillTokens(value: unknown): string[] {
  return String(value ?? '')
    .toLowerCase()
    .replace(/\+/g, ' plus ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

/** Contiguous token-sequence search: "design systems" matches, "systems design" does not. */
function containsSequence(haystack: string[], needle: string[]): boolean {
  if (needle.length === 0) return false;
  if (needle.length === 1) return haystack.includes(needle[0]);
  outer: for (let i = 0; i + needle.length <= haystack.length; i++) {
    for (let j = 0; j < needle.length; j++) {
      if (haystack[i + j] !== needle[j]) continue outer;
    }
    return true;
  }
  return false;
}

/** How much of a job description is worth tokenising. Short bodies are common; the
 *  cap only stops a 200KB scraped page from being tokenised per card. */
const MAX_SKILL_SCAN_CHARS = 12000;

/**
 * Job bodies arrive as ESCAPED HTML from several sources
 * (`&lt;div class=&quot;…`), so a raw slice spends its budget on entity soup and
 * boilerplate: the first 4–6KB of a typical Greenhouse posting is the company
 * blurb, and the actual requirements sit past it. Decoding and stripping first
 * is what lets a real requirement be seen at all — before this, a "Software
 * Engineer, Payments" posting matched none of a front-end CV's 72 skills because
 * the crate of `&lt;p&gt;&lt;span style=…` hid everything past the cap.
 */
function plainTextForScan(html: unknown): string {
  return String(html ?? '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ');
}

/**
 * The least weight the fit score will ever divide by.
 *
 * 0.75 = role + skills + one more dimension. Below that, the posting simply has
 * not told us enough for a confident percentage, so the score is diluted toward
 * "not enough evidence" instead of being scaled up by a single agreement.
 *
 * Lowering it to 0.6 was measured and rejected: a job whose requirements were
 * verifiable then tied with one whose description we never really had (72 = 72),
 * so "we checked your skills against this posting" stopped being worth anything.
 */
const MIN_EVIDENCE_WEIGHT = 0.75;

// ── Scoring ─────────────────────────────────────────────────────────────────

export function scoreJobForCandidate(
  job: any,
  rawProfile: CandidateMatchingProfile | any
): MatchScoreResult {
  // SB-26: Always normalize profile so cold and warm cache shapes score identically
  const profile: ScoringProfile = normalizeScoringProfile(rawProfile);

  const reasons: string[] = [];
  const hardConstraintViolations: string[] = [];

  /*
   * Which dimensions this posting actually carries evidence for.
   *
   * These decide the fit score's DENOMINATOR, not just its numerator (see
   * `MIN_EVIDENCE_WEIGHT` below). A dimension the posting says nothing about is
   * left out of the division entirely — it neither rewards nor punishes.
   */
  const inScope = {
    role: false,
    skills: false,
    experience: false,
    location: false,
    workplace: false,
    salary: false,
    industry: false,
  };

  // ── 1. Role Alignment (35% max) ──────────────────────────────────────────
  let roleScore = 0;
  const rawJobTitle = (job.normalizedTitle || job.title || '').trim();
  const jobTitleNorm = rawJobTitle.toLowerCase();
  inScope.role = jobTitleNorm.length > 0;
  const jobRoleFamily = job.roleFamily || resolveRoleFamily(job.title || '');

  const userRoleFamilies = (profile.roleFamilies.length > 0
    ? profile.roleFamilies
    : profile.targetRoles.map((r) => resolveRoleFamily(r)).filter((f): f is string => !!f)
  ).map((f) => f.toUpperCase());

  const jobFamilyUpper = jobRoleFamily ? jobRoleFamily.toUpperCase() : null;

  // Check 1: Exact or direct target title match
  let exactTitleMatched = false;
  for (const targetRole of profile.targetRoles) {
    const normTarget = targetRole.trim().toLowerCase();
    if (jobTitleNorm === normTarget) {
      roleScore = 35;
      reasons.push(`Direct target role match: "${job.title}"`);
      exactTitleMatched = true;
      break;
    }
  }

  // Check 2: Role family match
  let familyMatched = false;
  if (!exactTitleMatched && jobFamilyUpper) {
    if (userRoleFamilies.includes(jobFamilyUpper)) {
      roleScore = 28; // 80% of 35
      const family = ROLE_TAXONOMY[jobFamilyUpper as keyof typeof ROLE_TAXONOMY];
      reasons.push(`Same role family: ${family?.label || jobFamilyUpper}`);
      familyMatched = true;
    } else {
      // Related / adjacent family check
      const family = ROLE_TAXONOMY[jobFamilyUpper as keyof typeof ROLE_TAXONOMY];
      const isRelated = family?.adjacent?.some((adj) => {
        const adjUpper = adj.toUpperCase();
        return userRoleFamilies.includes(adjUpper);
      });

      if (isRelated) {
        roleScore = 18; // ~50% of 35
        reasons.push(`Related role family: ${family?.label || jobFamilyUpper}`);
        familyMatched = true;
      }
    }
  }

  // Check 3: Token overlap precision (avoid bidirectional substring false positives)
  if (!exactTitleMatched && !familyMatched) {
    const jobTokens = tokenize(jobTitleNorm);
    let bestTokenScore = 0;

    for (const targetRole of profile.targetRoles) {
      const targetTokens = tokenize(targetRole);
      if (targetTokens.length === 0 || jobTokens.length === 0) continue;

      const common = targetTokens.filter((t) => jobTokens.includes(t));
      if (common.length > 0) {
        // Precision ratio: common tokens over job title length
        const precisionRatio = common.length / jobTokens.length;
        // Moderate credit capped at 14 points (40% of role) for non-family token hits
        const tokenPoints = Math.round(precisionRatio * 25);
        if (tokenPoints > bestTokenScore) {
          bestTokenScore = tokenPoints;
        }
      }
    }
    roleScore = bestTokenScore;
  }

  // ── 2. Skills Coverage (25% max) ──────────────────────────────────────────
  /*
   * The job's requirements are read from EVERYWHERE the posting states them, not
   * just from the `keywords[]` array.
   *
   * That array is optional: direct-ATS adapters fill it, aggregator payloads
   * usually do not, and even when it exists it is a scraper's guess (10–30
   * strings, often including benefits and company blurb). Scoring coverage as
   * `matched / keywords.length` therefore punished jobs for having thin metadata
   * rather than for being a worse fit — the same role could score 87% with a
   * keyword list and 50% without one, which is exactly the “the number looks made
   * up” symptom. The evidence is now:
   *
   *   declared  the posting's own skill list, if it has one
   *   mentioned candidate skills that appear verbatim in the title or body
   *
   * and coverage is matched / evidence, with a 4-skill floor when the posting
   * declares no list and only mentions a couple of things (otherwise one “React”
   * in a paragraph would read as full coverage).
   */
  let skillsScore = 0;
  const rawJobSkills: string[] = Array.isArray(job.skills)
    ? job.skills
    : typeof job.skills === 'string'
      ? [job.skills]
      : [];

  const candidateSkillSets = Array.from(
    new Set(
      profile.skills
        .map((s) => skillTokens(s).join(' '))
        .filter((s) => s.length > 0)
    )
  );

  if (candidateSkillSets.length > 0) {
    const declared = Array.from(
      new Set(
        rawJobSkills
          .map((s) => skillTokens(s).join(' '))
          .filter((s) => s.length > 0)
      )
    );

    const jobTextTokens = skillTokens(
      `${job.title || job.normalizedTitle || ''} ${plainTextForScan(job.description).slice(0, MAX_SKILL_SCAN_CHARS)}`
    );

    const evidence = new Set<string>(declared);
    for (const skill of candidateSkillSets) {
      if (containsSequence(jobTextTokens, skill.split(' '))) evidence.add(skill);
    }

    const matched = Array.from(evidence).filter((skill) => {
      if (candidateSkillSets.includes(skill)) return true;
      // Synonym bridge for the remaining declared requirements (e.g. "ReactJS"
      // in the posting vs "React" in the CV).
      return candidateSkillSets.some((candidate) => checkSemanticMatch(candidate, skill).matched);
    });

    const denominator = declared.length > 0 ? evidence.size : Math.max(evidence.size, 4);

    // A posting that never names a skill the candidate has, and declares no
    // list, says nothing about skills — it is not evidence of a skills gap.
    inScope.skills = evidence.size > 0;

    if (matched.length > 0 && denominator > 0) {
      const coverageRatio = Math.min(1, matched.length / denominator);
      skillsScore = Math.round(coverageRatio * 25);
      reasons.push(
        `Key skill overlap: ${Array.from(new Set(matched)).slice(0, 3).join(', ')}`
      );
    } else {
      skillsScore = 0;
    }
  } else {
    // SB-29: A candidate with no skills has no coverage to claim.
    skillsScore = 0;
  }

  // ── 3. Experience Alignment (15% max) ────────────────────────────────────
  let expScore = 0;
  const rawJobSeniority = job.experience?.level || job.seniority;
  const jobLevel = typeof rawJobSeniority === 'string' ? rawJobSeniority.trim().toLowerCase() : '';
  const userLevel = profile.experienceLevel ? profile.experienceLevel.toLowerCase() : '';

  // SB-27 / INV8: 'unknown' or missing seniority is NOT a match and claims no reason
  inScope.experience = Boolean(jobLevel && jobLevel !== 'unknown' && userLevel && userLevel !== 'unknown');
  if (jobLevel && jobLevel !== 'unknown' && userLevel && userLevel !== 'unknown') {
    // If candidate has zero role alignment, they are in an unrelated profession (INV3)
    if (roleScore > 0) {
      if (jobLevel === userLevel) {
        expScore = 15;
        reasons.push(`Experience level matches: ${profile.experienceLevel}`);
      } else if (jobLevel === 'senior' && userLevel === 'lead') {
        expScore = 12;
      } else if (jobLevel === 'mid' && userLevel === 'senior') {
        expScore = 10;
      } else if (jobLevel === 'junior' && (userLevel === 'mid' || userLevel === 'senior')) {
        expScore = 8;
      } else {
        expScore = 4;
      }
    } else {
      expScore = 0;
    }
  } else {
    expScore = 0;
  }

  // ── 4. Location / Remote Compatibility (10% max) ──────────────────────────
  let locScore = 0;
  const jobRemote = Boolean(job.location?.remote || job.remote);
  inScope.location = jobRemote || Boolean(job.location?.city || job.location?.country);

  if (jobRemote) {
    locScore = 10;
    reasons.push('Remote-compatible position');
  } else {
    const jobCity = (job.location?.city || '').toLowerCase();
    const jobCountry = (job.location?.country || '').toLowerCase();
    for (const loc of profile.targetLocations) {
      const normLoc = loc.toLowerCase();
      if ((jobCity && jobCity.includes(normLoc)) || (jobCountry && jobCountry.includes(normLoc))) {
        locScore = 10;
        reasons.push(`Located in your target region: ${job.location?.city || job.location?.country || loc}`);
        break;
      }
    }
  }

  // Hard constraint: remote requirement
  if (profile.hardConstraints.remoteOnly && !jobRemote) {
    hardConstraintViolations.push('Requires remote but job is not remote');
  }

  // ── 5. Workplace Preference (5% max) ──────────────────────────────────────
  let workplaceScore = 0;
  const workplacePref = profile.workplacePreference.toLowerCase();

  // SB-27 / INV5: 'any' leaves D entirely — pays 0, not 5
  inScope.workplace = workplacePref !== 'any';
  if (workplacePref !== 'any') {
    if (workplacePref === 'remote' && jobRemote) {
      workplaceScore = 5;
    } else if (
      workplacePref === 'hybrid' &&
      (job.location?.remoteType === 'hybrid' || job.description?.toLowerCase().includes('hybrid'))
    ) {
      workplaceScore = 5;
    } else if (workplacePref === 'onsite' && !jobRemote) {
      workplaceScore = 5;
    }
  }

  // ── 6. Salary Alignment (5% max) ──────────────────────────────────────────
  let salScore = 0;
  const jobSalMax = typeof job.salary?.max === 'number' ? job.salary.max : 0;
  const userMinSal = profile.minSalary || 0;

  // SB-27 / INV5: Unknown salary leaves D entirely — pays 0, not 3
  inScope.salary = jobSalMax > 0 && userMinSal > 0;
  if (jobSalMax > 0 && userMinSal > 0) {
    if (jobSalMax >= userMinSal) {
      salScore = 5;
      reasons.push('Salary meets your target');
    } else {
      salScore = Math.max(0, Math.round(5 * (jobSalMax / userMinSal)));
    }

    if (profile.hardConstraints.minSalary > 0 && jobSalMax < profile.hardConstraints.minSalary) {
      hardConstraintViolations.push(
        `Salary ${jobSalMax} below minimum ${profile.hardConstraints.minSalary}`
      );
    }
  }

  // ── 7. Industry (5% max) ──────────────────────────────────────────────────
  let industryScore = 0;
  const jobIndustry = (job.industry || job.department || '').toLowerCase();

  // SB-27 / INV5: No industry preference leaves D entirely — pays 0, not 3
  inScope.industry = profile.preferredIndustries.length > 0 && Boolean(jobIndustry);
  if (profile.preferredIndustries.length > 0 && jobIndustry) {
    for (const ind of profile.preferredIndustries) {
      if (jobIndustry.includes(ind.toLowerCase())) {
        industryScore = 5;
        reasons.push(`Matches preferred industry: ${ind}`);
        break;
      }
    }
  }

  // ── Fit (§4.1) ────────────────────────────────────────────────────────────
  const fitPoints =
    roleScore +
    skillsScore +
    expScore +
    locScore +
    workplaceScore +
    salScore +
    industryScore;

  /*
   * Renormalise by the weight that was actually measured.
   *
   * Paying zero for a dimension the posting says nothing about made the number
   * depend on how complete the posting is rather than on the fit: across 60 real
   * jobs from this database, `keywords[]` was empty on every single one and
   * `seniority` was mostly absent, so 40 of the 100 points were unreachable and
   * the BEST relevant role — a Senior Software Engineer for a senior engineer —
   * scored 49. Nothing could ever reach the STRONG band, and the difference
   * between "we don't know" and "you don't match" was invisible.
   *
   * `fit(d) = Σ w_d·s_d / Σ_{d ∈ D} w_d` for the dimensions D with evidence. A
   * missing salary, an unstated seniority or an absent industry preference no
   * longer silently lowers every score.
   *
   * The denominator is floored at `MIN_EVIDENCE_WEIGHT` so a posting that says
   * one thing about the job cannot produce a confident score: a title-only match
   * divides by 0.6 instead of 0.35 and lands in the 40s, while a posting that
   * supports a real skills comparison lands where its evidence does. That floor
   * is what keeps §4.1's ceiling out of reach for thin evidence.
   */
  const inScopeWeight =
    (inScope.role ? SCORING_WEIGHTS.ROLE_ALIGNMENT : 0) +
    (inScope.skills ? SCORING_WEIGHTS.SKILLS : 0) +
    (inScope.experience ? SCORING_WEIGHTS.EXPERIENCE : 0) +
    (inScope.location ? SCORING_WEIGHTS.LOCATION : 0) +
    (inScope.workplace ? SCORING_WEIGHTS.WORKPLACE : 0) +
    (inScope.salary ? SCORING_WEIGHTS.SALARY : 0) +
    (inScope.industry ? SCORING_WEIGHTS.INDUSTRY : 0);

  /*
   * Confidence multiplier.
   *
   * Renormalising alone lets three cheap agreements (right title, same
   * seniority, right city) look like a near-perfect fit — there is nothing left
   * in the denominator to disagree with. The score is therefore scaled by how
   * much of the fit was actually measured: full evidence keeps 100% of the
   * value, a posting that only told us its title keeps ~70% of it.
   *
   *   0.55 + 0.45·coverage      coverage 1.00 → ×1.00
   *                             coverage 0.75 → ×0.89
   *                             coverage 0.35 → ×0.71
   *
   * This is what keeps a title-only posting in the "maybe" band and reserves the
   * STRONG band for jobs whose requirements we could genuinely compare.
   */
  const evidenceCoverage = Math.min(1, inScopeWeight);
  const fitScore = Math.round(
    (fitPoints / Math.max(inScopeWeight, MIN_EVIDENCE_WEIGHT)) *
      (0.55 + 0.45 * evidenceCoverage)
  );

  // Freshness score (0 - 100) via piecewise decay curve (§4.2)
  const freshnessScore = computeFreshnessScore(
    job.postedAt || job.postedDate || job.firstSeenAt
  );

  // Readiness score (0 - 100) via auto-apply feasibility (§4.3)
  const hasApplyUrl = Boolean(job.applyUrl || job.source?.applicationUrl || job.applicationUrl);
  const readinessScore = hasApplyUrl ? 85 : 60;

  // OPPORTUNITY = 0.75·fit + 0.15·fresh + 0.10·readiness.
  //
  // This is the RANKING figure, not the displayed match. `score` below stays the
  // fit so that "% Match" describes the candidate-to-job fit the user is being
  // asked to judge; recency is shown separately ("Posted 3 hours ago") and used
  // to order the feed, where it belongs.
  const opportunityScore = Math.round(
    0.75 * fitScore + 0.15 * freshnessScore + 0.10 * readinessScore
  );

  const totalScore = Math.min(98, Math.max(5, fitScore));

  // Determine match tier
  let matchTier: MatchScoreResult['matchTier'];
  if (totalScore >= 80) matchTier = 'STRONG';
  else if (totalScore >= 60) matchTier = 'GOOD';
  else if (totalScore >= 40) matchTier = 'MODERATE';
  else matchTier = 'WEAK';

  return {
    score: totalScore,
    opportunityScore: Math.min(98, Math.max(5, opportunityScore)),
    fitScore: totalScore,
    freshnessScore,
    readinessScore,
    breakdown: {
      roleAlignment: roleScore,
      skills: skillsScore,
      experience: expScore,
      location: locScore,
      workplace: workplaceScore,
      salary: salScore,
      industry: industryScore,
    },
    reasons,
    matchTier,
    hardConstraintViolations,
  };
}
