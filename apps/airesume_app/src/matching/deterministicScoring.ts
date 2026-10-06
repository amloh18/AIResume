/**
 * Deterministic Scoring
 *
 * Scores a job against a candidate profile using deterministic (non-AI) rules.
 * Enhanced with:
 * - Role family matching via taxonomy
 * - Semantic skill matching via smartSkillMatcher
 * - Workplace preference dimension
 * - Configurable weights
 * - Hard vs soft constraint handling
 */

import { CandidateMatchingProfile } from './candidateProfileExtractor';
import { resolveRoleFamily, ROLE_TAXONOMY } from '@/lib/taxonomy/roleTaxonomy';

// ── Configurable Weights ────────────────────────────────────────────────────

export const SCORING_WEIGHTS = {
  ROLE_ALIGNMENT: 0.35,   // was 30%
  SKILLS: 0.25,           // unchanged
  EXPERIENCE: 0.15,       // unchanged
  LOCATION: 0.10,         // was 15% (reduced - remote jobs common)
  WORKPLACE: 0.05,        // new dimension
  SALARY: 0.05,           // was 10% (reduced - salary data often unknown)
  INDUSTRY: 0.05,         // new dimension
} as const;

// ── Types ───────────────────────────────────────────────────────────────────

export interface MatchScoreResult {
  score: number; // 0 - 100
  breakdown: {
    roleAlignment: number;  // was title
    skills: number;
    experience: number;
    location: number;
    workplace: number;      // new
    salary: number;
    industry: number;       // new
  };
  reasons: string[];
  matchTier: 'STRONG' | 'GOOD' | 'MODERATE' | 'WEAK';
  hardConstraintViolations: string[];
}

// ── Scoring ─────────────────────────────────────────────────────────────────

export function scoreJobForCandidate(job: any, profile: CandidateMatchingProfile): MatchScoreResult {
  const reasons: string[] = [];
  const hardConstraintViolations: string[] = [];

  // 1. Role Alignment (35%)
  let roleScore = 0;
  const jobTitleNorm = (job.normalizedTitle || job.title || '').toLowerCase();
  const jobRoleFamily = job.roleFamily || resolveRoleFamily(job.title || '');
  const userRoleFamilies = (profile as any).roleFamilies || [];

  // Check direct title match
  let titleMatched = false;
  for (const targetRole of profile.targetRoles) {
    const normTarget = targetRole.toLowerCase();
    if (jobTitleNorm.includes(normTarget) || normTarget.includes(jobTitleNorm)) {
      roleScore = 35;
      reasons.push(`Direct target role match: "${job.title}"`);
      titleMatched = true;
      break;
    }
  }

  // Check role family match (if not already matched by title)
  if (!titleMatched && jobRoleFamily) {
    // Check if user's target roles map to the same family
    const userFamilies = profile.targetRoles
      .map((r) => resolveRoleFamily(r))
      .filter((f): f is string => !!f);

    if (userFamilies.includes(jobRoleFamily)) {
      roleScore = 28; // High score for same family
      const family = ROLE_TAXONOMY[jobRoleFamily];
      reasons.push(`Same role family: ${family?.label || jobRoleFamily}`);
    } else {
      // Check if it's a related family
      const family = ROLE_TAXONOMY[jobRoleFamily];
      const isRelated = family?.adjacent?.some((adj) => {
        const adjFamily = resolveRoleFamily(adj);
        return adjFamily && userFamilies.includes(adjFamily);
      });

      if (isRelated) {
        roleScore = 18;
        reasons.push(`Related role family: ${family?.label || jobRoleFamily}`);
      } else {
        roleScore = 8;
      }
    }
  }

  // 2. Skills (25%)
  let skillsScore = 0;
  const jobSkills = new Set((job.skills || []).map((s: string) => s.toLowerCase()));
  const candidateSkills = profile.skills.map((s) => s.toLowerCase());

  let matchedSkillsCount = 0;
  const matchedSkillsList: string[] = [];

  for (const cSkill of candidateSkills) {
    // Exact match
    if (jobSkills.has(cSkill)) {
      matchedSkillsCount++;
      matchedSkillsList.push(cSkill);
      continue;
    }

    // Semantic match: check if any job skill is a synonym of the candidate skill
    // (simplified - full semantic matching happens in smartSkillMatcher)
    for (const jSkill of jobSkills) {
      if (typeof jSkill === 'string' && (jSkill.includes(cSkill) || cSkill.includes(jSkill))) {
        matchedSkillsCount++;
        matchedSkillsList.push(cSkill);
        break;
      }
    }
  }

  if (candidateSkills.length > 0 && matchedSkillsCount > 0) {
    const ratio = Math.min(1.0, matchedSkillsCount / Math.min(candidateSkills.length, 6));
    skillsScore = Math.round(ratio * 25);
    reasons.push(`Key skill overlap: ${matchedSkillsList.slice(0, 3).join(', ')}`);
  } else if (candidateSkills.length > 0) {
    skillsScore = 3; // Minimal score for having skills listed
  }

  // 3. Experience (15%)
  let expScore = 0;
  const jobLevel = job.experience?.level || job.seniority || 'mid';
  const userLevel = profile.experienceLevel;

  if (jobLevel === userLevel || jobLevel === 'unknown') {
    expScore = 15;
    reasons.push(`Experience level matches: ${userLevel}`);
  } else if (jobLevel === 'senior' && userLevel === 'lead') {
    expScore = 12;
  } else if (jobLevel === 'mid' && userLevel === 'senior') {
    expScore = 10;
  } else if (jobLevel === 'junior' && (userLevel === 'mid' || userLevel === 'senior')) {
    expScore = 8;
  } else {
    expScore = 5;
  }

  // 4. Location (10%)
  let locScore = 0;
  const jobRemote = job.location?.remote || job.remote || false;

  if (jobRemote) {
    locScore = 10;
    reasons.push('Remote-compatible position');
  } else {
    const jobCity = (job.location?.city || '').toLowerCase();
    const jobCountry = (job.location?.country || '').toLowerCase();
    for (const loc of profile.targetLocations) {
      const normLoc = loc.toLowerCase();
      if (jobCity.includes(normLoc) || jobCountry.includes(normLoc)) {
        locScore = 10;
        reasons.push(`Located in your target region: ${job.location?.city}`);
        break;
      }
    }
    if (locScore === 0) locScore = 3;
  }

  // Hard constraint: remote requirement
  if (profile.hardConstraints?.remoteOnly && !jobRemote) {
    hardConstraintViolations.push('Requires remote but job is not remote');
  }

  // 5. Workplace Preference (5%)
  let workplaceScore = 0;
  const workplacePref = (profile as any).workplacePreference || 'any';

  if (workplacePref === 'any') {
    workplaceScore = 5; // No preference = full score
  } else if (workplacePref === 'remote' && jobRemote) {
    workplaceScore = 5;
  } else if (workplacePref === 'hybrid' && (job.location?.remoteType === 'hybrid' || job.description?.toLowerCase().includes('hybrid'))) {
    workplaceScore = 5;
  } else if (workplacePref === 'onsite' && !jobRemote) {
    workplaceScore = 5;
  } else {
    workplaceScore = 2; // Partial score - don't penalize too heavily
  }

  // 6. Salary (5%)
  let salScore = 0;
  if (job.salary?.max && profile.minSalary) {
    if (job.salary.max >= profile.minSalary) {
      salScore = 5;
      reasons.push(`Salary meets your target`);
    } else {
      salScore = 1;
    }
  } else {
    salScore = 3; // Unknown salary = moderate score (don't penalize)
  }

  // Hard constraint: minimum salary
  if (profile.hardConstraints?.minSalary && job.salary?.max) {
    if (job.salary.max < profile.hardConstraints.minSalary) {
      hardConstraintViolations.push(`Salary ${job.salary.max} below minimum ${profile.hardConstraints.minSalary}`);
    }
  }

  // 7. Industry (5%)
  let industryScore = 0;
  const preferredIndustries = (profile as any).preferredIndustries || [];
  if (preferredIndustries.length === 0) {
    industryScore = 3; // No preference = moderate score
  } else {
    // Check if job matches any preferred industry
    const jobIndustry = job.industry || job.department || '';
    for (const industry of preferredIndustries) {
      if (jobIndustry.toLowerCase().includes(industry.toLowerCase())) {
        industryScore = 5;
        reasons.push(`Matches preferred industry: ${industry}`);
        break;
      }
    }
    if (industryScore === 0) industryScore = 1;
  }

  // ── Calculate Total ───────────────────────────────────────────────────
  const rawScore =
    roleScore +
    skillsScore +
    expScore +
    locScore +
    workplaceScore +
    salScore +
    industryScore;

  const totalScore = Math.min(98, Math.max(5, rawScore));

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
