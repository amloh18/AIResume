import { CandidateMatchingProfile } from './candidateProfileExtractor';

export interface MatchScoreResult {
  score: number; // 0 - 100
  breakdown: {
    title: number;
    skills: number;
    experience: number;
    location: number;
    salary: number;
    visa: number;
  };
  reasons: string[];
}

export function scoreJobForCandidate(job: any, profile: CandidateMatchingProfile): MatchScoreResult {
  const reasons: string[] = [];

  // 1. Title Similarity (30%)
  let titleScore = 15;
  const jobTitleNorm = (job.normalizedTitle || job.title || '').toLowerCase();
  for (const targetRole of profile.targetRoles) {
    const normTarget = targetRole.toLowerCase();
    if (jobTitleNorm.includes(normTarget) || normTarget.includes(jobTitleNorm)) {
      titleScore = 30;
      reasons.push(`Direct target role match: "${job.title}"`);
      break;
    }
  }

  // 2. Skills Overlap (25%)
  let skillsScore = 5;
  const jobSkills = new Set((job.skills || []).map((s: string) => s.toLowerCase()));
  const candidateSkills = profile.skills.map((s) => s.toLowerCase());

  let matchedSkillsCount = 0;
  const matchedSkillsList: string[] = [];
  for (const cSkill of candidateSkills) {
    if (jobSkills.has(cSkill)) {
      matchedSkillsCount++;
      matchedSkillsList.push(cSkill);
    }
  }

  if (candidateSkills.length > 0) {
    const ratio = Math.min(1.0, matchedSkillsCount / Math.min(candidateSkills.length, 6));
    skillsScore = Math.round(ratio * 25);
    if (matchedSkillsList.length > 0) {
      reasons.push(`Key skill overlap in ${matchedSkillsList.slice(0, 3).join(', ')}`);
    }
  }

  // 3. Experience Alignment (15%)
  let expScore = 10;
  const jobLevel = job.experience?.level || 'mid';
  if (jobLevel === profile.experienceLevel || jobLevel === 'unknown') {
    expScore = 15;
  } else if (jobLevel === 'senior' && profile.experienceLevel === 'lead') {
    expScore = 12;
  }

  // 4. Location & Remote Compatibility (15%)
  let locScore = 10;
  if (job.location?.remote || job.location?.remoteType === 'remote') {
    locScore = 15;
    reasons.push('Verified remote-compatible position');
  } else {
    const jobCity = (job.location?.city || '').toLowerCase();
    const jobCountry = (job.location?.country || '').toLowerCase();
    for (const loc of profile.targetLocations) {
      const normLoc = loc.toLowerCase();
      if (jobCity.includes(normLoc) || jobCountry.includes(normLoc)) {
        locScore = 15;
        reasons.push(`Located in your target region: ${job.location?.city}`);
        break;
      }
    }
  }

  // 5. Salary Alignment (10%)
  let salScore = 8;
  if (job.salary?.max && profile.minSalary) {
    if (job.salary.max >= profile.minSalary) {
      salScore = 10;
      reasons.push(`Salary meets your target (${job.salary.currency || '$'}${job.salary.max.toLocaleString()})`);
    } else {
      salScore = 4;
    }
  }

  // 6. Visa Compatibility (5%)
  let visaScore = 5;
  if (profile.needsVisaSponsorship) {
    if (job.visaSponsorship?.mentioned) {
      visaScore = 5;
      reasons.push('Verified visa sponsorship mentioned');
    } else {
      visaScore = 0;
    }
  }

  const totalScore = Math.min(100, Math.max(20, titleScore + skillsScore + expScore + locScore + salScore + visaScore));

  return {
    score: totalScore,
    breakdown: {
      title: titleScore,
      skills: skillsScore,
      experience: expScore,
      location: locScore,
      salary: salScore,
      visa: visaScore,
    },
    reasons,
  };
}
