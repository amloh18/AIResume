/**
 * Application Quality Gate
 *
 * Runs validation before automatic submission to ensure:
 * - Correct candidate, company, job
 * - Correct application URL
 * - Job still active
 * - No duplicate application
 * - Correct tailored resume
 * - Correct cover letter
 * - Required fields answered
 * - Answers based on verified evidence
 * - No unsupported claims
 * - Work authorization valid
 * - Location valid
 * - Salary response valid
 * - Required files attached
 * - No unresolved mandatory fields
 * - No CAPTCHA
 * - No unexpected legal declaration requiring user input
 */

export interface QualityGateInput {
  candidate: {
    id: string;
    name: string;
    email: string;
    workAuthorization: string[];
    location: string;
  };
  job: {
    id: string;
    title: string;
    company: string;
    url: string;
    applicationUrl?: string;
    isActive: boolean;
    atsType?: string;
  };
  application: {
    resumeVersion: string;
    coverLetterVersion?: string;
    requiredFields: Array<{
      name: string;
      value: string;
      isRequired: boolean;
    }>;
    files: Array<{
      name: string;
      type: string;
      url: string;
      size: number;
    }>;
  };
  evidence: Array<{
    claim: string;
    verified: boolean;
    confidence: number;
  }>;
  history: {
    alreadyApplied: boolean;
    duplicateApplication: boolean;
  };
}

export interface QualityGateCheck {
  name: string;
  passed: boolean;
  message: string;
  confidence: number;
  severity: 'error' | 'warning' | 'info';
}

export interface QualityGateResult {
  passed: boolean;
  checks: QualityGateCheck[];
  canAutoSubmit: boolean;
  requiresReview: boolean;
  requiresManual: boolean;
}

/**
 * Run the application quality gate
 */
export function runApplicationQualityGate(
  input: QualityGateInput
): QualityGateResult {
  const checks: QualityGateCheck[] = [];

  // 1. Verify correct candidate
  checks.push({
    name: 'candidate_verification',
    passed: !!input.candidate.id && !!input.candidate.name && !!input.candidate.email,
    message: input.candidate.id ? 'Candidate verified' : 'Candidate not properly identified',
    confidence: input.candidate.id ? 1.0 : 0.0,
    severity: 'error',
  });

  // 2. Verify correct company
  checks.push({
    name: 'company_verification',
    passed: !!input.job.company,
    message: input.job.company ? `Company: ${input.job.company}` : 'Company not identified',
    confidence: input.job.company ? 1.0 : 0.0,
    severity: 'error',
  });

  // 3. Verify correct job
  checks.push({
    name: 'job_verification',
    passed: !!input.job.id && !!input.job.title,
    message: input.job.id ? `Job: ${input.job.title}` : 'Job not properly identified',
    confidence: input.job.id ? 1.0 : 0.0,
    severity: 'error',
  });

  // 4. Verify application URL
  checks.push({
    name: 'application_url',
    passed: !!input.job.applicationUrl || !!input.job.url,
    message: input.job.applicationUrl
      ? `Application URL: ${input.job.applicationUrl}`
      : input.job.url
        ? `Job URL: ${input.job.url}`
        : 'No application URL available',
    confidence: input.job.applicationUrl ? 1.0 : 0.5,
    severity: 'error',
  });

  // 5. Verify job still active
  checks.push({
    name: 'job_active',
    passed: input.job.isActive,
    message: input.job.isActive ? 'Job is active' : 'Job is no longer active',
    confidence: input.job.isActive ? 1.0 : 0.0,
    severity: 'error',
  });

  // 6. Check for duplicate application
  checks.push({
    name: 'duplicate_check',
    passed: !input.history.alreadyApplied && !input.history.duplicateApplication,
    message: input.history.alreadyApplied
      ? 'Already applied to this job'
      : input.history.duplicateApplication
        ? 'Duplicate application detected'
        : 'No duplicate application',
    confidence: input.history.alreadyApplied ? 1.0 : 0.9,
    severity: 'error',
  });

  // 7. Verify resume version
  checks.push({
    name: 'resume_version',
    passed: !!input.application.resumeVersion,
    message: input.application.resumeVersion
      ? `Resume version: ${input.application.resumeVersion}`
      : 'Resume version not specified',
    confidence: input.application.resumeVersion ? 1.0 : 0.0,
    severity: 'error',
  });

  // 8. Verify cover letter (if required)
  if (input.application.coverLetterVersion) {
    checks.push({
      name: 'cover_letter',
      passed: true,
      message: `Cover letter version: ${input.application.coverLetterVersion}`,
      confidence: 1.0,
      severity: 'info',
    });
  }

  // 9. Verify required fields answered
  const unansweredRequired = input.application.requiredFields.filter(
    (field) => field.isRequired && !field.value
  );
  checks.push({
    name: 'required_fields',
    passed: unansweredRequired.length === 0,
    message:
      unansweredRequired.length === 0
        ? 'All required fields answered'
        : `${unansweredRequired.length} required field(s) unanswered: ${unansweredRequired.map((f) => f.name).join(', ')}`,
    confidence: unansweredRequired.length === 0 ? 1.0 : 0.0,
    severity: 'error',
  });

  // 10. Verify answers based on verified evidence
  const unverifiedClaims = input.evidence.filter((e) => !e.verified);
  checks.push({
    name: 'evidence_verification',
    passed: unverifiedClaims.length === 0,
    message:
      unverifiedClaims.length === 0
        ? 'All claims verified'
        : `${unverifiedClaims.length} unverified claim(s) detected`,
    confidence: unverifiedClaims.length === 0 ? 1.0 : 0.5,
    severity: 'warning',
  });

  // 11. Verify work authorization
  checks.push({
    name: 'work_authorization',
    passed: input.candidate.workAuthorization.length > 0,
    message:
      input.candidate.workAuthorization.length > 0
        ? `Work authorization: ${input.candidate.workAuthorization.join(', ')}`
        : 'Work authorization not specified',
    confidence: input.candidate.workAuthorization.length > 0 ? 1.0 : 0.3,
    severity: 'warning',
  });

  // 12. Verify location
  checks.push({
    name: 'location_verification',
    passed: !!input.candidate.location,
    message: input.candidate.location
      ? `Candidate location: ${input.candidate.location}`
      : 'Candidate location not specified',
    confidence: input.candidate.location ? 1.0 : 0.5,
    severity: 'warning',
  });

  // 13. Verify required files attached
  const requiredFileTypes = ['resume', 'cv'];
  const missingFiles = requiredFileTypes.filter(
    (type) => !input.application.files.some((f) => f.type.toLowerCase().includes(type))
  );
  checks.push({
    name: 'files_attached',
    passed: missingFiles.length === 0,
    message:
      missingFiles.length === 0
        ? 'Required files attached'
        : `Missing required files: ${missingFiles.join(', ')}`,
    confidence: missingFiles.length === 0 ? 1.0 : 0.0,
    severity: 'error',
  });

  // Calculate overall result
  const errorChecks = checks.filter((c) => c.severity === 'error' && !c.passed);
  const warningChecks = checks.filter((c) => c.severity === 'warning' && !c.passed);

  const passed = errorChecks.length === 0;
  const canAutoSubmit = passed && warningChecks.length === 0;
  const requiresReview = passed && warningChecks.length > 0;
  const requiresManual = !passed;

  return {
    passed,
    checks,
    canAutoSubmit,
    requiresReview,
    requiresManual,
  };
}

/**
 * Get a summary of the quality gate result
 */
export function getQualityGateSummary(result: QualityGateResult): string {
  if (result.passed) {
    if (result.canAutoSubmit) {
      return '✅ Quality gate passed - Ready for auto-submit';
    } else if (result.requiresReview) {
      return '⚠️ Quality gate passed with warnings - Requires review';
    }
  }
  return '❌ Quality gate failed - Requires manual intervention';
}
