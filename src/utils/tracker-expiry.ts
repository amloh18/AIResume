export type ExpiryState = 'active' | 'flagged' | 'archivable';

export function getJobExpiryState(job: {
  status: string;
  offerDetails?: { deadline?: Date } | null;
  interviews?: Array<{ date?: Date }>;
  deadline?: Date;
}): ExpiryState {
  let deadline: Date | null = null;

  if (job.status === 'offer' && job.offerDetails?.deadline) {
    deadline = new Date(job.offerDetails.deadline);
  } else if (job.status === 'interview' && job.interviews?.length) {
    const lastInterview = job.interviews[job.interviews.length - 1];
    if (lastInterview?.date) {
      deadline = new Date(lastInterview.date);
    }
  } else if (job.deadline) {
    deadline = new Date(job.deadline);
  }

  if (!deadline) return 'active';

  const now = new Date();
  const msPastDeadline = now.getTime() - deadline.getTime();

  if (msPastDeadline <= 0) return 'active';

  const GRACE_PERIOD = 48 * 60 * 60 * 1000;
  return msPastDeadline < GRACE_PERIOD ? 'flagged' : 'archivable';
}

export function isTerminalStatus(status: string): boolean {
  return ['rejected', 'withdrawn', 'accepted'].includes(status);
}

export function getPipelineStatus(job: {
  status: string;
  offerDetails?: { deadline?: Date } | null;
  interviews?: Array<{ date?: Date }>;
  deadline?: Date;
}): 'pipeline' | 'applied' | 'interview' | 'offer' | 'archive' {
  const expiry = getJobExpiryState(job);

  if (expiry === 'archivable' || isTerminalStatus(job.status)) {
    return 'archive';
  }

  if (['draft', 'created'].includes(job.status)) return 'pipeline';
  if (['applied', 'screening'].includes(job.status)) return 'applied';
  if (job.status === 'interview') return 'interview';
  if (job.status === 'offer') return 'offer';

  return 'archive';
}
