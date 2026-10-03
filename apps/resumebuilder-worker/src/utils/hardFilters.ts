/**
 * Hard Requirements Filtering
 *
 * Filters out jobs that are impossible for the candidate to apply to.
 * These are deterministic filters that should be applied before AI scoring.
 */

export interface CandidatePreferences {
  workAuthorization: string[];
  preferredLocations: string[];
  remotePreference: 'remote' | 'hybrid' | 'onsite' | 'any';
  minSalary?: number;
  maxSalary?: number;
  currency?: string;
  preferredEmploymentTypes: string[];
  requiredCertifications?: string[];
  preferredEducation?: string;
  blockedCompanies?: string[];
  blockedDomains?: string[];
}

export interface JobHardRequirements {
  workAuthorizationRequired?: string[];
  location: string;
  remoteType: 'remote' | 'hybrid' | 'on_site' | 'unknown';
  salary?: {
    min?: number;
    max?: number;
    currency?: string;
  };
  employmentType: string;
  requiredCertifications?: string[];
  requiredEducation?: string;
  company: {
    name: string;
    domain?: string;
  };
  isExpired?: boolean;
  isRemoved?: boolean;
}

export interface FilterResult {
  passes: boolean;
  reasons: string[];
  confidence: number;
}

/**
 * Apply all hard filters to determine if a job should be skipped
 */
export function applyHardFilters(
  candidate: CandidatePreferences,
  job: JobHardRequirements
): FilterResult {
  const reasons: string[] = [];
  let confidence = 1.0;

  // 1. Work Authorization Filter
  if (job.workAuthorizationRequired && job.workAuthorizationRequired.length > 0) {
    const hasRequiredAuth = job.workAuthorizationRequired.some((req) =>
      candidate.workAuthorization.some(
        (auth) => auth.toLowerCase().includes(req.toLowerCase())
      )
    );

    if (!hasRequiredAuth) {
      reasons.push(`Requires ${job.workAuthorizationRequired.join(', ')} work authorization`);
      confidence = Math.min(confidence, 0.97);
    }
  }

  // 2. Location Filter
  if (job.remoteType !== 'remote' && job.remoteType !== 'unknown') {
    if (candidate.remotePreference === 'remote' && job.remoteType === 'on_site') {
      reasons.push('Job requires onsite work, candidate prefers remote');
      confidence = Math.min(confidence, 0.9);
    }

    // Check if job location matches candidate preferences
    if (
      candidate.preferredLocations.length > 0 &&
      !candidate.preferredLocations.some(
        (loc) => job.location.toLowerCase().includes(loc.toLowerCase())
      )
    ) {
      reasons.push(`Job location (${job.location}) not in preferred locations`);
      confidence = Math.min(confidence, 0.85);
    }
  }

  // 3. Salary Filter
  if (job.salary && candidate.minSalary) {
    if (job.salary.max && job.salary.max < candidate.minSalary) {
      reasons.push(
        `Job salary max ($${job.salary.max}) below candidate minimum ($${candidate.minSalary})`
      );
      confidence = Math.min(confidence, 0.95);
    }
  }

  // 4. Employment Type Filter
  if (
    candidate.preferredEmploymentTypes.length > 0 &&
    !candidate.preferredEmploymentTypes.includes(job.employmentType)
  ) {
    reasons.push(
      `Employment type (${job.employmentType}) not in preferred types (${candidate.preferredEmploymentTypes.join(', ')})`
    );
    confidence = Math.min(confidence, 0.8);
  }

  // 5. Certification Filter
  if (job.requiredCertifications && job.requiredCertifications.length > 0) {
    const hasRequiredCert = job.requiredCertifications.some((cert) =>
      candidate.requiredCertifications?.some(
        (c) => c.toLowerCase().includes(cert.toLowerCase())
      )
    );

    if (!hasRequiredCert) {
      reasons.push(`Missing required certification: ${job.requiredCertifications.join(', ')}`);
      confidence = Math.min(confidence, 0.95);
    }
  }

  // 6. Education Filter
  if (job.requiredEducation && candidate.preferredEducation) {
    const educationLevels = ['high school', 'associate', 'bachelor', 'master', 'phd'];
    const requiredLevel = educationLevels.findIndex((level) =>
      job.requiredEducation!.toLowerCase().includes(level)
    );
    const candidateLevel = educationLevels.findIndex((level) =>
      candidate.preferredEducation!.toLowerCase().includes(level)
    );

    if (requiredLevel > candidateLevel && requiredLevel >= 0 && candidateLevel >= 0) {
      reasons.push(
        `Required education (${job.requiredEducation}) exceeds candidate education (${candidate.preferredEducation})`
      );
      confidence = Math.min(confidence, 0.85);
    }
  }

  // 7. Company Blocklist Filter
  if (candidate.blockedCompanies && candidate.blockedCompanies.length > 0) {
    if (
      candidate.blockedCompanies.some(
        (company) => job.company.name.toLowerCase().includes(company.toLowerCase())
      )
    ) {
      reasons.push(`Company (${job.company.name}) is in blocklist`);
      confidence = Math.min(confidence, 1.0);
    }
  }

  // 8. Domain Blocklist Filter
  if (candidate.blockedDomains && candidate.blockedDomains.length > 0 && job.company.domain) {
    if (candidate.blockedDomains.includes(job.company.domain)) {
      reasons.push(`Company domain (${job.company.domain}) is in blocklist`);
      confidence = Math.min(confidence, 1.0);
    }
  }

  // 9. Expired/Removed Job Filter
  if (job.isExpired) {
    reasons.push('Job is expired');
    confidence = Math.min(confidence, 1.0);
  }

  if (job.isRemoved) {
    reasons.push('Job has been removed');
    confidence = Math.min(confidence, 1.0);
  }

  return {
    passes: reasons.length === 0,
    reasons,
    confidence,
  };
}

/**
 * Check if a job should be skipped based on do-not-apply rules
 */
export function shouldNotApply(
  candidate: CandidatePreferences,
  job: JobHardRequirements,
  applicationHistory: {
    alreadyApplied?: boolean;
    duplicateJob?: boolean;
    unsupportedAts?: boolean;
  } = {}
): FilterResult {
  const reasons: string[] = [];
  let confidence = 1.0;

  // Apply hard filters first
  const hardFilterResult = applyHardFilters(candidate, job);
  if (!hardFilterResult.passes) {
    reasons.push(...hardFilterResult.reasons);
    confidence = Math.min(confidence, hardFilterResult.confidence);
  }

  // Do-not-apply rules
  if (applicationHistory.alreadyApplied) {
    reasons.push('Already applied to this job');
    confidence = Math.min(confidence, 1.0);
  }

  if (applicationHistory.duplicateJob) {
    reasons.push('Duplicate job listing');
    confidence = Math.min(confidence, 1.0);
  }

  if (applicationHistory.unsupportedAts) {
    reasons.push('Unsupported ATS platform');
    confidence = Math.min(confidence, 0.9);
  }

  return {
    passes: reasons.length === 0,
    reasons,
    confidence,
  };
}
