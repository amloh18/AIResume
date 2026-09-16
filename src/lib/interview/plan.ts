/**
 * Shared helpers for the interview plan endpoints.
 *
 * Both `/api/interview/[jobId]/plan` (read) and `/api/interview/initiate`
 * (generate) need to hand the client the same two things:
 *
 *   1. a `session` object the hub can render, and
 *   2. questions grouped by module id.
 *
 * Keeping that in one place means `initiate` can return the grouped shape
 * directly, so the client no longer has to make a second `plan` round-trip
 * after generating.
 */

export interface InterviewModule {
  id: string;
  name?: string;
  questionIds?: unknown[];
  [key: string]: unknown;
}

export interface InterviewQuestion {
  id?: unknown;
  _id?: unknown;
  [key: string]: unknown;
}

/**
 * Group questions under their owning module id.
 *
 * A question belongs to the module whose `questionIds` contains its id. Any
 * question that matches no module lands under `'unassigned'` rather than being
 * dropped, so the client can still surface it. Every module is initialised
 * (even when empty) so the UI can render the full learning path.
 */
export function groupQuestionsByModule(
  modules: InterviewModule[] = [],
  questions: InterviewQuestion[] = []
): Record<string, InterviewQuestion[]> {
  const questionsByModule: Record<string, InterviewQuestion[]> = {};
  let unassigned = 0;

  for (const q of questions) {
    const qId = q.id ? String(q.id) : q._id ? String(q._id) : null;

    if (!qId) {
      console.warn('⚠️ Question found with no ID:', q);
      continue;
    }

    // NB: not named `module` — Next.js forbids assigning to that identifier
    // (@next/next/no-assign-module-variable).
    const owningModule = modules.find((m) =>
      m.questionIds?.some((mid) => String(mid) === qId)
    );
    const moduleId = owningModule?.id || 'unassigned';
    if (moduleId === 'unassigned') unassigned += 1;

    if (!questionsByModule[moduleId]) questionsByModule[moduleId] = [];
    questionsByModule[moduleId].push(q);
  }

  if (unassigned > 0) {
    console.warn(
      `⚠️ ${unassigned}/${questions.length} question(s) not assigned to any module`
    );
  }

  for (const m of modules) {
    if (!questionsByModule[m.id]) questionsByModule[m.id] = [];
  }

  return questionsByModule;
}

export interface SessionJobLike {
  _id: unknown;
  jobTitle?: string;
  company?: string;
}

/**
 * The renderable session object.
 *
 * When `interviewCoach` is absent this yields a *shell*: enough for the hub to
 * paint its header and card frames (real role + company) while the AI is still
 * generating. That is what lets the page render the UI first and stream the
 * content in, instead of blocking on a full-screen loader.
 */
export function buildSession(
  job: SessionJobLike,
  interviewCoach?: {
    status?: string;
    generatedAt?: Date | string | null;
    modules?: InterviewModule[];
    readinessScore?: number;
  } | null,
  currentStreak = 0
) {
  const modules = interviewCoach?.modules ?? [];

  return {
    _id: job._id,
    jobId: {
      _id: job._id,
      jobTitle: job.jobTitle,
      company: job.company,
    },
    targetRole: job.jobTitle,
    modules,
    readinessScore: interviewCoach?.readinessScore ?? 0,
    status: interviewCoach?.status ?? 'not_started',
    generatedAt: interviewCoach?.generatedAt ?? null,
    currentStreak,
  };
}
