export interface StageActionJob {
  id: string;
  _id: string;
  userId: string;
  jobTitle: string;
  title?: string;
  company: string;
  status: string;
  location?: string;
  jobUrl?: string;
  salary?: {
    min?: number;
    max?: number;
    currency?: string;
    period?: 'hourly' | 'monthly' | 'yearly';
  };
  offerDetails?: {
    salary?: number;
    bonus?: string;
    equity?: string;
    deadline?: Date;
    status?: string;
  };
  interviews?: Array<{
    type: string;
    date: Date | string;
    interviewer?: string;
  }>;
  applicationDate?: Date;
  deadline?: Date;
  createdAt: string;
  updatedAt: string;
  matchScore?: number;
  sponsorship?: 'yes' | 'no' | 'unknown';
  jobDescription?: string;
  trustScore?: number;
  trustSnapshot?: {
    ghostRiskLevel?: 'low' | 'medium' | 'high';
  };
  source?: string;
  priority: 'low' | 'medium' | 'high';
}

export interface StageActionConfig {
  primaryAction: {
    label: string;
    icon: string;
    onClick: (job: StageActionJob) => void;
  };
  secondaryActions: Array<{
    label: string;
    onClick: (job: StageActionJob) => void;
  }>;
  renderContextualWidget: (job: StageActionJob) => React.ReactNode;
}

export const STAGE_ACTION_MAP: Record<string, StageActionConfig> = {
  pipeline: {
    primaryAction: {
      label: 'Generate Tailored Docs',
      icon: 'sparkles',
      onClick: (job) => {
        window.dispatchEvent(
          new CustomEvent('tracker:primaryAction', {
            detail: { action: 'generateDocs', jobId: job.id },
          }),
        );
      },
    },
    secondaryActions: [
      {
        label: 'Find Hiring Managers',
        onClick: (job) => {
          const query = encodeURIComponent(`${job.company} hiring manager`);
          window.open(
            `https://www.linkedin.com/search/results/people/?keywords=${query}`,
            '_blank',
          );
        },
      },
    ],
    renderContextualWidget: (job) => {
      const event = new CustomEvent('tracker:renderWidget', {
        detail: { stage: 'pipeline', jobId: job.id },
      });
      window.dispatchEvent(event);
      return null;
    },
  },
  applied: {
    primaryAction: {
      label: 'Log Communication',
      icon: 'message-square',
      onClick: (job) => {
        window.dispatchEvent(
          new CustomEvent('tracker:primaryAction', {
            detail: { action: 'logCommunication', jobId: job.id },
          }),
        );
      },
    },
    secondaryActions: [
      {
        label: 'Draft Follow-Up',
        onClick: (job) => {
          window.dispatchEvent(
            new CustomEvent('tracker:primaryAction', {
              detail: { action: 'draftFollowUp', jobId: job.id },
            }),
          );
        },
      },
    ],
    renderContextualWidget: (job) => {
      const event = new CustomEvent('tracker:renderWidget', {
        detail: { stage: 'applied', jobId: job.id },
      });
      window.dispatchEvent(event);
      return null;
    },
  },
  interview: {
    primaryAction: {
      label: 'Enter Interview Prep Mode',
      icon: 'play-circle',
      onClick: (job) => {
        window.dispatchEvent(
          new CustomEvent('tracker:primaryAction', {
            detail: { action: 'interviewPrep', jobId: job.id },
          }),
        );
      },
    },
    secondaryActions: [
      {
        label: 'Generate AI Prep Questions',
        onClick: (job) => {
          window.dispatchEvent(
            new CustomEvent('tracker:primaryAction', {
              detail: { action: 'aiPrepQuestions', jobId: job.id },
            }),
          );
        },
      },
    ],
    renderContextualWidget: (job) => {
      const event = new CustomEvent('tracker:renderWidget', {
        detail: { stage: 'interview', jobId: job.id },
      });
      window.dispatchEvent(event);
      return null;
    },
  },
  offer: {
    primaryAction: {
      label: 'Open Negotiation Sandbox',
      icon: 'scale',
      onClick: (job) => {
        window.dispatchEvent(
          new CustomEvent('tracker:primaryAction', {
            detail: { action: 'negotiationSandbox', jobId: job.id },
          }),
        );
      },
    },
    secondaryActions: [
      {
        label: 'Mark Accepted',
        onClick: (job) => {
          window.dispatchEvent(
            new CustomEvent('tracker:primaryAction', {
              detail: { action: 'markAccepted', jobId: job.id },
            }),
          );
        },
      },
      {
        label: 'Mark Declined',
        onClick: (job) => {
          window.dispatchEvent(
            new CustomEvent('tracker:primaryAction', {
              detail: { action: 'markDeclined', jobId: job.id },
            }),
          );
        },
      },
    ],
    renderContextualWidget: (job) => {
      const event = new CustomEvent('tracker:renderWidget', {
        detail: { stage: 'offer', jobId: job.id },
      });
      window.dispatchEvent(event);
      return null;
    },
  },
  archive: {
    primaryAction: {
      label: 'View Analysis',
      icon: 'bar-chart-2',
      onClick: (job) => {
        window.dispatchEvent(
          new CustomEvent('tracker:primaryAction', {
            detail: { action: 'viewAnalysis', jobId: job.id },
          }),
        );
      },
    },
    secondaryActions: [
      {
        label: 'Archive / Clean Up',
        onClick: (job) => {
          window.dispatchEvent(
            new CustomEvent('tracker:primaryAction', {
              detail: { action: 'archiveCleanUp', jobId: job.id },
            }),
          );
        },
      },
    ],
    renderContextualWidget: (job) => {
      const event = new CustomEvent('tracker:renderWidget', {
        detail: { stage: 'archive', jobId: job.id },
      });
      window.dispatchEvent(event);
      return null;
    },
  },
};
