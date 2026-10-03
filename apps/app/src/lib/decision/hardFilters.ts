import mongoose from 'mongoose';
import JobApplication from '@/models/JobApplication';
import User from '@/models/User';
import CV from '@/models/CV';

export interface HardFilterContext {
  userId: string;
  job: {
    title: string;
    company: string;
    location?: string;
    salary?: { min?: number; max?: number; currency?: string; period?: string };
    jobDescription?: string;
    atsType?: string;
    sponsorship?: string;
    workMode?: string;
  };
}

export interface HardFilterResult {
  passed: boolean;
  failedChecks: Array<{
    field: string;
    expected: string;
    actual: string;
    reason: string;
  }>;
}

const MANDATORY_FIELDS = ['jobTitle', 'company', 'jobUrl'] as const;

/**
 * Evaluates hard constraints BEFORE expensive AI reasoning.
 * If any hard filter fails, the job should be SKIPPED immediately.
 */
export async function evaluateHardFilters(ctx: HardFilterContext): Promise<HardFilterResult> {
  const failedChecks: HardFilterResult['failedChecks'] = [];

  // 1. Required fields present
  if (!ctx.job.title?.trim()) {
    failedChecks.push({ field: 'title', expected: 'non-empty', actual: 'empty', reason: 'Job title is required' });
  }
  if (!ctx.job.company?.trim()) {
    failedChecks.push({ field: 'company', expected: 'non-empty', actual: 'empty', reason: 'Company name is required' });
  }

  // 2. User hard constraints (from User model preferences)
  const user = await User.findById(ctx.userId).lean() as any;
  if (user) {
    // Work authorization check
    if (user.workAuthorization === 'requires_sponsorship' && ctx.job.sponsorship === 'no') {
      failedChecks.push({
        field: 'sponsorship',
        expected: 'sponsorship available',
        actual: 'no sponsorship',
        reason: 'Job requires US work authorization but user needs sponsorship',
      });
    }

    // Location check (if user has strict location requirement)
    if (user.locationPreference === 'strict' && user.preferredLocation && ctx.job.location) {
      const jobLoc = ctx.job.location.toLowerCase();
      const prefLoc = user.preferredLocation.toLowerCase();
      if (!jobLoc.includes(prefLoc) && !jobLoc.includes('remote')) {
        failedChecks.push({
          field: 'location',
          expected: user.preferredLocation,
          actual: ctx.job.location,
          reason: 'Job location does not match user strict location preference',
        });
      }
    }

    // Salary minimum check
    if (user.minimumSalary && ctx.job.salary?.min) {
      if (ctx.job.salary.max && ctx.job.salary.max < user.minimumSalary) {
        failedChecks.push({
          field: 'salary',
          expected: `>= $${user.minimumSalary.toLocaleString()}`,
          actual: `$${ctx.job.salary.min.toLocaleString()} - $${ctx.job.salary.max.toLocaleString()}`,
          reason: 'Job maximum salary is below user minimum threshold',
        });
      }
    }

    // Employment type check
    if (user.employmentTypePreference && user.employmentTypePreference !== 'any') {
      const desc = (ctx.job.jobDescription || '').toLowerCase();
      const hasType = desc.includes(user.employmentTypePreference);
      if (!hasType && desc.includes('contract') && user.employmentTypePreference === 'full-time') {
        failedChecks.push({
          field: 'employmentType',
          expected: user.employmentTypePreference,
          actual: 'contract',
          reason: 'Job employment type does not match user preference',
        });
      }
    }
  }

  // 3. ATS compatibility check — must be automatable if auto-apply requested
  const automatableAts = ['greenhouse', 'lever', 'ashby', 'workable', 'workday', 'unknown'];
  if (ctx.job.atsType && !automatableAts.includes(ctx.job.atsType)) {
    // Non-automatable ATS — soft warning, not hard fail
  }

  return {
    passed: failedChecks.length === 0,
    failedChecks,
  };
}
