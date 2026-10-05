import mongoose from 'mongoose';
import JobApplication from '@/models/JobApplication';

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  existingApplicationId?: string;
  matchReason?: 'exact_title_company' | 'same_job_url' | 'similar_title_company';
}

/**
 * Checks if the user already has an application for this job.
 * Dedup strategy (in priority order):
 * 1. Same job URL
 * 2. Same title + company (case-insensitive)
 */
export async function checkDuplicate(
  userId: string,
  job: { title: string; company: string; jobUrl?: string }
): Promise<DuplicateCheckResult> {
  let userIdObj: any = userId;
  try {
    if (mongoose.Types.ObjectId.isValid(userId)) {
      userIdObj = new mongoose.Types.ObjectId(userId);
    }
  } catch {
    userIdObj = userId;
  }

  const userFilter = { $or: [{ userId: userIdObj }, { userId: String(userId) }] };

  // 1. Check by job URL (strongest signal)
  if (job.jobUrl) {
    const existingByUrl = await JobApplication.findOne({
      ...userFilter,
      jobUrl: job.jobUrl,
    }).lean();

    if (existingByUrl) {
      return {
        isDuplicate: true,
        existingApplicationId: String(existingByUrl._id),
        matchReason: 'same_job_url',
      };
    }
  }

  // 2. Check by title + company (case-insensitive)
  const existingByTitleCompany = await JobApplication.findOne({
    ...userFilter,
    jobTitle: { $regex: new RegExp(`^${escapeRegex(job.title)}$`, 'i') },
    company: { $regex: new RegExp(`^${escapeRegex(job.company)}$`, 'i') },
  }).lean();

  if (existingByTitleCompany) {
    return {
      isDuplicate: true,
      existingApplicationId: String(existingByTitleCompany._id),
      matchReason: 'exact_title_company',
    };
  }

  return { isDuplicate: false };
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
