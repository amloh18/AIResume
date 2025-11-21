/**
 * Job Staleness Utility
 * Calculates staleness for jobs with CV journeys (draft jobs excluded)
 */

export interface StalenessResult {
  days: number;
  isStale: boolean;
  severity: 'none' | 'warning' | 'critical';
}

/**
 * Calculate staleness for a job
 * Only applies to jobs with journeys (status !== 'draft')
 * Draft jobs are "saved for later" - not considered stale
 */
export function calculateStaleness(
  job: {
    status: string;
    updatedAt: string | Date;
    applicationDate?: string | Date;
  },
  hasJourney: boolean
): StalenessResult {
  // Draft jobs are never stale
  if (job.status === 'draft' || !hasJourney) {
    return {
      days: 0,
      isStale: false,
      severity: 'none'
    };
  }

  // Only check staleness for active stages
  const activeStages = ['applied', 'interview', 'offer'];
  if (!activeStages.includes(job.status)) {
    return {
      days: 0,
      isStale: false,
      severity: 'none'
    };
  }

  // Calculate days since last update
  const lastUpdate = job.updatedAt 
    ? new Date(job.updatedAt)
    : (job.applicationDate ? new Date(job.applicationDate) : new Date());
  
  const now = new Date();
  const diffTime = now.getTime() - lastUpdate.getTime();
  const days = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  // Determine severity
  if (days >= 30) {
    return {
      days,
      isStale: true,
      severity: 'critical'
    };
  } else if (days >= 14) {
    return {
      days,
      isStale: true,
      severity: 'warning'
    };
  }

  return {
    days,
    isStale: false,
    severity: 'none'
  };
}

/**
 * Get time in stage text (e.g., "2d ago")
 */
export function getTimeInStage(job: {
  updatedAt: string | Date;
  applicationDate?: string | Date;
}): string {
  const lastUpdate = job.updatedAt 
    ? new Date(job.updatedAt)
    : (job.applicationDate ? new Date(job.applicationDate) : new Date());
  
  const now = new Date();
  const diffTime = now.getTime() - lastUpdate.getTime();
  const days = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const hours = Math.floor(diffTime / (1000 * 60 * 60));
  const minutes = Math.floor(diffTime / (1000 * 60));

  if (days > 0) {
    return `${days}d ago`;
  } else if (hours > 0) {
    return `${hours}h ago`;
  } else if (minutes > 0) {
    return `${minutes}m ago`;
  } else {
    return 'Just now';
  }
}

