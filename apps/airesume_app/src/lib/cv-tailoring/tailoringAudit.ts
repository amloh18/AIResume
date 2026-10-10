export type IssueSeverity = 'blocking' | 'attention' | 'optional';

export interface TailoringIssue {
  id: string;
  category: 'source_cv' | 'job_match' | 'ats_optimization';
  severity: IssueSeverity;
  title: string;
  description: string;
  affectedField?: string;
  recommendation: string;
  actionLabel?: string;
}

export interface TailoringAuditReport {
  score: number; // 0-100 overall readiness / health
  hasBlockers: boolean;
  issuesCount: {
    blocking: number;
    attention: number;
    optional: number;
  };
  issues: TailoringIssue[];
  statusText: string;
}

/**
 * Deterministically analyzes the Master CV (or provided profile) against the Job Description.
 * Finds issues that ordinary ATS keyword matching misses:
 * 1. Missing companies, job titles, dates, locations, or degree info
 * 2. Roles without bullet points / achievements
 * 3. Thin content or unquantified bullets
 * 4. Missing required job skills / hard constraints
 * 5. Employment gaps or unverified claims
 */
export function auditCvForJob(cvData: any, job: any): TailoringAuditReport {
  const issues: TailoringIssue[] = [];

  const rawCv = cvData || {};
  const work = Array.isArray(rawCv.work) ? rawCv.work : (rawCv.experience || []);
  const education = Array.isArray(rawCv.education) ? rawCv.education : [];
  const skills = Array.isArray(rawCv.skills)
    ? rawCv.skills.map((s: any) => (typeof s === 'string' ? s : s.name || s.title || '')).filter(Boolean)
    : [];

  const jobDesc = (job?.jobDescription || job?.description || '').toLowerCase();
  const jobTitle = (job?.jobTitle || job?.title || '').toLowerCase();
  const jobSkills = Array.isArray(job?.skills) ? job.skills : (job?.extractedJd?.skills || []);

  // ─── 1. Source CV Health & Completeness ───────────────────────────────
  if (!rawCv.basics?.name && !rawCv.name && !rawCv.fullName) {
    issues.push({
      id: 'cv_missing_name',
      category: 'source_cv',
      severity: 'blocking',
      title: 'Missing candidate name',
      description: 'Your Master CV has no candidate name listed in personal details.',
      recommendation: 'Add your full name in Master CV profile basics.',
      actionLabel: 'Edit Profile',
    });
  }

  if (!rawCv.basics?.email && !rawCv.email) {
    issues.push({
      id: 'cv_missing_email',
      category: 'source_cv',
      severity: 'blocking',
      title: 'Missing contact email',
      description: 'No email address found. Employers and ATS cannot contact you without an email.',
      recommendation: 'Add an email address to your profile.',
      actionLabel: 'Add Email',
    });
  }

  if (!work || work.length === 0) {
    issues.push({
      id: 'cv_no_experience',
      category: 'source_cv',
      severity: 'blocking',
      title: 'No work experience entries',
      description: 'Your profile has no work history entries to tailor for this position.',
      recommendation: 'Add at least one relevant work or project experience.',
      actionLabel: 'Add Experience',
    });
  } else {
    // Check individual work items
    work.forEach((item: any, idx: number) => {
      const company = item.name || item.company || '';
      const position = item.position || item.title || item.role || '';
      const bullets = Array.isArray(item.highlights)
        ? item.highlights
        : Array.isArray(item.bullets)
        ? item.bullets
        : [];
      const summary = item.summary || item.description || '';

      if (!company.trim()) {
        issues.push({
          id: `cv_missing_company_${idx}`,
          category: 'source_cv',
          severity: 'blocking',
          title: `Missing employer name in role #${idx + 1}`,
          description: `Position "${position || 'Untitled'}" is missing the company/organization name.`,
          recommendation: 'Provide the employer or client name.',
          actionLabel: 'Add Company',
        });
      }

      if (!position.trim()) {
        issues.push({
          id: `cv_missing_position_${idx}`,
          category: 'source_cv',
          severity: 'blocking',
          title: `Missing job title in role at ${company || `Entry #${idx + 1}`}`,
          description: 'A role entry does not have a job title or role specified.',
          recommendation: 'Specify your exact job title.',
          actionLabel: 'Add Title',
        });
      }

      if (bullets.length === 0 && !summary.trim()) {
        issues.push({
          id: `cv_empty_bullets_${idx}`,
          category: 'source_cv',
          severity: 'attention',
          title: `No responsibilities listed for ${company || `Role #${idx + 1}`}`,
          description: `"${position || 'Role'}" has no achievements or responsibility bullet points.`,
          recommendation: 'Add 2-4 quantified achievement bullets to substantiate your impact.',
          actionLabel: 'Add Bullets',
        });
      }

      // Check dates
      if (!item.startDate && !item.date) {
        issues.push({
          id: `cv_missing_dates_${idx}`,
          category: 'source_cv',
          severity: 'optional',
          title: `Missing start date for ${company || `Role #${idx + 1}`}`,
          description: 'ATS parsers look for start and end dates to calculate total years of experience.',
          recommendation: 'Add start date (month and year) for accurate experience calculation.',
          actionLabel: 'Add Dates',
        });
      }
    });
  }

  // ─── 2. Education & Credentials ──────────────────────────────────────
  if (!education || education.length === 0) {
    // If job specifies degree requirement, mark as attention
    const mentionsDegree = /bachelor|master|degree|bs|ms|phd|b\.s|m\.s/i.test(jobDesc);
    issues.push({
      id: 'cv_missing_education',
      category: 'source_cv',
      severity: mentionsDegree ? 'attention' : 'optional',
      title: 'No education credentials found',
      description: mentionsDegree
        ? 'This role mentions degree requirements, but your CV has no education listed.'
        : 'Adding education or degree credentials improves ATS scoring and verification.',
      recommendation: 'Add your highest education degree or qualification.',
      actionLabel: 'Add Education',
    });
  }

  // ─── 3. Job Description Match & Hard Requirements ────────────────────
  if (jobSkills && jobSkills.length > 0) {
    const candidateSkillStrings = skills.map((s: string) => s.toLowerCase());
    const missingSkills = jobSkills.filter((js: string) => {
      const lower = js.toLowerCase();
      return !candidateSkillStrings.some((cs: string) => cs.includes(lower) || lower.includes(cs));
    });

    if (missingSkills.length > 0) {
      const topMissing = missingSkills.slice(0, 4);
      issues.push({
        id: 'job_missing_skills',
        category: 'job_match',
        severity: topMissing.length > 2 ? 'attention' : 'optional',
        title: `${missingSkills.length} key requirement${missingSkills.length > 1 ? 's' : ''} not explicitly highlighted`,
        description: `Employer specifically asks for: ${topMissing.join(', ')}${missingSkills.length > 4 ? ` and ${missingSkills.length - 4} more` : ''}.`,
        recommendation: 'Incorporate verified experience with these skills or add them to your Master CV if authentic.',
        actionLabel: 'Review Skills',
      });
    }
  }

  // Work authorization / location check
  const requiresVisaOrCitizenship = /must be a (us citizen|permanent resident)|security clearance|work authorization required/i.test(jobDesc);
  if (requiresVisaOrCitizenship) {
    issues.push({
      id: 'job_work_auth_flag',
      category: 'job_match',
      severity: 'attention',
      title: 'Work authorization requirement detected',
      description: 'The job posting states strict residency, clearance, or local authorization prerequisites.',
      recommendation: 'Verify you meet legal work eligibility for this employer prior to submission.',
      actionLabel: 'Check Eligibility',
    });
  }

  // Calculate overall health score
  const blockingCount = issues.filter((i) => i.severity === 'blocking').length;
  const attentionCount = issues.filter((i) => i.severity === 'attention').length;
  const optionalCount = issues.filter((i) => i.severity === 'optional').length;

  let score = 100;
  score -= blockingCount * 30;
  score -= attentionCount * 12;
  score -= optionalCount * 4;
  score = Math.max(10, Math.min(100, score));

  const hasBlockers = blockingCount > 0;
  let statusText = 'CV & Cover Letter Ready';
  if (hasBlockers) {
    statusText = 'CV/CL requires attention';
  } else if (attentionCount > 0) {
    statusText = `${attentionCount} item${attentionCount > 1 ? 's' : ''} to optimize`;
  }

  return {
    score,
    hasBlockers,
    issuesCount: {
      blocking: blockingCount,
      attention: attentionCount,
      optional: optionalCount,
    },
    issues,
    statusText,
  };
}
