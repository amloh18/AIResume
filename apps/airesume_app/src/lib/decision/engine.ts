import mongoose from 'mongoose';
import JobApplication from '@/models/JobApplication';
import User from '@/models/User';
import CV from '@/models/CV';
import { evaluateHardFilters, type HardFilterContext } from './hardFilters';
import { checkDuplicate, type DuplicateCheckResult } from './duplicateCheck';
import { assessApplicationRisk, type RiskAssessment } from './riskAssessment';

export interface DecisionInput {
  userId: string;
  job: {
    title: string;
    company: string;
    jobUrl?: string;
    jobDescription?: string;
    location?: string;
    salary?: { min?: number; max?: number; currency?: string; period?: string };
    atsType?: string;
    sponsorship?: string;
    workMode?: string;
    source?: string;
    postedAgeDays?: number;
    applicantsCount?: number;
  };
  requestedMode?: 'auto' | 'review' | 'manual';
}

export type ApplicationMode = 'auto' | 'review' | 'manual' | 'skip';

export interface DecisionResult {
  mode: ApplicationMode;
  reason: string;
  hardFilters?: { passed: boolean; failedChecks: any[] };
  duplicate?: DuplicateCheckResult;
  risk?: RiskAssessment;
  matchScore?: number;
  selectedCvId?: string;
  warnings: string[];
}

/**
 * Central decision engine: evaluates a job against all signals and returns
 * the recommended application mode (auto/review/manual/skip).
 *
 * Call this BEFORE enqueuing or executing any application.
 */
export async function makeApplicationDecision(input: DecisionInput): Promise<DecisionResult> {
  const warnings: string[] = [];

  // 1. Hard Filters — immediate skip if any fail
  const hardFilterCtx: HardFilterContext = { userId: input.userId, job: input.job };
  const hardFilters = await evaluateHardFilters(hardFilterCtx);
  if (!hardFilters.passed) {
    return {
      mode: 'skip',
      reason: `Hard filter failed: ${hardFilters.failedChecks.map((c) => c.reason).join('; ')}`,
      hardFilters,
      warnings,
    };
  }

  // 2. Duplicate Check
  const duplicate = await checkDuplicate(input.userId, {
    title: input.job.title,
    company: input.job.company,
    jobUrl: input.job.jobUrl,
  });
  if (duplicate.isDuplicate) {
    return {
      mode: 'skip',
      reason: `Duplicate application detected (existing: ${duplicate.existingApplicationId}, match: ${duplicate.matchReason})`,
      duplicate,
      warnings,
    };
  }

  // 3. Risk Assessment
  const risk = assessApplicationRisk({
    atsType: input.job.atsType,
    jobUrl: input.job.jobUrl,
    salaryMax: input.job.salary?.max,
    jobDescription: input.job.jobDescription,
    company: input.job.company,
    postedAgeDays: input.job.postedAgeDays,
    applicantsCount: input.job.applicantsCount,
  });

  if (risk.recommendation === 'skip') {
    return {
      mode: 'skip',
      reason: `High risk (${risk.riskScore}/100): ${risk.factors.filter((f) => f.triggered).map((f) => f.description).join('; ')}`,
      risk,
      warnings,
    };
  }

  // 4. Match Score (basic skill match — no AI call here, just keyword)
  const matchScore = computeBasicMatchScore(input);

  // 5. Determine mode — the risk assessment is the gate; the match score only advises.
  let mode: ApplicationMode = risk.recommendation;

  /*
    A high match may still *upgrade* a review decision to auto, but a low one must never downgrade
    auto to review.

    `computeBasicMatchScore` below is a keyword counter over a hardcoded tech-vocabulary list, so it
    returns 0–40 for every non-software role and cannot be treated as a safety signal. Using it as a
    veto silently moved ~92% of applications out of `auto` and into `review` (measured 2026-09-27:
    92 of 99 applications scored ≤40) — and `review` prepares documents without ever submitting, so
    the application simply waited for an approval click that was never meant to be required.

    Safety belongs to `assessApplicationRisk` above (unknown ATS, missing URL, expired listing) and to
    the missing-CV check below. Relevance belongs to ranking. Conflating the two is what broke
    auto-apply.
  */
  if (mode === 'review' && matchScore >= 90) {
    mode = 'auto';
    warnings.push('Upgraded to auto due to high match score');
  }

  if (mode === 'auto' && matchScore < 70) {
    warnings.push(
      `Low keyword match (${matchScore}%) — ranked lower, but not a reason to withhold submission`
    );
  }

  // User-requested mode override (if stricter than computed)
  if (input.requestedMode) {
    if (input.requestedMode === 'manual') mode = 'manual';
    if (input.requestedMode === 'auto') mode = 'auto';
  }

  // 6. Select best CV
  const selectedCvId = await selectBestCv(input.userId, input.job);

  if (!selectedCvId) {
    warnings.push('No CV found for user — application will need manual CV upload');
    if (mode === 'auto') mode = 'review';
  }

  return {
    mode,
    reason: `Decision: ${mode} (match: ${matchScore}%, risk: ${risk.riskLevel} ${risk.riskScore}/100)`,
    hardFilters,
    duplicate,
    risk,
    matchScore,
    selectedCvId,
    warnings,
  };
}

/**
 * Basic keyword match score — no AI, just presence of key terms from job in CV.
 */
function computeBasicMatchScore(input: DecisionInput): number {
  const desc = (input.job.jobDescription || '').toLowerCase();
  const title = (input.job.title || '').toLowerCase();

  // Extract skill keywords from job description (simple heuristic)
  const techKeywords = [
    'react', 'next.js', 'typescript', 'javascript', 'python', 'java', 'go', 'golang',
    'rust', 'node.js', 'node', 'aws', 'gcp', 'azure', 'docker', 'kubernetes', 'k8s',
    'graphql', 'rest', 'api', 'microservices', 'postgresql', 'mongodb', 'redis',
    'machine learning', 'ml', 'ai', 'llm', 'nlp', 'sql', 'nosql', 'ci/cd', 'git',
    'terraform', 'linux', 'figma', 'design', 'agile', 'scrum', 'product',
  ];

  const matchedCount = techKeywords.filter((kw) => desc.includes(kw) || title.includes(kw)).length;
  const totalRelevant = Math.min(techKeywords.length, 10); // cap at 10 relevant keywords

  return Math.round((matchedCount / totalRelevant) * 100);
}

/**
 * Selects the best CV for this job based on CV metadata tags and job keywords.
 */
async function selectBestCv(userId: string, job: { title: string; company: string; jobDescription?: string }): Promise<string | undefined> {
  const cvs = await CV.find({ userId }).lean();
  if (!cvs.length) return undefined;

  // Prefer master CV
  const master = cvs.find((cv: any) => cv.metadata?.isMaster);
  if (master) return String(master._id);

  // Otherwise return first available
  return String(cvs[0]._id);
}
