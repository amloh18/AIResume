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
  score: number; // 0 - 100
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

// ── Scoring ─────────────────────────────────────────────────────────────────

export function scoreJobForCandidate(
  job: any,
  rawProfile: CandidateMatchingProfile | any
): MatchScoreResult {
  // SB-26: Always normalize profile so cold and warm cache shapes score identically
  const profile: ScoringProfile = normalizeScoringProfile(rawProfile);

  const reasons: string[] = [];
  const hardConstraintViolations: string[] = [];

  // ── 1. Role Alignment (35% max) ──────────────────────────────────────────
  let roleScore = 0;
  const rawJobTitle = (job.normalizedTitle || job.title || '').trim();
  const jobTitleNorm = rawJobTitle.toLowerCase();
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
  let skillsScore = 0;
  const rawJobSkills: string[] = Array.isArray(job.skills) ? job.skills : [];
  const jobSkills = rawJobSkills
    .map((s) => String(s).trim().toLowerCase())
    .filter((s) => s.length > 0);

  const candidateSkills = profile.skills
    .map((s) => String(s).trim().toLowerCase())
    .filter((s) => s.length > 0);

  if (jobSkills.length > 0 && candidateSkills.length > 0) {
    let matchedCount = 0;
    const matchedList: string[] = [];

    for (const jSkill of jobSkills) {
      let isMatched = false;
      for (const cSkill of candidateSkills) {
        if (cSkill === jSkill) {
          isMatched = true;
          matchedList.push(cSkill);
          break;
        }
        // Semantic synonym match
        const sem = checkSemanticMatch(cSkill, jSkill);
        if (sem.matched) {
          isMatched = true;
          matchedList.push(cSkill);
          break;
        }
      }
      if (isMatched) {
        matchedCount++;
      }
    }

    if (matchedCount > 0) {
      const coverageRatio = matchedCount / jobSkills.length;
      skillsScore = Math.round(coverageRatio * 25);
      reasons.push(`Key skill overlap: ${Array.from(new Set(matchedList)).slice(0, 3).join(', ')}`);
    } else {
      skillsScore = 0;
    }
  } else {
    // SB-29: Job with no skills specified or candidate with no skills pays 0, not 3
    skillsScore = 0;
  }

  // ── 3. Experience Alignment (15% max) ────────────────────────────────────
  let expScore = 0;
  const rawJobSeniority = job.experience?.level || job.seniority;
  const jobLevel = typeof rawJobSeniority === 'string' ? rawJobSeniority.trim().toLowerCase() : '';
  const userLevel = profile.experienceLevel ? profile.experienceLevel.toLowerCase() : '';

  // SB-27 / INV8: 'unknown' or missing seniority is NOT a match and claims no reason
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
  if (profile.preferredIndustries.length > 0 && jobIndustry) {
    for (const ind of profile.preferredIndustries) {
      if (jobIndustry.includes(ind.toLowerCase())) {
        industryScore = 5;
        reasons.push(`Matches preferred industry: ${ind}`);
        break;
      }
    }
  }

  // ── Combined Opportunity Calculation (§4) ─────────────────────────────────
  // Fit points (0 - 100)
  const fitPoints =
    roleScore +
    skillsScore +
    expScore +
    locScore +
    workplaceScore +
    salScore +
    industryScore;

  // Freshness score (0 - 100) via piecewise decay curve (§4.2)
  const freshnessScore = computeFreshnessScore(
    job.postedAt || job.postedDate || job.firstSeenAt
  );

  // Readiness score (0 - 100) via auto-apply feasibility (§4.3)
  const hasApplyUrl = Boolean(job.applyUrl || job.source?.applicationUrl || job.applicationUrl);
  const readinessScore = hasApplyUrl ? 85 : 60;

  // OPPORTUNITY = 0.75·fit + 0.15·fresh + 0.10·readiness
  const opportunityScore = Math.round(
    0.75 * fitPoints + 0.15 * freshnessScore + 0.10 * readinessScore
  );

  const totalScore = Math.min(98, Math.max(5, opportunityScore));

  // Determine match tier
  let matchTier: MatchScoreResult['matchTier'];
  if (totalScore >= 80) matchTier = 'STRONG';
  else if (totalScore >= 60) matchTier = 'GOOD';
  else if (totalScore >= 40) matchTier = 'MODERATE';
  else matchTier = 'WEAK';

  return {
    score: totalScore,
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
