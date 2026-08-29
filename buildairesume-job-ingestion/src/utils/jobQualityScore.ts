/**
 * Job Quality Score Calculation
 *
 * Separates three distinct scores:
 * 1. Candidate Fit (0-100) - How well the candidate matches the job
 * 2. Opportunity Quality (0-100) - How good the job opportunity is
 * 3. Application Readiness (0-100) - How ready the application is
 *
 * Then calculates Application Opportunity Score using configurable weights.
 */

export interface CandidateProfile {
  skills: string[];
  experienceYears: number;
  experienceLevel: 'entry' | 'mid' | 'senior' | 'lead' | 'executive';
  location: string;
  remotePreference: 'remote' | 'hybrid' | 'onsite' | 'any';
  salaryExpectation?: {
    min?: number;
    max?: number;
    currency?: string;
  };
  workAuthorization: string[];
  education?: string;
  certifications?: string[];
}

export interface JobRequirements {
  requiredSkills: string[];
  preferredSkills: string[];
  minExperienceYears?: number;
  maxExperienceYears?: number;
  experienceLevel: 'entry' | 'mid' | 'senior' | 'lead' | 'executive';
  location: string;
  remoteType: 'remote' | 'hybrid' | 'on_site' | 'unknown';
  salary?: {
    min?: number;
    max?: number;
    currency?: string;
  };
  requiredEducation?: string;
  requiredCertifications?: string[];
  workAuthorizationRequired?: string[];
  employmentType: string;
  visaSponsorship?: boolean;
}

export interface QualityConfig {
  /** Weights for Application Opportunity Score calculation */
  weights: {
    candidateFit: number;
    opportunityQuality: number;
    applicationReadiness: number;
  };
  /** Minimum score threshold for auto-apply */
  autoApplyThreshold: number;
  /** Minimum score threshold for review */
  reviewThreshold: number;
  /** Minimum score threshold for manual */
  manualThreshold: number;
}

export const DEFAULT_QUALITY_CONFIG: QualityConfig = {
  weights: {
    candidateFit: 0.5,
    opportunityQuality: 0.3,
    applicationReadiness: 0.2,
  },
  autoApplyThreshold: 90,
  reviewThreshold: 80,
  manualThreshold: 70,
};

export interface QualityResult {
  candidateFit: number;
  opportunityQuality: number;
  applicationReadiness: number;
  applicationOpportunityScore: number;
  recommendation: 'auto' | 'review' | 'manual' | 'skip';
  reasons: string[];
}

/**
 * Calculate how well a candidate matches a job
 */
export function calculateCandidateFit(
  profile: CandidateProfile,
  requirements: JobRequirements
): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;
  let totalWeight = 0;

  // Skills match (40% weight)
  const skillsWeight = 0.4;
  const requiredSkillsMatch = requirements.requiredSkills.filter((skill) =>
    profile.skills.some(
      (ps) =>
        ps.toLowerCase().includes(skill.toLowerCase()) ||
        skill.toLowerCase().includes(ps.toLowerCase())
    )
  );
  const requiredSkillsScore =
    requirements.requiredSkills.length > 0
      ? (requiredSkillsMatch.length / requirements.requiredSkills.length) * 100
      : 100;

  const preferredSkillsMatch = requirements.preferredSkills.filter((skill) =>
    profile.skills.some(
      (ps) =>
        ps.toLowerCase().includes(skill.toLowerCase()) ||
        skill.toLowerCase().includes(ps.toLowerCase())
    )
  );
  const preferredSkillsScore =
    requirements.preferredSkills.length > 0
      ? (preferredSkillsMatch.length / requirements.preferredSkills.length) * 100
      : 100;

  const skillsScore = requiredSkillsScore * 0.7 + preferredSkillsScore * 0.3;
  score += skillsScore * skillsWeight;
  totalWeight += skillsWeight;

  if (requiredSkillsMatch.length < requirements.requiredSkills.length) {
    const missing = requirements.requiredSkills.length - requiredSkillsMatch.length;
    reasons.push(`Missing ${missing} required skill(s)`);
  }

  // Experience level match (25% weight)
  const experienceWeight = 0.25;
  const levelOrder = ['entry', 'mid', 'senior', 'lead', 'executive'];
  const profileLevelIndex = levelOrder.indexOf(profile.experienceLevel);
  const requiredLevelIndex = levelOrder.indexOf(requirements.experienceLevel);
  const levelDiff = Math.abs(profileLevelIndex - requiredLevelIndex);
  const experienceScore = Math.max(0, 100 - levelDiff * 25);
  score += experienceScore * experienceWeight;
  totalWeight += experienceWeight;

  if (levelDiff > 1) {
    reasons.push(`Experience level mismatch (candidate: ${profile.experienceLevel}, required: ${requirements.experienceLevel})`);
  }

  // Location match (15% weight)
  const locationWeight = 0.15;
  let locationScore = 0;
  if (requirements.remoteType === 'remote' && profile.remotePreference === 'remote') {
    locationScore = 100;
  } else if (requirements.remoteType === 'hybrid' && profile.remotePreference !== 'onsite') {
    locationScore = 80;
  } else if (requirements.remoteType === 'on_site') {
    // Check if locations match (simplified)
    locationScore = profile.location.toLowerCase().includes(requirements.location.toLowerCase()) ? 100 : 30;
  } else {
    locationScore = 50; // Unknown, moderate score
  }
  score += locationScore * locationWeight;
  totalWeight += locationWeight;

  // Salary match (10% weight)
  const salaryWeight = 0.1;
  let salaryScore = 50; // Default moderate score
  if (profile.salaryExpectation && requirements.salary) {
    if (requirements.salary.max && profile.salaryExpectation.min) {
      if (profile.salaryExpectation.min <= requirements.salary.max) {
        salaryScore = 90;
      } else {
        salaryScore = 30;
        reasons.push('Salary expectation exceeds job budget');
      }
    } else {
      salaryScore = 70; // Partial info
    }
  }
  score += salaryScore * salaryWeight;
  totalWeight += salaryWeight;

  // Work authorization match (10% weight)
  const authWeight = 0.1;
  let authScore = 100;
  if (
    requirements.workAuthorizationRequired &&
    requirements.workAuthorizationRequired.length > 0
  ) {
    const hasAuth = requirements.workAuthorizationRequired.some((req) =>
      profile.workAuthorization.some(
        (auth) => auth.toLowerCase().includes(req.toLowerCase())
      )
    );
    if (!hasAuth) {
      authScore = 0;
      reasons.push('Missing required work authorization');
    }
  }
  score += authScore * authWeight;
  totalWeight += authWeight;

  // Final score
  const finalScore = totalWeight > 0 ? Math.round(score / totalWeight) : 50;

  return {
    score: finalScore,
    reasons,
  };
}

/**
 * Calculate the quality of the job opportunity itself
 */
export function calculateOpportunityQuality(job: {
  salary?: { min?: number; max?: number; currency?: string };
  remoteType: string;
  employmentType: string;
  description: string;
  benefits: string[];
  company: { name: string };
  postedAt?: Date;
}): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 50; // Base score

  // Salary transparency (20% weight)
  if (job.salary && (job.salary.min || job.salary.max)) {
    score += 20;
    reasons.push('Salary disclosed');
  } else {
    reasons.push('Salary not disclosed');
  }

  // Remote work (15% weight)
  if (job.remoteType === 'remote') {
    score += 15;
    reasons.push('Remote work available');
  } else if (job.remoteType === 'hybrid') {
    score += 8;
    reasons.push('Hybrid work available');
  }

  // Benefits listed (10% weight)
  if (job.benefits && job.benefits.length > 3) {
    score += 10;
    reasons.push(`${job.benefits.length} benefits listed`);
  }

  // Job description quality (15% weight)
  if (job.description && job.description.length > 500) {
    score += 15;
    reasons.push('Detailed job description');
  } else if (job.description && job.description.length > 200) {
    score += 8;
    reasons.push('Moderate job description');
  } else {
    reasons.push('Brief job description');
  }

  // Employment type (10% weight)
  if (job.employmentType === 'full_time') {
    score += 10;
    reasons.push('Full-time position');
  }

  // Freshness bonus (10% weight)
  if (job.postedAt) {
    const ageHours = (Date.now() - new Date(job.postedAt).getTime()) / (1000 * 60 * 60);
    if (ageHours < 24) {
      score += 10;
      reasons.push('Recently posted');
    } else if (ageHours < 72) {
      score += 5;
      reasons.push('Posted within last 3 days');
    }
  }

  return {
    score: Math.min(100, Math.max(0, score)),
    reasons,
  };
}

/**
 * Calculate how ready the application is for submission
 */
export function calculateApplicationReadiness(application: {
  hasResume: boolean;
  hasCoverLetter: boolean;
  requiredFieldsCompleted: number;
  totalRequiredFields: number;
  hasApplicationUrl: boolean;
  hasContactInfo: boolean;
}): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;

  // Resume ready (30% weight)
  if (application.hasResume) {
    score += 30;
    reasons.push('Resume ready');
  } else {
    reasons.push('Resume not ready');
  }

  // Cover letter ready (20% weight)
  if (application.hasCoverLetter) {
    score += 20;
    reasons.push('Cover letter ready');
  } else {
    reasons.push('Cover letter not ready');
  }

  // Required fields completed (30% weight)
  const fieldsCompletion =
    application.totalRequiredFields > 0
      ? (application.requiredFieldsCompleted / application.totalRequiredFields) * 100
      : 100;
  score += (fieldsCompletion / 100) * 30;
  if (fieldsCompletion < 100) {
    reasons.push(`${application.totalRequiredFields - application.requiredFieldsCompleted} required field(s) missing`);
  }

  // Application URL available (10% weight)
  if (application.hasApplicationUrl) {
    score += 10;
    reasons.push('Application URL available');
  } else {
    reasons.push('Application URL missing');
  }

  // Contact info available (10% weight)
  if (application.hasContactInfo) {
    score += 10;
    reasons.push('Contact information ready');
  } else {
    reasons.push('Contact information missing');
  }

  return {
    score: Math.min(100, Math.max(0, Math.round(score))),
    reasons,
  };
}

/**
 * Calculate the overall Application Opportunity Score
 */
export function calculateApplicationOpportunityScore(
  candidateFit: number,
  opportunityQuality: number,
  applicationReadiness: number,
  config: QualityConfig = DEFAULT_QUALITY_CONFIG
): QualityResult {
  // Weighted average
  const applicationOpportunityScore = Math.round(
    candidateFit * config.weights.candidateFit +
      opportunityQuality * config.weights.opportunityQuality +
      applicationReadiness * config.weights.applicationReadiness
  );

  // Determine recommendation
  let recommendation: QualityResult['recommendation'];
  if (applicationOpportunityScore >= config.autoApplyThreshold) {
    recommendation = 'auto';
  } else if (applicationOpportunityScore >= config.reviewThreshold) {
    recommendation = 'review';
  } else if (applicationOpportunityScore >= config.manualThreshold) {
    recommendation = 'manual';
  } else {
    recommendation = 'skip';
  }

  return {
    candidateFit,
    opportunityQuality,
    applicationReadiness,
    applicationOpportunityScore,
    recommendation,
    reasons: [],
  };
}
