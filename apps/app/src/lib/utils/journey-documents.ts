import type { CVJourney } from '@/types/cv';

/**
 * Journey → document readiness, in ONE place.
 *
 * Three surfaces used to answer "does this application have its documents?"
 * with three different rules:
 *
 *   JobKanbanCard   `Boolean(journey.cvId) && Boolean(journey.coverLetterId)`
 *   JobSidebar      `journey.cvId || job.cvId || fallbackMasterCvId`
 *   JobsDashboard   `journey.cvId || journey.coverLetterId` (per jobId, OR-ed)
 *
 * The sidebar rule was the loosest — it counted the user's **Master CV** as a
 * tailored document, so a job with no journey at all could read
 * "Tailored CV ✓ Tailored & Ready". The kanban rule was the strictest and read
 * "Partially generated" for a job whose journey existed but had not reached the
 * list yet. Both were "right" for their own definition, which is exactly how a
 * single application ends up described three ways on three screens.
 *
 * The journey document is the only record of which CV / cover letter belongs to
 * an application (`ApplicationJourney.cvId` / `.coverLetterId`), so it is the
 * only thing any surface may derive readiness from.
 */

/** Statuses that mean "generation is still running" — not a terminal outcome. */
export const JOURNEY_PROCESSING_STATUSES = [
  'processing_documents',
  'in-progress',
  'paused',
] as const;

/** Terminal failure. `creation_failed` is the only one the service writes. */
export const JOURNEY_FAILED_STATUS = 'creation_failed';

/** Settled *and* both documents linked — the journey's own definition of done. */
export const JOURNEY_READY_STATUS = 'ready';

export function isJourneyProcessing(status?: string | null): boolean {
  return (
    !!status &&
    (JOURNEY_PROCESSING_STATUSES as readonly string[]).includes(status)
  );
}

export function isJourneyFailed(status?: string | null): boolean {
  return status === JOURNEY_FAILED_STATUS;
}

export interface JourneyDocuments {
  hasCV: boolean;
  hasCoverLetter: boolean;
  /** Both links exist — this is the only definition of "ready". */
  ready: boolean;
  /** A journey exists but at least one document link is missing. */
  partial: boolean;
}

const NO_DOCUMENTS: JourneyDocuments = {
  hasCV: false,
  hasCoverLetter: false,
  ready: false,
  partial: false,
};

export function getJourneyDocuments(
  journey?: CVJourney | null,
): JourneyDocuments {
  if (!journey) return NO_DOCUMENTS;

  const hasCV = Boolean(journey.cvId);
  const hasCoverLetter = Boolean(journey.coverLetterId);

  return {
    hasCV,
    hasCoverLetter,
    ready: hasCV && hasCoverLetter,
    partial: !(hasCV && hasCoverLetter),
  };
}

/**
 * The same question asked of **all** journeys attached to one application.
 *
 * A job can legitimately carry more than one journey row (a retry after a
 * partial failure), and its documents are then the *union* of their links — a
 * CV on one and a cover letter on the other is a complete application. Taking
 * only `journeys[0]` (which the kanban card did) turned that into
 * "Partially generated" and offered to regenerate a document that existed.
 */
export function getJourneyDocumentsForJob(
  journeys?: Array<CVJourney | null | undefined> | null,
): JourneyDocuments {
  const list = (journeys || []).filter(Boolean) as CVJourney[];
  if (list.length === 0) return NO_DOCUMENTS;

  const hasCV = list.some((journey) => Boolean(journey.cvId));
  const hasCoverLetter = list.some((journey) => Boolean(journey.coverLetterId));

  return {
    hasCV,
    hasCoverLetter,
    ready: hasCV && hasCoverLetter,
    partial: !(hasCV && hasCoverLetter),
  };
}

/**
 * What a card should *say* about document state.
 *
 * `none` is deliberately distinct from `partial`: "Partially generated" beside
 * two red icons reads as a failed half-generation, when the common case is
 * simply that no journey has been started for this job yet.
 */
export type JourneyDocumentState =
  | 'none'
  | 'generating'
  | 'failed'
  | 'partial'
  | 'ready';

export function getJourneyDocumentState(
  journey: CVJourney | null | undefined,
  opts: { isPending?: boolean; timedOut?: boolean } = {},
): JourneyDocumentState {
  if (!journey) {
    // No journey row yet. If the parent has asked for one, it is generating.
    return opts.isPending ? 'generating' : 'none';
  }

  const docs = getJourneyDocuments(journey);

  if (isJourneyFailed(journey.status)) return 'failed';
  if (docs.ready) return 'ready';
  if (isJourneyProcessing(journey.status)) return 'generating';
  // Settled, but a document is missing: a real half-finished journey — unless
  // the poll deadline already expired, which the caller treats as a failure.
  return opts.timedOut ? 'failed' : 'partial';
}

/** `getJourneyDocumentState` over every journey attached to one application. */
export function getJourneyDocumentStateForJob(
  journeys?: Array<CVJourney | null | undefined> | null,
  opts: { isPending?: boolean; timedOut?: boolean } = {},
): JourneyDocumentState {
  const list = (journeys || []).filter(Boolean) as CVJourney[];
  if (list.length === 0) return opts.isPending ? 'generating' : 'none';

  const docs = getJourneyDocumentsForJob(list);

  // Links win: a complete application is complete regardless of a stale
  // sibling row left behind by an earlier retry.
  if (docs.ready) return 'ready';
  if (list.some((journey) => isJourneyProcessing(journey.status))) {
    return 'generating';
  }
  if (list.every((journey) => isJourneyFailed(journey.status))) return 'failed';

  return opts.timedOut ? 'failed' : 'partial';
}

/**
 * The shape `/api/jobs` embeds on each application (`job.journey`). It is the
 * same row as `/api/journeys` returns, minus the presentation fields, and it
 * arrives with the job — so it is the fallback when the journey *list* is
 * unavailable, never a second source of truth.
 */
export interface EmbeddedJourney {
  _id?: unknown;
  journeyId?: string;
  status?: string;
  cvId?: string | null;
  coverLetterId?: string | null;
  generationState?: unknown;
  currentStep?: number;
}

/** Normalise the embedded shape to what a `CVJourney` consumer expects. */
export function toJourneyView(
  journey: EmbeddedJourney,
  jobId: string,
): CVJourney {
  return {
    id: String(journey._id ?? journey.journeyId ?? jobId),
    jobId,
    status: journey.status,
    cvId: journey.cvId ?? undefined,
    coverLetterId: journey.coverLetterId ?? undefined,
    currentStep: journey.currentStep,
    generationState: journey.generationState,
  } as CVJourney;
}

export interface JourneyIndexJob {
  _id?: unknown;
  id?: unknown;
  jobId?: unknown;
  journey?: EmbeddedJourney | null;
}

/**
 * Build the `applicationId -> journeys` index every tracker surface reads.
 *
 * Keyed by the **JobApplication** id in both directions: `/api/journeys` rows
 * carry `jobId` = the application `_id`, and the embedded `job.journey` hangs
 * off the application itself. Keeping one key space is what lets the kanban, the
 * list and the sidebar agree.
 *
 * The list wins when both are present (it is the fuller row); the embedded copy
 * only fills gaps, so a failed list request degrades to "slightly less detail"
 * rather than to "no documents".
 */
export function buildJourneyIndex(
  listJourneys: Array<Partial<CVJourney> & { jobId?: string }> | undefined,
  jobs: JourneyIndexJob[] | undefined,
): Map<string, CVJourney[]> {
  const index = new Map<string, CVJourney[]>();

  const push = (key: string, journey: CVJourney) => {
    if (!key) return;
    const existing = index.get(key);
    if (existing) {
      if (!existing.some((j) => j.id === journey.id)) existing.push(journey);
    } else {
      index.set(key, [journey]);
    }
  };

  for (const journey of listJourneys || []) {
    const key = String(journey?.jobId || '');
    if (key) push(key, journey as CVJourney);
  }

  for (const job of jobs || []) {
    const key = String(job?._id ?? job?.id ?? '');
    if (!key || index.has(key)) continue;
    if (job?.journey) push(key, toJourneyView(job.journey, key));
  }

  return index;
}

/** Resolve the journeys for one application from an index built above. */
export function getJobJourneysFromIndex(
  index: Map<string, CVJourney[]>,
  jobId?: string | null,
): CVJourney[] {
  if (!jobId) return [];
  return index.get(String(jobId)) || [];
}
