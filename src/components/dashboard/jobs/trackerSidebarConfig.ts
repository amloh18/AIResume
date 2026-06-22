import type { TrackerCreatedStagePreview } from '@/lib/utils/tracker-created-stage-modal';

export type TrackerStage =
  | 'draft'
  | 'created'
  | 'applied'
  | 'screening'
  | 'interview'
  | 'offer'
  | 'accepted'
  | 'rejected'
  | 'withdrawn';

export type TrackerDetailsView = 'details' | 'insights';

export type TrackerSidebarActionId =
  | 'move_to_created'
  | 'preview_free_output'
  | 'edit_job'
  | 'create_journey'
  | 'continue_journey'
  | 'open_details'
  | 'open_insights'
  | 'open_interview_prep'
  | 'archive_job'
  | 'duplicate_job';

export type TrackerCardActionId =
  | 'generate_docs'
  | 'inject_data'
  | 'download'
  | 'move_interview'
  | 'log_activity'
  | 'view_notes'
  | 'add_feedback'
  | 'interview_prep'
  | 'accept_offer'
  | 'decline_offer'
  | 'archive';

export interface TrackerSidebarOpenContext {
  sourceStage?: TrackerStage;
  sourceAction?: TrackerCardActionId;
  preferredDetailsView?: TrackerDetailsView;
  highlightAction?: TrackerSidebarActionId;
}

export interface TrackerSidebarMetric {
  label: string;
  value: string;
}

export interface TrackerSidebarRow {
  label: string;
  value: string;
}

export interface TrackerSidebarJourneyCard {
  eyebrow: string;
  title: string;
  summary: string;
  bullets: string[];
  primaryLabel: string;
  primaryActionId: TrackerSidebarActionId;
  primaryAction: () => void;
  secondaryLabel?: string;
  secondaryActionId?: TrackerSidebarActionId;
  secondaryAction?: () => void;
  toneClasses: string;
  accentClasses: string;
  stats: TrackerSidebarMetric[];
}

export interface TrackerSidebarActionPayload {
  jobId: string;
  stage: TrackerStage;
  journeyId?: string;
  entitlement: {
    mode?: 'tailored' | 'fallback';
    reason?: TrackerCreatedStagePreview['entitlementReasonCode'];
    aiCreditsRemaining?: number;
    aiCreditsLimit?: number;
  };
}

export interface TrackerSidebarConfig {
  stage: TrackerStage;
  sections: {
    showJobDetails: boolean;
    showInsights: boolean;
    showJourneySnapshot: boolean;
    showTrackerJourneySummary: boolean;
  };
  journeyCard: TrackerSidebarJourneyCard;
  detailRows: TrackerSidebarRow[];
  insightRows: TrackerSidebarRow[];
  insightsEmptyState?: string;
  trackerJourneyEmptyState: string;
  actionPayloads: Partial<Record<TrackerSidebarActionId, TrackerSidebarActionPayload>>;
}

interface TrackerSidebarJobInput {
  id: string;
  _id?: string;
  company: string;
  location?: string;
  jobType?: string;
  type?: string;
  deadline?: Date | string;
  jobUrl?: string;
  priority?: 'low' | 'medium' | 'high';
  sponsorship?: 'yes' | 'no' | 'unknown';
  status: TrackerStage;
  isArchived?: boolean;
}

interface TrackerSidebarJourneyInput {
  id?: string;
  cvId?: string;
  coverLetterId?: string;
  status?: string;
  currentStep?: number;
  totalSteps?: number;
  updatedAt?: string | Date;
  metadata?: {
    updatedAt?: string | Date;
  };
  generationState?: {
    mode?: 'tailored' | 'fallback';
    title?: string;
    summary?: string;
    supportMessage?: string;
    documents?: {
      cv?: 'queued' | 'ready' | 'pending';
      coverLetter?: 'queued' | 'ready' | 'pending';
    };
  };
}

interface TrackerSidebarInsightsInput {
  keywordMatchScore?: number;
  companyHiringTrend?: string;
  skillsGap?: string;
  marketCompetitiveness?: string;
}

interface TrackerSidebarConfigInput {
  job: TrackerSidebarJobInput;
  primaryJourney: TrackerSidebarJourneyInput | null;
  trackerGenerationPreview: TrackerCreatedStagePreview | null;
  insights?: TrackerSidebarInsightsInput | null;
  successProb: number;
  keywordMatchScore: number;
  nudge?: string | null;
  followUpAction?: string | null;
  formattedDeadline: string;
  formattedJobUrl?: string;
  handlers: Record<TrackerSidebarActionId, () => void>;
}

function capitalize(value?: string | null) {
  if (!value) return '';
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function compact<T>(items: Array<T | null | undefined | false>): T[] {
  return items.filter(Boolean) as T[];
}

function hasMeaningfulInsights(
  insights: TrackerSidebarInsightsInput | null | undefined,
  keywordMatchScore: number,
  nudge?: string | null,
) {
  return Boolean(
    (typeof keywordMatchScore === 'number' && keywordMatchScore > 0) ||
      nudge ||
      insights?.companyHiringTrend ||
      insights?.skillsGap ||
      insights?.marketCompetitiveness,
  );
}

function getDraftStageBullets(preview: TrackerCreatedStagePreview | null) {
  const valueStatement =
    'You can still create a ready CV and cover letter for this job and keep the tracker moving.';

  if (!preview || preview.mode === 'tailored') {
    return [
      valueStatement,
      'Tailored AI generation is currently available for this job.',
      'Move to Created to start document generation and unlock the next tracker actions.',
    ];
  }

  const limitMessage =
    preview.entitlementReasonCode === 'ai_credits_exhausted'
      ? `Your tailored AI allowance is exhausted${typeof preview.aiCreditsRemaining === 'number' ? ` with ${preview.aiCreditsRemaining} generations left this cycle` : ''}.`
      : preview.entitlementReasonCode === 'subscription_inactive'
        ? 'Tailored AI generation is part of Pro right now.'
        : 'Tailored AI generation is not available right now.';

  return [
    valueStatement,
    limitMessage,
    'You can continue with fallback documents from your Master CV or preview the free-plan output first.',
  ];
}

export function buildTrackerSidebarConfig({
  job,
  primaryJourney,
  trackerGenerationPreview,
  insights,
  successProb,
  keywordMatchScore,
  nudge,
  followUpAction,
  formattedDeadline,
  formattedJobUrl,
  handlers,
}: TrackerSidebarConfigInput): TrackerSidebarConfig {
  const stage = job.status;
  const generationState = primaryJourney?.generationState;
  const detailRows = compact<TrackerSidebarRow>([
    { label: 'Company', value: job.company },
    job.location ? { label: 'Location', value: job.location } : null,
    job.jobType || job.type
      ? { label: 'Job Type', value: capitalize(job.jobType || job.type) }
      : null,
    formattedDeadline && formattedDeadline !== 'No deadline set'
      ? { label: 'Deadline', value: formattedDeadline }
      : null,
    job.jobUrl && formattedJobUrl && formattedJobUrl !== 'No URL provided'
      ? { label: 'Job URL', value: formattedJobUrl }
      : null,
  ]);

  const shouldShowInsights = hasMeaningfulInsights(insights, keywordMatchScore, nudge);
  const insightRows = shouldShowInsights
    ? compact<TrackerSidebarRow>([
        { label: 'Success Probability', value: `${successProb}%` },
        job.priority ? { label: 'Priority', value: capitalize(job.priority) } : null,
        job.sponsorship === 'yes'
          ? { label: 'Sponsorship', value: 'Provided' }
          : job.sponsorship === 'no'
            ? { label: 'Sponsorship', value: 'Not provided' }
            : null,
        keywordMatchScore > 0 ? { label: 'Match Score', value: `${keywordMatchScore}%` } : null,
      ])
    : [];

  const actionPayloads: TrackerSidebarConfig['actionPayloads'] = {
    move_to_created: {
      jobId: job.id || job._id || '',
      stage,
      journeyId: primaryJourney?.id,
      entitlement: {
        mode: trackerGenerationPreview?.mode,
        reason: trackerGenerationPreview?.entitlementReasonCode,
        aiCreditsRemaining: trackerGenerationPreview?.aiCreditsRemaining,
        aiCreditsLimit: trackerGenerationPreview?.aiCreditsLimit,
      },
    },
    preview_free_output: {
      jobId: job.id || job._id || '',
      stage,
      journeyId: primaryJourney?.id,
      entitlement: {
        mode: trackerGenerationPreview?.mode,
        reason: trackerGenerationPreview?.entitlementReasonCode,
        aiCreditsRemaining: trackerGenerationPreview?.aiCreditsRemaining,
        aiCreditsLimit: trackerGenerationPreview?.aiCreditsLimit,
      },
    },
    edit_job: {
      jobId: job.id || job._id || '',
      stage,
      journeyId: primaryJourney?.id,
      entitlement: {
        mode: trackerGenerationPreview?.mode,
        reason: trackerGenerationPreview?.entitlementReasonCode,
      },
    },
    create_journey: {
      jobId: job.id || job._id || '',
      stage,
      entitlement: {
        mode: generationState?.mode || trackerGenerationPreview?.mode,
        reason: trackerGenerationPreview?.entitlementReasonCode,
      },
    },
    continue_journey: {
      jobId: job.id || job._id || '',
      stage,
      journeyId: primaryJourney?.id,
      entitlement: {
        mode: generationState?.mode || trackerGenerationPreview?.mode,
        reason: trackerGenerationPreview?.entitlementReasonCode,
      },
    },
    open_details: {
      jobId: job.id || job._id || '',
      stage,
      journeyId: primaryJourney?.id,
      entitlement: {
        mode: generationState?.mode || trackerGenerationPreview?.mode,
        reason: trackerGenerationPreview?.entitlementReasonCode,
      },
    },
    open_insights: {
      jobId: job.id || job._id || '',
      stage,
      journeyId: primaryJourney?.id,
      entitlement: {
        mode: generationState?.mode || trackerGenerationPreview?.mode,
        reason: trackerGenerationPreview?.entitlementReasonCode,
      },
    },
    open_interview_prep: {
      jobId: job.id || job._id || '',
      stage,
      journeyId: primaryJourney?.id,
      entitlement: {
        mode: generationState?.mode || trackerGenerationPreview?.mode,
        reason: trackerGenerationPreview?.entitlementReasonCode,
      },
    },
    archive_job: {
      jobId: job.id || job._id || '',
      stage,
      journeyId: primaryJourney?.id,
      entitlement: {
        mode: generationState?.mode || trackerGenerationPreview?.mode,
      },
    },
    duplicate_job: {
      jobId: job.id || job._id || '',
      stage,
      journeyId: primaryJourney?.id,
      entitlement: {
        mode: generationState?.mode || trackerGenerationPreview?.mode,
      },
    },
  };

  let journeyCard: TrackerSidebarJourneyCard;
  let insightsEmptyState: string | undefined;
  let trackerJourneyEmptyState =
    'No journey has been created for this job yet. The contextual card above tells you the best next step for this stage.';

  if (stage === 'draft') {
    journeyCard = {
      eyebrow: 'Draft Stage',
      title: 'This job is not started yet',
      summary:
        'As soon as you move this job to Created, the tracker starts generating your CV and cover letter automatically.',
      bullets: getDraftStageBullets(trackerGenerationPreview),
      primaryLabel: 'Move to Created Stage',
      primaryActionId: 'move_to_created',
      primaryAction: handlers.move_to_created,
      secondaryLabel:
        trackerGenerationPreview?.mode === 'fallback' ? 'Preview Free Output' : 'Edit Job Details',
      secondaryActionId:
        trackerGenerationPreview?.mode === 'fallback' ? 'preview_free_output' : 'edit_job',
      secondaryAction:
        trackerGenerationPreview?.mode === 'fallback'
          ? handlers.preview_free_output
          : handlers.edit_job,
      toneClasses: 'border-blue-200 bg-[linear-gradient(180deg,_#ffffff,_#f7fbff)] dark:bg-none dark:border-blue-500/30 dark:bg-[#131c2e]',
      accentClasses: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
      stats: compact<TrackerSidebarMetric>([
        {
          label: 'AI Mode',
          value: trackerGenerationPreview?.mode === 'fallback' ? 'Fallback' : 'Tailored',
        },
        typeof trackerGenerationPreview?.aiCreditsRemaining === 'number'
          ? {
              label: 'Remaining',
              value: `${trackerGenerationPreview.aiCreditsRemaining}`,
            }
          : { label: 'Docs', value: 'CV + Cover Letter' },
      ]),
    };
    trackerJourneyEmptyState =
      'A journey starts after the job moves to Created. Move this role forward when you are ready to generate documents.';
  } else if (stage === 'created') {
    journeyCard = {
      eyebrow: generationState?.mode === 'fallback' ? 'Fallback Journey' : 'Created Stage',
      title:
        generationState?.title ||
        (primaryJourney ? 'Your tracker documents are in progress' : 'Ready to start your CV journey'),
      summary:
        generationState?.summary ||
        (primaryJourney
          ? 'Your tracker is preparing the documents and progress for this application.'
          : 'Create the journey for this job to generate documents and keep the tracker synchronized.'),
      bullets: primaryJourney
        ? compact<string>([
            generationState?.supportMessage ||
              'Review the generated documents and continue refining them before you apply.',
            primaryJourney.cvId
              ? 'A CV is already linked to this journey.'
              : 'Your CV will appear here once generation finishes.',
            primaryJourney.coverLetterId
              ? 'A cover letter is already linked to this journey.'
              : 'Your cover letter will appear here once generation finishes.',
          ])
        : [
            'Start the journey to generate the first set of application documents.',
            'The tracker keeps your documents, application state, and ATS feedback together.',
            'Add missing job context first if you want stronger tailored output.',
          ],
      primaryLabel: primaryJourney ? 'Continue Journey' : 'Create Journey',
      primaryActionId: primaryJourney ? 'continue_journey' : 'create_journey',
      primaryAction: primaryJourney ? handlers.continue_journey : handlers.create_journey,
      secondaryLabel: primaryJourney ? 'View Full Details' : 'Edit Job Details',
      secondaryActionId: primaryJourney ? 'open_details' : 'edit_job',
      secondaryAction: primaryJourney ? handlers.open_details : handlers.edit_job,
      toneClasses:
        generationState?.mode === 'fallback'
          ? 'border-amber-200 bg-[linear-gradient(180deg,_#fffdf7,_#fffaf0)] dark:bg-none dark:border-amber-500/30 dark:bg-[#1e1a10]'
          : 'border-emerald-200 bg-[linear-gradient(180deg,_#ffffff,_#f6fff8)] dark:bg-none dark:border-emerald-500/30 dark:bg-[#111e14]',
      accentClasses:
        generationState?.mode === 'fallback'
          ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
          : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
      stats: compact<TrackerSidebarMetric>([
        {
          label: 'CV',
          value: primaryJourney?.cvId
            ? 'Ready'
            : generationState?.documents?.cv === 'queued'
              ? 'Queued'
              : 'Pending',
        },
        {
          label: 'Cover Letter',
          value: primaryJourney?.coverLetterId
            ? 'Ready'
            : generationState?.documents?.coverLetter === 'queued'
              ? 'Queued'
              : 'Pending',
        },
      ]),
    };
  } else if (stage === 'applied' || stage === 'screening') {
    journeyCard = {
      eyebrow: stage === 'screening' ? 'Screening Stage' : 'Applied Stage',
      title: stage === 'screening' ? 'You are in recruiter review' : 'Your application is now in motion',
      summary:
        nudge || 'Use your journey documents, ATS score, and follow-up timing to stay ahead in this stage.',
      bullets: compact<string>([
        'Keep your CV and cover letter ready for quick updates if the company responds.',
        followUpAction || 'Plan your next follow-up touchpoint based on the application timeline.',
        keywordMatchScore > 0
          ? `Current keyword match is ${keywordMatchScore}%.`
          : 'Application insights will explain your match score once analysis is available.',
      ]),
      primaryLabel: primaryJourney ? 'Resume Documents' : 'View Full Details',
      primaryActionId: primaryJourney ? 'continue_journey' : 'open_details',
      primaryAction: primaryJourney ? handlers.continue_journey : handlers.open_details,
      secondaryLabel: 'Application Insights',
      secondaryActionId: 'open_insights',
      secondaryAction: handlers.open_insights,
      toneClasses: 'border-indigo-200 bg-[linear-gradient(180deg,_#ffffff,_#f8f9ff)] dark:bg-none dark:border-indigo-500/30 dark:bg-[#13142a]',
      accentClasses: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
      stats: compact<TrackerSidebarMetric>([
        { label: 'Success Probability', value: `${successProb}%` },
        keywordMatchScore > 0 ? { label: 'Match Score', value: `${keywordMatchScore}%` } : null,
      ]),
    };
    if (!shouldShowInsights) {
      insightsEmptyState =
        'Insights will appear here after we analyze this application, compare it against the job, or capture follow-up signals.';
    }
  } else if (stage === 'interview') {
    journeyCard = {
      eyebrow: 'Interview Stage',
      title: 'Prepare for the next conversation',
      summary:
        'This is the best time to review your tailored story, refine your answers, and keep your application documents aligned.',
      bullets: compact<string>([
        'Use interview prep to practice the likely questions for this role.',
        'Keep your latest CV and cover letter ready in case the interviewer asks for updates.',
        followUpAction || 'Plan your follow-up note after the interview.',
      ]),
      primaryLabel: 'Open Interview Prep',
      primaryActionId: 'open_interview_prep',
      primaryAction: handlers.open_interview_prep,
      secondaryLabel: primaryJourney ? 'Resume Journey' : 'View Full Details',
      secondaryActionId: primaryJourney ? 'continue_journey' : 'open_details',
      secondaryAction: primaryJourney ? handlers.continue_journey : handlers.open_details,
      toneClasses: 'border-violet-200 bg-[linear-gradient(180deg,_#ffffff,_#faf7ff)] dark:bg-none dark:border-violet-500/30 dark:bg-[#18112a]',
      accentClasses: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
      stats: compact<TrackerSidebarMetric>([
        { label: 'Success Probability', value: `${successProb}%` },
        keywordMatchScore > 0 ? { label: 'Match Score', value: `${keywordMatchScore}%` } : null,
      ]),
    };
    if (!shouldShowInsights) {
      insightsEmptyState =
        'Interview insights show up here once prep signals, match analysis, or follow-up guidance is available.';
    }
  } else if (stage === 'offer') {
    journeyCard = {
      eyebrow: 'Offer Stage',
      title: 'You are close to the finish line',
      summary:
        'Use the tracker to review your documents, compare the role details, and plan your response before the deadline.',
      bullets: [
        'Review salary, sponsorship, and role expectations before you respond.',
        'Keep your application package handy for negotiation or clarification calls.',
        'Use notes to capture questions or decision factors while the offer is active.',
      ],
      primaryLabel: 'View Full Details',
      primaryActionId: 'open_details',
      primaryAction: handlers.open_details,
      secondaryLabel: primaryJourney ? 'Open Journey' : 'Application Insights',
      secondaryActionId: primaryJourney ? 'continue_journey' : 'open_insights',
      secondaryAction: primaryJourney ? handlers.continue_journey : handlers.open_insights,
      toneClasses: 'border-amber-200 bg-[linear-gradient(180deg,_#ffffff,_#fffaf1)] dark:bg-none dark:border-amber-500/30 dark:bg-[#1e1a10]',
      accentClasses: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
      stats: compact<TrackerSidebarMetric>([
        job.priority ? { label: 'Priority', value: capitalize(job.priority) } : null,
        formattedDeadline && formattedDeadline !== 'No deadline set'
          ? { label: 'Decision Window', value: formattedDeadline }
          : null,
      ]),
    };
    if (!shouldShowInsights) {
      insightsEmptyState =
        'Offer-stage insights appear here after we have enough job or application data to compare the role and your materials.';
    }
  } else if (stage === 'accepted') {
    journeyCard = {
      eyebrow: 'Accepted',
      title: 'This application is successfully closed',
      summary:
        'Keep this job as a clean record of what worked, or archive it once you no longer need active tracker access.',
      bullets: [
        'Your journey documents remain useful as a strong reference for future applications.',
        'Review notes and insights to capture what led to the successful outcome.',
        'Archive the job when you are ready to keep your tracker focused.',
      ],
      primaryLabel: job.isArchived ? 'Unarchive Job' : 'Archive Job',
      primaryActionId: 'archive_job',
      primaryAction: handlers.archive_job,
      secondaryLabel: 'View Full Details',
      secondaryActionId: 'open_details',
      secondaryAction: handlers.open_details,
      toneClasses: 'border-emerald-200 bg-[linear-gradient(180deg,_#ffffff,_#f5fff7)] dark:bg-none dark:border-emerald-500/30 dark:bg-[#111e14]',
      accentClasses: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
      stats: [{ label: 'Outcome', value: 'Accepted' }],
    };
  } else {
    const outcomeLabel = stage === 'rejected' ? 'Rejected' : 'Withdrawn';
    journeyCard = {
      eyebrow: outcomeLabel,
      title: stage === 'rejected' ? 'This application has closed' : 'This application is no longer active',
      summary:
        stage === 'rejected'
          ? 'Use what you learned from this role to improve the next application quickly.'
          : 'This tracker item is closed, but the details and journey documents remain available for reference.',
      bullets: [
        'Review notes, insights, and journey outputs to understand what to reuse next time.',
        'Duplicate the job if you want to create a fresh version for a similar opening.',
        'Archive the item once you are done reviewing it.',
      ],
      primaryLabel: 'Duplicate Job',
      primaryActionId: 'duplicate_job',
      primaryAction: handlers.duplicate_job,
      secondaryLabel: 'View Full Details',
      secondaryActionId: 'open_details',
      secondaryAction: handlers.open_details,
      toneClasses: 'border-slate-200 bg-[linear-gradient(180deg,_#ffffff,_#f8fafc)] dark:bg-none dark:border-white/10 dark:bg-[#181d16]',
      accentClasses: 'bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300',
      stats: compact<TrackerSidebarMetric>([
        { label: 'Outcome', value: outcomeLabel },
        keywordMatchScore > 0 ? { label: 'Match Score', value: `${keywordMatchScore}%` } : null,
      ]),
    };
  }

  return {
    stage,
    sections: {
      showJobDetails: detailRows.length > 0,
      showInsights: insightRows.length > 0 || Boolean(insightsEmptyState),
      showJourneySnapshot: journeyCard.stats.length > 0,
      showTrackerJourneySummary: true,
    },
    journeyCard,
    detailRows,
    insightRows,
    insightsEmptyState,
    trackerJourneyEmptyState,
    actionPayloads,
  };
}

interface RouteTrackerCardActionInput<TJob> {
  action: TrackerCardActionId;
  job: TJob;
  onCreateJourney?: (job: TJob) => void | Promise<void>;
  onImproveATS?: (job: TJob) => void;
  onDownload?: (job: TJob) => void;
  onJobStatusUpdate?: (jobId: string, newStatus: TrackerStage) => void | Promise<void>;
  onOpenSidebar: (job: TJob, context?: TrackerSidebarOpenContext) => void;
  getJobId: (job: TJob) => string;
}

export function routeTrackerCardAction<TJob>({
  action,
  job,
  onCreateJourney,
  onImproveATS,
  onDownload,
  onJobStatusUpdate,
  onOpenSidebar,
  getJobId,
}: RouteTrackerCardActionInput<TJob>) {
  const jobId = getJobId(job);

  switch (action) {
    case 'generate_docs':
      onCreateJourney?.(job);
      return;
    case 'inject_data':
      onImproveATS?.(job);
      return;
    case 'download':
      onDownload?.(job);
      return;
    case 'move_interview':
      onJobStatusUpdate?.(jobId, 'interview');
      return;
    case 'accept_offer':
      onJobStatusUpdate?.(jobId, 'accepted');
      return;
    case 'decline_offer':
      onJobStatusUpdate?.(jobId, 'rejected');
      return;
    case 'archive':
      onJobStatusUpdate?.(jobId, 'withdrawn');
      return;
    case 'add_feedback':
      onOpenSidebar(job, {
        preferredDetailsView: 'insights',
        sourceAction: action,
      });
      return;
    case 'interview_prep':
      onOpenSidebar(job, {
        highlightAction: 'open_interview_prep',
        sourceAction: action,
      });
      return;
    case 'log_activity':
    case 'view_notes':
      onOpenSidebar(job, {
        preferredDetailsView: 'details',
        sourceAction: action,
      });
      return;
    default:
      onOpenSidebar(job);
  }
}
