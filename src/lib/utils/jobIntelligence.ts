export interface JobIntelligenceInput {
  status: string;
  applicationDate?: Date | string | null;
  updatedAt?: Date | string | null;
  interviews?: Array<any>;
  matchScore?: number;
  atsScore?: number;
  salary?: {
    min?: number;
    max?: number;
    currency?: string;
    period?: 'hourly' | 'monthly' | 'yearly';
  };
}

export function isJobStale(job: JobIntelligenceInput): boolean {
  if (!job.updatedAt && !job.applicationDate) return false;
  
  const lastActivityDate = new Date((job.updatedAt || job.applicationDate) as string | Date);
  const now = new Date();
  const daysSinceActivity = Math.floor((now.getTime() - lastActivityDate.getTime()) / (1000 * 60 * 60 * 24));

  switch (job.status) {
    case 'applied':
      return daysSinceActivity > 14;
    case 'screening':
      return daysSinceActivity > 10;
    case 'interview':
      return daysSinceActivity > 7;
    case 'offer':
      return daysSinceActivity > 5;
    default:
      return false; // draft, created, rejected, accepted, withdrawn don't get stale in the same way
  }
}

export function getFollowUpNudge(job: JobIntelligenceInput): string | null {
  if (['rejected', 'accepted', 'withdrawn', 'draft', 'created'].includes(job.status)) {
    return null;
  }

  const lastActivityDate = new Date((job.updatedAt || job.applicationDate || new Date()) as string | Date);
  const now = new Date();
  const daysSinceActivity = Math.floor((now.getTime() - lastActivityDate.getTime()) / (1000 * 60 * 60 * 24));

  if (job.status === 'applied' && daysSinceActivity >= 7 && daysSinceActivity < 14) {
    return "It's been a week since you applied. Consider sending a brief follow-up message to the hiring manager.";
  }
  
  if (job.status === 'screening' && daysSinceActivity >= 5) {
    return "Follow up on your screening call to check for next steps.";
  }

  if (job.status === 'interview' && daysSinceActivity >= 2) {
    return "If you haven't already, send a thank-you note to your interviewers. If it's been over a week, ask for a status update.";
  }

  if (job.status === 'offer' && daysSinceActivity >= 2) {
    return "Don't forget to review the offer and negotiate if needed before the deadline.";
  }

  return null;
}

export function calculateSuccessProbability(job: JobIntelligenceInput): number {
  let probability = 0;

  // Base probability by status
  switch (job.status) {
    case 'draft':
    case 'created':
      probability = 5;
      break;
    case 'applied':
      probability = 15;
      break;
    case 'screening':
      probability = 30;
      break;
    case 'interview':
      probability = 50 + Math.min((job.interviews?.length || 1) * 10, 30); // Up to 80% based on interviews
      break;
    case 'offer':
      probability = 95;
      break;
    case 'accepted':
      return 100;
    case 'rejected':
    case 'withdrawn':
      return 0;
    default:
      probability = 10;
  }

  // Modifiers
  const score = job.atsScore || job.matchScore;
  if (score) {
    // Add up to 10% based on score (assuming score is 0-100)
    probability += (score / 100) * 10;
  }

  return Math.min(Math.round(probability), 99); // Cap at 99 unless accepted
}

export function getMarketSalaryComparison(
  jobSalary?: { min?: number; max?: number; currency?: string },
  marketAvg?: number
): { comparison: 'above' | 'below' | 'at-market' | 'unknown'; percentage: number; text: string } {
  if (!jobSalary || (!jobSalary.min && !jobSalary.max) || !marketAvg) {
    return { comparison: 'unknown', percentage: 0, text: 'No market data available' };
  }

  const min = jobSalary.min || jobSalary.max || 0;
  const max = jobSalary.max || jobSalary.min || 0;
  const avgJobSalary = (min + max) / 2;

  const diff = avgJobSalary - marketAvg;
  const percentage = Math.round((Math.abs(diff) / marketAvg) * 100);

  if (percentage < 5) {
    return { comparison: 'at-market', percentage, text: 'At market average' };
  } else if (diff > 0) {
    return { comparison: 'above', percentage, text: `${percentage}% above market` };
  } else {
    return { comparison: 'below', percentage, text: `${percentage}% below market` };
  }
}
