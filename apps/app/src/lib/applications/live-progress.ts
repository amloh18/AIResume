/**
 * Live application progress — ONE derivation for every surface.
 *
 * WHY THIS EXISTS
 * ---------------
 * Four surfaces describe the same application and used to disagree:
 *
 *   JobCard (Discover feed)   a client-only zustand entry, written by
 *                             `useApplyProgress` when the user clicks Apply —
 *                             fabricated percentages (10/35/60/85) driven by
 *                             `setTimeout`, and gone on reload.
 *   TopJobMatchesSection      same card, same fake timeline.
 *   JobsListView (tracker)    `deriveApplicationStatusBadge` — an honest chip,
 *                             but one word: "Submitting".
 *   JobSidebar (journey)      a five-node BUILD→MATCH→TAILOR→SUBMIT→TRACK
 *                             stepper, i.e. every step at once, no live text.
 *
 * None of them could show the *execution* half of the pipeline at all — form
 * detection, field fill, document attach, submit, confirmation — because the
 * staging half ran in the browser and the execution half ran on the worker,
 * and nothing joined them up. `JobApplication.internalStatus` already carries
 * the truth for both halves (`staging_cv_generating` … `verification`), so the
 * fix is to derive from it instead of from a client-side timer.
 *
 * CONTRACT
 * --------
 * `deriveApplicationProgress` is pure: no mongoose, no React, no clock of its
 * own beyond the values it is handed. The API route does the querying, this
 * module does the interpreting, the hook does the polling and the component
 * does the drawing — so all four surfaces necessarily agree.
 *
 * HONESTY RULES (carried over from `application-status-badge.ts`)
 * ---------------------------------------------------------------
 *  - A phase is only "current" when the stored status says so. Never infer
 *    forward progress from the clock.
 *  - `review_required` is a *park*, not a stage: the run is stopped and the
 *    only thing that moves it is the user. It renders as `waiting_user`.
 *  - `automation_unknown` (ended without confirmation) must never look like a
 *    run in flight — a second submit could double-apply.
 *  - Rows created before the state machine existed (`internalStatus` absent)
 *    are `idle`, not "submitting".
 */

import { formatQueueEta } from '@/lib/utils/queue-eta';

/** What the run is doing, from the user's point of view. */
export type ProgressState =
  /** Nothing is running and nothing is waiting on the user. */
  | 'idle'
  /** Our AI agent (or the document generator) is actively working. */
  | 'running'
  /** Stopped on purpose — only the user can move it. */
  | 'waiting_user'
  /** Finished successfully. */
  | 'done'
  /** Finished badly. */
  | 'failed';

export type SubstepStatus = 'pending' | 'active' | 'completed' | 'failed' | 'skipped';

export interface ProgressSubstep {
  key: string;
  label: string;
  status: SubstepStatus;
}

/** Ordered phases of the whole journey, staging + execution. */
export type ProgressPhaseKey =
  | 'saved'
  | 'documents'
  | 'queued'
  | 'form_detection'
  | 'field_fill'
  | 'attachments'
  | 'submitting'
  | 'verification'
  | 'applied'
  | 'interview'
  | 'offer'
  | 'rejected';

export interface ProgressAction {
  id: 'approve' | 'dismiss' | 'retry';
  label: string;
}

/**
 * Operator-only signal. **Never render this in the product UI.**
 *
 * The derivation has to know things the customer must not be told — that the
 * queue is not being drained, that a run timed out, that an env var is unset.
 * Before this type existed that knowledge was smuggled into `liveText` and
 * `detail`, so the customer read "Queued for 12 min with no worker pickup" —
 * an ops page rendered in a job card.
 *
 * The split is now explicit: `liveText` / `detail` are customer copy in the
 * product's voice, and this field carries the same event in operator language
 * for logging, telemetry and admin surfaces. Both are derived from one place,
 * so they can never disagree.
 */
export interface ProgressDiagnostic {
  code: 'queue_stalled';
  /** Ops-facing. May name internal services — never shown to a customer. */
  message: string;
  /** How long the row has been waiting, in seconds. */
  waitedSeconds: number;
}

export interface ApplicationProgress {
  applicationId: string;
  /** External source job id, when the row has one. */
  jobId?: string;
  phase: ProgressPhaseKey;
  /** Short human name of the phase — "Submitting application". */
  phaseLabel: string;
  /**
   * The sentence shown above the bar. Always present.
   * **Customer-facing.** Brand voice, no internal vocabulary.
   */
  liveText: string;
  /**
   * Longer explanation, when there is one (the park reason, an error).
   * **Customer-facing** — sanitised before it gets here.
   */
  detail?: string;
  /**
   * Operator-only. Present when something is wrong that the customer should not
   * be told about in these terms. Log it; do not render it.
   */
  diagnostic?: ProgressDiagnostic;
  /** 0–100, monotonic within a phase. */
  percent: number;
  state: ProgressState;
  /** Substeps of the CURRENT phase only — never the whole pipeline. */
  substeps: ProgressSubstep[];
  /** Formatted queue ETA ("~2 min"), when the row is in the queue. */
  eta?: string;
  /** 1-based queue position (1 = running now). */
  queuePosition?: number;
  /**
   * The row is queued and nothing has picked it up for longer than
   * `QUEUE_STALL_SECONDS`. This is the app-side signal for "the background
   * worker is not running on the server" — the failure mode that used to be
   * completely invisible, because a stalled queue and a slow queue render the
   * same "Submitting" chip forever.
   */
  stalled?: boolean;
  /** The one control this row needs right now, if any. */
  action?: ProgressAction;
  /** True while something is moving or waiting on the user — drives polling. */
  isActive: boolean;
  /** ISO timestamp of the last recorded change. */
  updatedAt: string;
}

/**
 * Percent band per phase. Bands (not a single scale) because a phase's
 * duration is unknown — a bar that creeps smoothly through a band reads as
 * progress, while a bar that jumps 0→100 on completion reads as broken.
 */
const PHASE_BANDS: Record<ProgressPhaseKey, [number, number]> = {
  saved: [0, 4],
  documents: [4, 40],
  queued: [40, 48],
  form_detection: [48, 58],
  field_fill: [58, 74],
  attachments: [74, 84],
  submitting: [84, 92],
  verification: [92, 99],
  applied: [100, 100],
  interview: [100, 100],
  offer: [100, 100],
  rejected: [100, 100],
};

/**
 * How long a queued row may wait before we call it stalled.
 *
 * **Tied to the drain cadence, not to how long a run takes.** `ApplicationQueue` is drained by two
 * independent paths: the in-process poll loop (`workers/applicationWorker.ts`, 10 s) and the
 * `/api/cron/auto-apply` endpoint, whose own header recommends `*​/5 * * * *`. On a cron-only
 * deployment a healthy row can therefore sit untouched for a full cron interval, so a threshold of
 * one interval is a false positive by construction — which is what 5 minutes was.
 *
 * 15 minutes is three missed ticks: still comfortably clear of normal queueing, and the signal is
 * operator-only (`diagnostic`), so reporting it later costs nothing. If the cron cadence changes,
 * change this with it.
 */
export const QUEUE_STALL_SECONDS = 15 * 60;

const PHASE_LABELS: Record<ProgressPhaseKey, string> = {
  saved: 'Saved',
  documents: 'Preparing documents',
  queued: 'Queued for submission',
  form_detection: 'Finding the application form',
  field_fill: 'Filling the application',
  attachments: 'Attaching your documents',
  submitting: 'Submitting application',
  verification: 'Confirming submission',
  applied: 'Applied',
  interview: 'Interview',
  offer: 'Offer',
  rejected: 'Closed',
};

/**
 * Substeps of each phase. Only the *current* phase's list is ever returned, so
 * the UI shows "what is happening now", not a seven-stop timeline.
 *
 * `field_fill` and `attachments` are replaced with the real field list when
 * `artifacts.detectedFields` is available.
 */
const PHASE_SUBSTEPS: Partial<Record<ProgressPhaseKey, ProgressSubstep[]>> = {
  documents: [
    { key: 'cv', label: 'Tailoring your CV', status: 'pending' },
    { key: 'cover_letter', label: 'Writing your cover letter', status: 'pending' },
    { key: 'ats', label: 'Running the ATS check', status: 'pending' },
  ],
  form_detection: [
    { key: 'open', label: 'Opening the posting', status: 'pending' },
    { key: 'ats', label: "Recognising the employer's site", status: 'pending' },
    { key: 'form', label: 'Finding the application form', status: 'pending' },
  ],
  field_fill: [
    { key: 'details', label: 'Filling your details', status: 'pending' },
    { key: 'questions', label: 'Answering screening questions', status: 'pending' },
  ],
  attachments: [
    { key: 'cv', label: 'Attaching your tailored CV', status: 'pending' },
    { key: 'cover_letter', label: 'Attaching your cover letter', status: 'pending' },
  ],
  submitting: [{ key: 'submit', label: 'Sending the application', status: 'pending' }],
  verification: [
    { key: 'confirm', label: 'Reading the confirmation page', status: 'pending' },
    { key: 'email', label: 'Watching for the confirmation email', status: 'pending' },
  ],
};

/** Clone a phase's template substeps so callers can't mutate the module state. */
function substepsFor(phase: ProgressPhaseKey): ProgressSubstep[] {
  return (PHASE_SUBSTEPS[phase] || []).map((s) => ({ ...s }));
}

/**
 * Mark substeps up to and including `activeKey` as completed/active.
 * A key that is not in the template leaves the list untouched.
 */
function withProgress(
  steps: ProgressSubstep[],
  activeKey: string,
  activeStatus: SubstepStatus = 'active',
): ProgressSubstep[] {
  const index = steps.findIndex((s) => s.key === activeKey);
  if (index === -1) return steps;
  return steps.map((step, i) => {
    if (i < index) return { ...step, status: 'completed' as SubstepStatus };
    if (i === index) return { ...step, status: activeStatus };
    return { ...step, status: 'pending' as SubstepStatus };
  });
}

/** Every substep of a settled phase is done. */
function allDone(steps: ProgressSubstep[]): ProgressSubstep[] {
  return steps.map((s) => ({ ...s, status: 'completed' as SubstepStatus }));
}

/**
 * Percent inside a phase band.
 *
 * `completed / total` substeps, floored just above the band start so an active
 * phase is visibly distinct from the previous one.
 */
function percentInBand(phase: ProgressPhaseKey, steps: ProgressSubstep[]): number {
  const [start, end] = PHASE_BANDS[phase];
  if (end <= start) return start;
  if (steps.length === 0) return start;
  const done = steps.filter((s) => s.status === 'completed' || s.status === 'skipped').length;
  const activeBonus = steps.some((s) => s.status === 'active') ? 0.5 : 0;
  const ratio = Math.min(1, (done + activeBonus) / steps.length);
  return Math.round(start + (end - start) * ratio);
}

/**
 * `internalStatus` → phase. This is the whole mapping table; every surface
 * reads the result of it and nothing else.
 */
export function phaseForInternalStatus(internalStatus?: string): ProgressPhaseKey {
  switch ((internalStatus || '').toLowerCase()) {
    case 'staging_cv_generating':
    case 'staging_cover_letter_generating':
    case 'staging_ready':
      return 'documents';
    case 'queued':
      return 'queued';
    case 'processing':
    case 'form_detected':
      return 'form_detection';
    case 'submitting':
      return 'submitting';
    case 'verification':
      return 'verification';
    case 'applied':
      return 'applied';
    case 'interview':
      return 'interview';
    case 'offer':
      return 'offer';
    case 'rejected':
      return 'rejected';
    // Parks keep the phase they parked in — decided by the caller, which has
    // the reason. Returning 'saved' here would silently rewind the bar.
    default:
      return 'saved';
  }
}

export interface DetectedField {
  label?: string;
  filled?: boolean;
  fillMethod?: string;
  required?: boolean;
}

export interface ProgressInput {
  applicationId: string;
  jobId?: string;
  /** Canonical stage (`saved` | `staging` | `applied` | …). */
  currentStage?: string;
  /** Legacy tracker status — `created` means "in staging". */
  status?: string;
  internalStatus?: string;
  deadLetter?: boolean;
  /** Latest `APPLICATION_REQUIRES_REVIEW` reason, from GET /api/jobs. */
  reviewReason?: string;
  /** Active queue item state, if any. */
  queueStatus?: 'queued' | 'processing' | null;
  queueEtaSeconds?: number;
  queuePosition?: number;
  /** How long this row has sat in the queue, in seconds. */
  queuedForSeconds?: number;
  /** Journey (document) state. */
  journeyStatus?: string;
  hasCV?: boolean;
  hasCoverLetter?: boolean;
  /** Worker artifacts, when the run recorded any. */
  artifacts?: {
    atsType?: string;
    detectedFields?: DetectedField[];
    fillAudit?: { totalFields?: number; filledFields?: number };
    submissionAttempt?: { success?: boolean; error?: string };
  } | null;
  updatedAt?: string | Date;
}

/** Park reasons that mean "the user must act", split the way the badge splits them. */
const MAYBE_ALREADY_SUBMITTED = /no confirmation evidence|needs manual verification/i;
const AWAITING_APPROVAL = /awaiting (your )?approval|approval before submission|held for your approval/i;
const MANUAL_HALT = /manual|not automatable|captcha|no application form/i;

/**
 * Reasons the server writes for *operators*, not customers.
 *
 * `reviewReason` is produced by the worker and can name a Playwright selector,
 * an env var, a snake_case status code or a raw stack frame. Echoing it into
 * `detail` put operator vocabulary in front of the customer — the same bug as
 * the "no worker pickup" line, just arriving by a different route.
 *
 * Anything matching these is dropped, and the caller's curated copy is used
 * instead. Specificity is worth keeping, so a clean short sentence survives.
 */
const OPERATOR_WORDS =
  /\b(worker|WORKER_ROLE|cron|queue|playwright|puppeteer|selector|locator|stack|trace|env|environment|timeout|timed out|null|undefined|NaN|db|mongo|mongoose|redis|api|endpoint|status code|http|https|www|ats|automation|automatable|engine|adzuna|greenhouse|lever|ashby|workable|workday|naukri|indeed|jobspy|remotive|remoteok)\b/i;

/**
 * Exception-class names are UPPERCASE by convention (`ENOENT`, `ECONNREFUSED`).
 *
 * Deliberately a **separate, case-sensitive** pattern. Folded into the
 * case-insensitive one above as `E[A-Z]{4,}`, `/i` makes `[A-Z]` match lowercase
 * too, so the rule becomes "any word starting with e and at least five letters
 * long" — which matches `employer`, `experience` and `everything`, silently
 * discarding ordinary English reasons. Caught by the clean-sentence check.
 */
const OPERATOR_ERROR_CODE = /\bE[A-Z]{4,}\b/;

const SNAKE_CASE_TOKEN = /\b[a-z][a-z0-9]*(_[a-z0-9]+)+\b/;

/**
 * Return a reason only when a customer could read it as English.
 * Otherwise `undefined`, so the caller's default copy wins.
 */
function sanitizeReason(reason?: string): string | undefined {
  const text = (reason || '').trim();
  if (!text) return undefined;
  // A paragraph is a log line, not a message.
  if (text.length > 180) return undefined;
  /*
    Must read as a sentence. Server reasons are usually fragments like
    "no application form detected" or "captcha present" — comprehensible, but
    they read as a log excerpt under a customer's progress bar. Dropping them
    lets the curated copy do the talking.
  */
  if (!/^[A-Z]/.test(text)) return undefined;
  if (OPERATOR_WORDS.test(text)) return undefined;
  if (OPERATOR_ERROR_CODE.test(text)) return undefined;
  if (SNAKE_CASE_TOKEN.test(text)) return undefined;
  return text;
}

/**
 * The single entry point. Pure — same input, same output, always.
 */
export function deriveApplicationProgress(input: ProgressInput): ApplicationProgress {
  const internal = (input.internalStatus || '').toLowerCase();
  const stage = (input.currentStage || '').toLowerCase();
  const legacyStatus = (input.status || '').toLowerCase();
  const journey = (input.journeyStatus || '').toLowerCase();
  const reason = input.reviewReason || '';
  const artifacts = input.artifacts || null;
  const updatedAt = input.updatedAt ? new Date(input.updatedAt).toISOString() : new Date(0).toISOString();

  const base = {
    applicationId: input.applicationId,
    jobId: input.jobId,
    eta:
      typeof input.queueEtaSeconds === 'number' ? formatQueueEta(input.queueEtaSeconds) : undefined,
    queuePosition: input.queuePosition,
    updatedAt,
  };

  const done = (phase: ProgressPhaseKey, liveText: string, detail?: string): ApplicationProgress => ({
    ...base,
    phase,
    phaseLabel: PHASE_LABELS[phase],
    liveText,
    detail,
    percent: 100,
    state: 'done',
    substeps: allDone(substepsFor(phase)),
    isActive: false,
  });

  // ── 1. Settled stages win outright ──────────────────────────────────
  // The canonical stage is written by the state machine on every verified
  // transition, so it outranks a stale `internalStatus` left behind by a run.
  if (stage === 'rejected' || internal === 'rejected') {
    return done('rejected', 'This application was closed.', sanitizeReason(reason));
  }
  if (stage === 'offer' || internal === 'offer') {
    return done('offer', 'You received an offer.', sanitizeReason(reason));
  }
  if (stage === 'interview' || internal === 'interview') {
    return done('interview', 'You reached the interview stage.', sanitizeReason(reason));
  }
  if (stage === 'applied' || internal === 'applied') {
    return done(
      'applied',
      'Your application was submitted.',
      'Confirmation received. We are tracking replies in your inbox.',
    );
  }

  // ── 2. Parks: nothing is running and only the user can move it ──────
  if (internal === 'review_required') {
    if (MAYBE_ALREADY_SUBMITTED.test(reason)) {
      return {
        ...base,
        phase: 'verification',
        phaseLabel: PHASE_LABELS.verification,
        liveText: 'Submitted, but we could not confirm it.',
        detail:
          'Check the employer site and mark this applied if it went through. We will not re-submit automatically — that could apply twice.',
        percent: PHASE_BANDS.verification[0],
        state: 'waiting_user',
        substeps: substepsFor('verification').map((s) =>
          s.key === 'email' ? { ...s, status: 'active' as SubstepStatus } : { ...s, status: 'completed' as SubstepStatus },
        ),
        action: { id: 'dismiss', label: 'Take over' },
        isActive: true,
      };
    }
    if (AWAITING_APPROVAL.test(reason)) {
      return {
        ...base,
        phase: 'queued',
        phaseLabel: 'Ready to submit',
        liveText: 'Documents ready — waiting for your approval.',
        detail:
          'Approve and your AI agent submits it for you. Nothing is sent without your say-so.',
        percent: PHASE_BANDS.queued[0],
        state: 'waiting_user',
        substeps: [],
        action: { id: 'approve', label: 'Approve & submit' },
        isActive: true,
      };
    }
    if (MANUAL_HALT.test(reason)) {
      return {
        ...base,
        phase: 'queued',
        phaseLabel: 'Needs manual submission',
        liveText: 'We can’t submit this one automatically.',
        detail:
          sanitizeReason(reason) ||
          'This employer’s site needs a human. Open the posting, submit, then mark it applied so tracking stays accurate.',
        percent: PHASE_BANDS.queued[0],
        state: 'waiting_user',
        substeps: [],
        action: { id: 'dismiss', label: 'Apply manually' },
        isActive: true,
      };
    }
    return {
      ...base,
      phase: 'queued',
      phaseLabel: 'Needs your action',
      liveText: 'This application needs your input.',
      /*
        No curated fallback used to exist here, so a reason that failed
        sanitising left the customer with a bare sentence and a button and no
        idea what to do. The fallback is deliberately non-specific: the reason
        was unreadable, so inventing a cause would be worse than admitting we
        paused.
      */
      detail:
        sanitizeReason(reason) ||
        'We paused here so nothing is submitted without you. Review it and continue when you are ready.',
      percent: PHASE_BANDS.queued[0],
      state: 'waiting_user',
      substeps: [],
      action: { id: 'dismiss', label: 'Take over' },
      isActive: true,
    };
  }

  if (internal === 'automation_dismissed') {
    return {
      ...base,
      phase: 'queued',
      phaseLabel: 'Manual submission',
      liveText: 'Auto-Apply is off for this application.',
      detail: 'Submit on the company site, then mark it applied so tracking stays accurate.',
      percent: PHASE_BANDS.queued[0],
      state: 'waiting_user',
      substeps: [],
      isActive: true,
    };
  }

  if (internal === 'automation_failed' || input.deadLetter) {
    return {
      ...base,
      phase: 'submitting',
      phaseLabel: 'Submission failed',
      liveText: 'We could not submit this application.',
      detail:
        sanitizeReason(reason) ||
        'Nothing was sent. You can retry, or apply from the job posting yourself.',
      percent: PHASE_BANDS.submitting[1],
      state: 'failed',
      substeps: substepsFor('submitting').map((s) => ({ ...s, status: 'failed' as SubstepStatus })),
      action: { id: 'retry', label: 'Retry' },
      isActive: true,
    };
  }

  if (internal === 'automation_unknown') {
    return {
      ...base,
      phase: 'verification',
      phaseLabel: PHASE_LABELS.verification,
      liveText: 'We could not confirm this submission.',
      detail:
        'Check whether the application went out, then mark it applied or archive it. We will not retry blindly.',
      percent: PHASE_BANDS.verification[0],
      state: 'waiting_user',
      substeps: substepsFor('verification').map((s) => ({ ...s, status: 'pending' as SubstepStatus })),
      action: { id: 'dismiss', label: 'Take over' },
      isActive: true,
    };
  }

  // ── 3. Document (staging) generation ───────────────────────────────
  const docsReady = Boolean(input.hasCV) && Boolean(input.hasCoverLetter);
  const journeyRunning = ['processing_documents', 'in-progress', 'paused'].includes(journey);
  const journeyFailed = journey === 'creation_failed';

  if (internal === 'staging_cv_generating' || internal === 'staging_cover_letter_generating') {
    const steps = substepsFor('documents');
    const activeKey = internal === 'staging_cv_generating' ? 'cv' : 'cover_letter';
    const marked = withProgress(steps, activeKey);
    return {
      ...base,
      phase: 'documents',
      phaseLabel: PHASE_LABELS.documents,
      liveText:
        activeKey === 'cv'
          ? 'Tailoring your CV to this job…'
          : 'Writing your cover letter…',
      percent: percentInBand('documents', marked),
      state: 'running',
      substeps: marked,
      isActive: true,
    };
  }

  if (internal === 'staging_ready') {
    return {
      ...base,
      phase: 'queued',
      phaseLabel: 'Ready to apply',
      liveText: 'Your documents are ready.',
      detail: 'Send it with Auto-Apply, or apply yourself.',
      percent: PHASE_BANDS.queued[0],
      state: 'waiting_user',
      substeps: [],
      isActive: true,
    };
  }

  if (journeyFailed) {
    const steps = substepsFor('documents').map((s) => ({ ...s, status: 'failed' as SubstepStatus }));
    return {
      ...base,
      phase: 'documents',
      phaseLabel: 'Document generation failed',
      liveText: 'We could not generate your tailored documents.',
      percent: PHASE_BANDS.documents[0],
      state: 'failed',
      substeps: steps,
      isActive: true,
    };
  }

  // A journey that is generating but whose per-document status has not been
  // written yet still reads as "documents", not as "saved".
  if (!docsReady && journeyRunning) {
    const steps = substepsFor('documents');
    const activeKey = input.hasCV ? 'cover_letter' : 'cv';
    const marked = withProgress(steps, activeKey);
    return {
      ...base,
      phase: 'documents',
      phaseLabel: PHASE_LABELS.documents,
      liveText: input.hasCV ? 'Writing your cover letter…' : 'Tailoring your CV to this job…',
      percent: percentInBand('documents', marked),
      state: 'running',
      substeps: marked,
      isActive: true,
    };
  }

  // ── 4. Queue + execution ───────────────────────────────────────────
  /*
    `queueStatus === 'processing'` wins over a stale `internalStatus: 'queued'`:
    the worker has claimed the row and is working, its status write just has not
    landed yet. Read through locals rather than the property so TypeScript does
    not narrow `input.queueStatus` across the branches below.
  */
  const claimedByWorker = input.queueStatus === 'processing';
  const sitsInQueue = internal === 'queued' || input.queueStatus === 'queued';

  if (sitsInQueue && !claimedByWorker) {
    /*
      A worker holding the item is never stalled, whatever the caller passes —
      the wait only counts while nothing has claimed the row.
    */
    const stalled =
      !claimedByWorker &&
      typeof input.queuedForSeconds === 'number' &&
      input.queuedForSeconds >= QUEUE_STALL_SECONDS;
    const waitedSeconds =
      typeof input.queuedForSeconds === 'number' ? input.queuedForSeconds : 0;
    const ahead = input.queuePosition && input.queuePosition > 1 ? input.queuePosition - 1 : 0;

    return {
      ...base,
      phase: 'queued',
      phaseLabel: PHASE_LABELS.queued,
      /*
        The customer is told it is working, in the product's voice, and is given
        a way out if they would rather not wait. "Queued for 12 min with no
        worker pickup" was an ops page rendered in a job card: it named an
        internal role, implied the product was broken, and gave the customer
        nothing to do. A slow queue and a dead queue now read the same to them —
        which is fine, because the difference is not theirs to act on.
      */
      liveText: stalled
        ? 'Taking a little longer than usual…'
        : ahead > 0
          ? `Queued for Auto-Apply — ${ahead} ahead of you.`
          : 'Queued for Auto-Apply…',
      detail: stalled
        ? 'No action needed — we’ll submit this automatically as soon as it’s ready. If you’d rather not wait, you can apply from the job posting yourself.'
        : base.eta
          ? `Estimated start ${base.eta}.`
          : 'Nothing needed from you — this goes out automatically.',
      /*
        The operator still gets the real story, with the diagnosis and where to
        look. `diagnostic` is never rendered by any UI; it is for logs, telemetry
        and admin surfaces. Losing this would mean losing the only app-side
        signal that the queue is not being drained.
      */
      diagnostic: stalled
        ? {
            code: 'queue_stalled',
            waitedSeconds,
            message:
              `Auto-Apply queue not draining: no agent claimed application ` +
              `${input.applicationId} for ${Math.max(1, Math.round(waitedSeconds / 60))} min. ` +
              'Check WORKER_ROLE / the auto-apply cron on the server.',
          }
        : undefined,
      percent: PHASE_BANDS.queued[0],
      state: 'running',
      stalled,
      substeps: [],
      isActive: true,
    };
  }

  if (internal === 'processing' || claimedByWorker) {
    const steps = withProgress(substepsFor('form_detection'), 'open');
    return {
      ...base,
      phase: 'form_detection',
      phaseLabel: PHASE_LABELS.form_detection,
      liveText: 'Opening the job posting…',
      percent: percentInBand('form_detection', steps),
      state: 'running',
      substeps: steps,
      isActive: true,
    };
  }

  if (internal === 'form_detected') {
    // Once the worker has recorded detected fields we know which half of the
    // execution we are in: fields first, then attachments.
    const fields = artifacts?.detectedFields || [];
    const audit = artifacts?.fillAudit;
    const filledAll =
      typeof audit?.filledFields === 'number' &&
      typeof audit?.totalFields === 'number' &&
      audit.totalFields > 0 &&
      audit.filledFields >= audit.totalFields;

    if (filledAll) {
      const steps = withProgress(substepsFor('attachments'), 'cv');
      return {
        ...base,
        phase: 'attachments',
        phaseLabel: PHASE_LABELS.attachments,
        liveText: 'Attaching your CV and cover letter…',
        percent: percentInBand('attachments', steps),
        state: 'running',
        substeps: steps,
        isActive: true,
      };
    }

    const atsLabel = artifacts?.atsType ? ` on ${prettyAts(artifacts.atsType)}` : '';
    const steps =
      fields.length > 0
        ? fields.slice(0, 6).map((f, i) => ({
            key: `field_${i}`,
            label: f.label || 'Field',
            status: (f.filled ? 'completed' : i === 0 ? 'active' : 'pending') as SubstepStatus,
          }))
        : substepsFor('field_fill');

    return {
      ...base,
      phase: 'field_fill',
      phaseLabel: PHASE_LABELS.field_fill,
      liveText: fields.length
        ? `Filling ${fields.length} field${fields.length === 1 ? '' : 's'}${atsLabel}…`
        : `Filling the application form${atsLabel}…`,
      percent: percentInBand('field_fill', steps),
      state: 'running',
      substeps: steps,
      isActive: true,
    };
  }

  if (internal === 'submitting') {
    const steps = withProgress(substepsFor('submitting'), 'submit');
    return {
      ...base,
      phase: 'submitting',
      phaseLabel: PHASE_LABELS.submitting,
      liveText: 'Submitting your application…',
      percent: percentInBand('submitting', steps),
      state: 'running',
      substeps: steps,
      isActive: true,
    };
  }

  if (internal === 'verification') {
    const steps = withProgress(substepsFor('verification'), 'confirm');
    return {
      ...base,
      phase: 'verification',
      phaseLabel: PHASE_LABELS.verification,
      liveText: 'Confirming your application was received…',
      percent: percentInBand('verification', steps),
      state: 'running',
      substeps: steps,
      isActive: true,
    };
  }

  // ── 5. Fallbacks ───────────────────────────────────────────────────
  if (docsReady || stage === 'staging' || legacyStatus === 'created') {
    return {
      ...base,
      phase: 'queued',
      phaseLabel: 'Ready to apply',
      liveText: 'Documents ready — not submitted yet.',
      detail: 'Choose AUTO, REVIEW or MANUAL to continue.',
      percent: PHASE_BANDS.queued[0],
      state: 'waiting_user',
      substeps: [],
      isActive: true,
    };
  }

  // Nothing has run. `idle`, so no surface renders a bar for it.
  return {
    ...base,
    phase: 'saved',
    phaseLabel: PHASE_LABELS.saved,
    liveText: 'Saved to your tracker.',
    percent: PHASE_BANDS.saved[1],
    state: 'idle',
    substeps: [],
    isActive: false,
  };
}

/** "greenhouse" → "Greenhouse" — for live text. */
function prettyAts(ats: string): string {
  const known: Record<string, string> = {
    greenhouse: 'Greenhouse',
    lever: 'Lever',
    ashby: 'Ashby',
    workable: 'Workable',
    workday: 'Workday',
    naukri: 'Naukri',
    indeed: 'Indeed',
    adzuna: 'Adzuna',
  };
  return known[ats.toLowerCase()] || ats;
}
