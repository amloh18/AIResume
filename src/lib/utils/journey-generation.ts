import { connectToDatabase } from '@/lib/database';
import User from '@/models/User';
import creditService from '@/lib/services/creditService';
import usageLimitsService from '@/lib/services/usageLimitsService';

export type JourneyGenerationMode = 'tailored' | 'fallback';
export type JourneyGenerationStatus = 'queued' | 'in_progress' | 'completed' | 'failed';
export type JourneyGenerationAction =
  | 'wait'
  | 'review'
  | 'retry'
  | 'upgrade'
  | 'edit_manually'
  | 'contact_support';

export type JourneyGenerationReasonCode =
  | 'tailored_available'
  | 'ai_credits_exhausted'
  | 'subscription_inactive'
  | 'master_cv_missing'
  | 'fallback_created'
  | 'documents_ready'
  | 'service_failure'
  | 'retrying'
  | 'queued';

export interface JourneyGenerationEntitlement {
  mode: JourneyGenerationMode;
  reasonCode: Exclude<
    JourneyGenerationReasonCode,
    'master_cv_missing' | 'fallback_created' | 'documents_ready' | 'service_failure' | 'retrying' | 'queued'
  >;
  isTailoredEligible: boolean;
  planKey: string;
  subscriptionStatus?: string;
  aiCreditsRemaining?: number;
  aiCreditsLimit?: number;
}

export interface JourneyGenerationState {
  status: JourneyGenerationStatus;
  mode: JourneyGenerationMode;
  reasonCode: JourneyGenerationReasonCode;
  title: string;
  summary: string;
  supportMessage: string;
  nextAction: JourneyGenerationAction;
  nextActionLabel: string;
  isTailoredEligible: boolean;
  aiCreditsRemaining?: number;
  aiCreditsLimit?: number;
  fallbackCreated?: boolean;
  failureMessage?: string;
  documents: {
    cv: 'queued' | 'created' | 'failed';
    coverLetter: 'queued' | 'created' | 'failed';
  };
  updatedAt: string;
}

export type TrackerPromptKind =
  | 'tailored_resume'
  | 'tailored_cover_letter'
  | 'linkedin'
  | 'candidacy_strategy'
  | 'cold_message'
  | 'interview_preparation'
  | 'follow_up';

const TRACKER_PROMPTS: Record<TrackerPromptKind, string> = {
  tailored_resume: `Act as a senior recruiter who reviews 200 resumes a day. Rewrite my resume for the position of [target position] in [type of company]. Replace every responsibility with a measurable achievement, eliminate everything generic, and make my value impossible to ignore.
Resume: [resume content].`,
  tailored_cover_letter: `Write a cover letter for the position of [position] in [company], which begins with a powerful idea instead of "I am applying for ...!!
It connects my specific experience to the company's exact needs and builds trust. Keep the text below 200 words. My experience: [experience].
Job description: [job description].`,
  linkedin: `Rewrite my title, the 'About' section, and the 3 main experiences of my LinkedIn profile to position myself in the searches for recruiters for the position of [target position] in [sector or industry]. Make every word have weight.
Current profile: [experience].`,
  candidacy_strategy: `I want to get a position as cargo in [sector or industry] in [city/remote]. Create a 7-day approach plan, focused on [size or type of company], which includes: specific sites where you can find vacancies, search terms, and a daily list of actions that you can execute immediately.`,
  cold_message: `Write a cold message on Linkedin for a hiring manager of [company] about the position of [position]. Start with a specific observation about your business, connect that idea with my value, and end with a simple and direct request. Keep the message below 80 words.
My experience: [experience].`,
  interview_preparation: `I have an interview for the position of [position] in [company]. Give me: the 8 most likely questions, a solid answer structure for each one using my experience, and 3 intelligent questions that demonstrate strategic thinking.
My experience: [experience].`,
  follow_up: `Write a follow-up message for [apply / interview / networking conversation] with [name] in [company].
Reaffirm my fit in a single sentence, add a new contribution of value that I have not yet mentioned, and propose a clear next step without sounding insistent.`
};

function isoNow() {
  return new Date().toISOString();
}

function buildState(
  entitlement: JourneyGenerationEntitlement,
  overrides: Partial<JourneyGenerationState>
): JourneyGenerationState {
  return {
    status: 'queued',
    mode: entitlement.mode,
    reasonCode: entitlement.reasonCode,
    title: '',
    summary: '',
    supportMessage: '',
    nextAction: 'wait',
    nextActionLabel: 'Waiting',
    isTailoredEligible: entitlement.isTailoredEligible,
    aiCreditsRemaining: entitlement.aiCreditsRemaining,
    aiCreditsLimit: entitlement.aiCreditsLimit,
    fallbackCreated: false,
    documents: {
      cv: 'queued',
      coverLetter: 'queued'
    },
    updatedAt: isoNow(),
    ...overrides
  };
}

function getFallbackMessaging(reasonCode: JourneyGenerationEntitlement['reasonCode']) {
  if (reasonCode === 'ai_credits_exhausted') {
    return {
      queued: {
        title: 'Fallback documents queued',
        summary: 'A non-tailored CV and cover letter are queued from your Master CV because your tailored generation allowance is exhausted right now.',
        supportMessage: 'Review the drafts when they are ready, then wait for AI credits to reset or upgrade to restore tailored generation.'
      },
      inProgress: {
        title: 'Generating fallback documents',
        summary: 'We are generating non-tailored fallback drafts because your tailored generation allowance is exhausted right now.',
        supportMessage: 'These drafts use limited adaptation. Review them when ready, then wait for AI credits to reset or upgrade to unlock tailoring again.'
      },
      completed: {
        title: 'Fallback documents ready',
        summary: 'Your CV and cover letter are ready as non-tailored fallback drafts because your tailored generation allowance is exhausted right now.',
        supportMessage: 'Review these drafts now, then wait for AI credits to reset or upgrade if you want tailored generation again.'
      }
    };
  }

  return {
    queued: {
      title: 'Fallback documents queued',
      summary: 'A non-tailored CV and cover letter are queued from your Master CV because tailored generation is not included in your current access.',
      supportMessage: 'Review the drafts when they are ready, then upgrade your access to restore tailored generation for this journey.'
    },
    inProgress: {
      title: 'Generating fallback documents',
      summary: 'We are generating non-tailored fallback drafts because tailored generation is not included in your current access.',
      supportMessage: 'These drafts use limited adaptation. Review them when ready, then upgrade your access to unlock tailored generation.'
    },
    completed: {
      title: 'Fallback documents ready',
      summary: 'Your CV and cover letter are ready as non-tailored fallback drafts because tailored generation is not included in your current access.',
      supportMessage: 'Review these drafts now, then upgrade your access if you want tailored generation for this journey.'
    }
  };
}

export async function getJourneyGenerationEntitlement(userId: string): Promise<JourneyGenerationEntitlement> {
  await connectToDatabase();

  const user = await User.findById(userId)
    .select('currentPlanKey subscription')
    .lean<{ currentPlanKey?: string; subscription?: { status?: string } } | null>();
  if (!user) {
    return {
      mode: 'fallback',
      reasonCode: 'subscription_inactive',
      isTailoredEligible: false,
      planKey: 'free',
      subscriptionStatus: 'inactive',
      aiCreditsRemaining: 0,
      aiCreditsLimit: 0
    };
  }

  const planKey = user.currentPlanKey || 'free';
  const timeAccess = await usageLimitsService.checkTimeBasedAccess(userId);
  const aiCreditCheck = await creditService.checkCreditAvailability(userId, 'ai_generation');

  const isUnlimitedPlan = ['pro_monthly', 'pro_quarterly', 'pro_yearly', 'pro_lifetime'].includes(planKey);
  const hasTailoredAccess = (isUnlimitedPlan && timeAccess.hasAccess) || aiCreditCheck.available;

  if (hasTailoredAccess) {
    return {
      mode: 'tailored',
      reasonCode: 'tailored_available',
      isTailoredEligible: true,
      planKey,
      subscriptionStatus: user.subscription?.status,
      aiCreditsRemaining: aiCreditCheck.creditsRemaining,
      aiCreditsLimit: aiCreditCheck.limit
    };
  }

  return {
    mode: 'fallback',
    reasonCode: timeAccess.hasAccess ? 'ai_credits_exhausted' : 'subscription_inactive',
    isTailoredEligible: false,
    planKey,
    subscriptionStatus: user.subscription?.status,
    aiCreditsRemaining: aiCreditCheck.creditsRemaining,
    aiCreditsLimit: aiCreditCheck.limit
  };
}

export function createQueuedGenerationState(entitlement: JourneyGenerationEntitlement): JourneyGenerationState {
  if (entitlement.mode === 'tailored') {
    return buildState(entitlement, {
      status: 'queued',
      reasonCode: 'queued',
      title: 'Tailored documents queued',
      summary: 'A tailored CV and cover letter are queued from your Master CV and this job description.',
      supportMessage: 'You can keep using the tracker while we prepare recruiter-ready drafts.',
      nextAction: 'wait',
      nextActionLabel: 'Generating'
    });
  }

  const fallbackMessaging = getFallbackMessaging(entitlement.reasonCode);

  return buildState(entitlement, {
    status: 'queued',
    reasonCode: 'queued',
    title: fallbackMessaging.queued.title,
    summary: fallbackMessaging.queued.summary,
    supportMessage: fallbackMessaging.queued.supportMessage,
    nextAction: 'wait',
    nextActionLabel: 'Generating'
  });
}

export function createInProgressGenerationState(entitlement: JourneyGenerationEntitlement): JourneyGenerationState {
  if (entitlement.mode === 'tailored') {
    return buildState(entitlement, {
      status: 'in_progress',
      title: 'Generating tailored documents',
      summary: 'We are generating a tailored CV and tailored cover letter from your Master CV and this job description.',
      supportMessage: 'Stay on this journey to review the drafts as soon as generation finishes.',
      nextAction: 'wait',
      nextActionLabel: 'Generating'
    });
  }

  const fallbackMessaging = getFallbackMessaging(entitlement.reasonCode);

  return buildState(entitlement, {
    status: 'in_progress',
    title: fallbackMessaging.inProgress.title,
    summary: fallbackMessaging.inProgress.summary,
    supportMessage: fallbackMessaging.inProgress.supportMessage,
    nextAction: 'wait',
    nextActionLabel: 'Generating'
  });
}

export function createCompletedGenerationState(
  entitlement: JourneyGenerationEntitlement,
  options?: {
    fallbackCreated?: boolean;
    cvCreated?: boolean;
    coverLetterCreated?: boolean;
  }
): JourneyGenerationState {
  const cvCreated = options?.cvCreated !== false;
  const coverLetterCreated = options?.coverLetterCreated !== false;

  if (entitlement.mode === 'tailored') {
    return buildState(entitlement, {
      status: 'completed',
      reasonCode: 'documents_ready',
      title: 'Tailored documents ready',
      summary: 'Your tailored CV and tailored cover letter are ready to review.',
      supportMessage: 'Check the drafts, run ATS analysis, and make any final edits before you apply.',
      nextAction: 'review',
      nextActionLabel: 'Review documents',
      documents: {
        cv: cvCreated ? 'created' : 'failed',
        coverLetter: coverLetterCreated ? 'created' : 'failed'
      }
    });
  }

  const fallbackMessaging = getFallbackMessaging(entitlement.reasonCode);

  return buildState(entitlement, {
    status: 'completed',
    reasonCode: options?.fallbackCreated ? 'fallback_created' : 'documents_ready',
    title: fallbackMessaging.completed.title,
    summary: fallbackMessaging.completed.summary,
    supportMessage: fallbackMessaging.completed.supportMessage,
    nextAction: 'review',
    nextActionLabel: 'Review documents',
    fallbackCreated: true,
    documents: {
      cv: cvCreated ? 'created' : 'failed',
      coverLetter: coverLetterCreated ? 'created' : 'failed'
    }
  });
}

export function createFailedGenerationState(
  entitlement: JourneyGenerationEntitlement,
  errorMessage: string,
  options?: {
    fallbackCreated?: boolean;
    cvCreated?: boolean;
    coverLetterCreated?: boolean;
  }
): JourneyGenerationState {
  const fallbackCreated = Boolean(options?.fallbackCreated);

  return buildState(entitlement, {
    status: 'failed',
    reasonCode: 'service_failure',
    title: fallbackCreated ? 'Generation completed with fallback' : 'Document generation failed',
    summary: fallbackCreated
      ? 'We could not finish tailored generation, but a fallback draft was created for this journey.'
      : 'We could not finish generating your tracker documents.',
    supportMessage: fallbackCreated
      ? 'Review the fallback draft, edit it manually, or retry generation later. If the problem continues, contact support.'
      : 'Retry generation, edit manually, or contact support if the issue continues.',
    nextAction: fallbackCreated ? 'edit_manually' : 'retry',
    nextActionLabel: fallbackCreated ? 'Edit manually' : 'Retry generation',
    fallbackCreated,
    failureMessage: errorMessage,
    documents: {
      cv: options?.cvCreated ? 'created' : 'failed',
      coverLetter: options?.coverLetterCreated ? 'created' : 'failed'
    }
  });
}

function normalizePlaceholderValue(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : undefined;
}

export function fillTrackerPrompt(
  kind: TrackerPromptKind,
  placeholders: Record<string, string | undefined>
): string {
  let prompt = TRACKER_PROMPTS[kind];

  for (const [key, rawValue] of Object.entries(placeholders)) {
    const value = normalizePlaceholderValue(rawValue) ?? getPromptFallbackForKey(key);
    const pattern = new RegExp(`\\[${escapeRegExp(key)}\\]`, 'g');
    prompt = prompt.replace(pattern, value);
  }

  return prompt;
}

function getPromptFallbackForKey(key: string) {
  switch (key) {
    case 'target position':
    case 'position':
      return 'the target role';
    case 'company':
      return 'the target company';
    case 'sector or industry':
      return 'the target industry';
    case 'city/remote':
      return 'remote';
    case 'size or type of company':
      return 'the hiring company';
    case 'type of company':
      return 'the hiring company';
    case 'job description':
      return 'No job description was provided. Use the role and company context only.';
    case 'experience':
      return 'No structured experience details were provided. Use only the verified CV content.';
    case 'resume content':
      return 'No resume content was provided.';
    case 'apply / interview / networking conversation':
      return 'the recent hiring conversation';
    case 'name':
      return 'the hiring team';
    default:
      return 'Not provided';
  }
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function deriveCompanyType(jobData: Record<string, any>) {
  return (
    normalizePlaceholderValue(jobData.companyType) ||
    normalizePlaceholderValue(jobData.industry) ||
    normalizePlaceholderValue(jobData.sector) ||
    normalizePlaceholderValue(jobData.source) ||
    'the hiring company'
  );
}

export function serializeExperienceForPrompt(cvData: any) {
  if (!cvData) {
    return 'No candidate experience was provided.';
  }

  try {
    return JSON.stringify(cvData);
  } catch {
    return 'Candidate experience could not be serialized.';
  }
}
