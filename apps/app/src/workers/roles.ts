/**
 * Worker role resolution.
 *
 * BuildAIResume runs two container roles from one image:
 *
 *   web    — the Next.js app. No background loops. Redeploying the site must not interrupt them.
 *   worker — the long-running loops (email delivery, inbound email ingestion, application queue,
 *            reconciliation). No HTTP traffic, no Next.js runtime.
 *
 * `WORKER_ROLE=web` on the web service is the only change needed to move the loops out; the worker
 * service works with `WORKER_ROLE` unset (the default, `all`, keeps the previous single-container
 * behaviour working).
 *
 * Unrecognised values fail *open* to `all`: a typo must not silently stop queue processing. The
 * application queue claims work atomically (`claimNextApplication`), and application emails are keyed
 * by idempotency key, so two processes running the loops is wasteful but not corrupting — whereas no
 * process running them stalls applications until someone notices.
 */

export type WorkerRole = 'all' | 'web' | 'worker';

/**
 * Environment lookup. `process.env` satisfies this, and a plain object works in tests — the project's
 * `NodeJS.ProcessEnv` requires `NODE_ENV`, which makes it impossible to construct a partial env.
 */
export type WorkerEnv = Record<string, string | undefined>;

/** One key per background loop. Keep in sync with `getWorkerPlan`. */
export interface WorkerPlan {
  /** Outbound application/transactional email delivery. */
  email: boolean;
  /** Inbound mailbox polling (Stalwart JMAP) → Communication records. */
  emailIngestion: boolean;
  /** ApplicationQueue drain → Playwright ATS submission. */
  applicationQueue: boolean;
  /** Stuck-application recovery watchdog. */
  reconciliation: boolean;
}

export const WORKER_LOOP_KEYS = [
  'email',
  'emailIngestion',
  'applicationQueue',
  'reconciliation',
] as const satisfies readonly (keyof WorkerPlan)[];

const ROLE_PLANS: Record<WorkerRole, WorkerPlan> = {
  all: { email: true, emailIngestion: true, applicationQueue: true, reconciliation: true },
  worker: { email: true, emailIngestion: true, applicationQueue: true, reconciliation: true },
  web: { email: false, emailIngestion: false, applicationQueue: false, reconciliation: false },
};

export interface WorkerRoleResolution {
  role: WorkerRole;
  /** Set when the raw value was unusable (unknown role), so callers can log it once at startup. */
  warning?: string;
}

export function parseWorkerRole(raw: string | undefined | null): WorkerRoleResolution {
  const value = (raw ?? '').trim().toLowerCase();

  if (value === '') return { role: 'all' };
  if (value === 'all' || value === 'web' || value === 'worker') return { role: value };

  return {
    role: 'all',
    warning: `Unrecognized WORKER_ROLE=${JSON.stringify(raw)} — falling back to "all" (all loops run in this process). Expected one of: all, web, worker.`,
  };
}

export function resolveWorkerRole(env: WorkerEnv = process.env): WorkerRoleResolution {
  return parseWorkerRole(env.WORKER_ROLE);
}

export function getWorkerPlan(role: WorkerRole): WorkerPlan {
  return { ...ROLE_PLANS[role] };
}

export function getEnabledLoops(plan: WorkerPlan): (keyof WorkerPlan)[] {
  return WORKER_LOOP_KEYS.filter((key) => plan[key]);
}

export function isWorkerProcess(plan: WorkerPlan): boolean {
  return getEnabledLoops(plan).length > 0;
}

export function describeWorkerPlan(plan: WorkerPlan): string {
  const enabled = getEnabledLoops(plan);
  return enabled.length === 0 ? 'none' : enabled.join(', ');
}
