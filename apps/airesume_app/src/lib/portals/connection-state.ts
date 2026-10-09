/**
 * Canonical job-source connection vocabulary.
 *
 * ## Why this module exists
 *
 * The persisted status enum on `PortalConnection` is a *storage* concern: it has
 * eight values (`pending`, `connecting`, `connected`, `expired`,
 * `reauth_required`, `disconnected`, `error`, `blocked`) because the adapters and
 * the sync worker need to distinguish failure modes.
 *
 * The UI needs the opposite: five states, and one of them — "your attention is
 * required" — is the whole reason a user ever comes back to this screen.
 *
 * Those two vocabularies were previously collapsed *independently* in three
 * places (the service, `AutoApplyPanel`, and `JobsDashboard`), and every one of
 * them flattened `expired` / `reauth_required` / `error` down to `disconnected`.
 * The effect: a connection that had silently rotted looked identical to one the
 * user never created, and no surface could ever ask them to fix it.
 *
 * So the projection lives here, once, and is derived from the record rather than
 * from a boolean. This file is deliberately **dependency-free** — no mongoose, no
 * React — so the server and the client cannot drift apart again.
 */

/** The only external account sources in this phase. AIResume's own network is not one of them. */
export const JOB_SOURCE_PROVIDERS = ['naukri', 'indeed', 'linkedin'] as const;

export type JobSourceProvider = (typeof JOB_SOURCE_PROVIDERS)[number];

/** User-facing connection state. `attention_required` is reachable — that is the point. */
export type JobSourceState =
  | 'not_connected'
  | 'connecting'
  | 'connected'
  | 'attention_required'
  | 'disconnected';

/** Storage statuses that mean "connected, but not healthily". */
const DEGRADED_HEALTH = new Set(['degraded', 'expired', 'reauth_required']);

/** Storage statuses that mean "the connection needs the user to act". */
const ATTENTION_STATUSES = new Set(['expired', 'reauth_required', 'error', 'blocked']);

/**
 * Project a stored `PortalConnection` (or the absence of one) into a UI state.
 *
 * `hasPriorConnection` distinguishes "never connected" from "was connected, now
 * disconnected". Both render as *Not connected*, but only the latter can honestly
 * say "previously connected", and the distinction is what stops a disconnect from
 * looking like a brand-new account.
 */
export function deriveJobSourceState(input: {
  status?: string | null;
  healthStatus?: string | null;
  hasPriorConnection?: boolean;
}): JobSourceState {
  const { status, healthStatus, hasPriorConnection = false } = input;

  if (!status) return hasPriorConnection ? 'disconnected' : 'not_connected';

  if (status === 'pending' || status === 'connecting') return 'connecting';
  if (status === 'disconnected') return hasPriorConnection ? 'disconnected' : 'not_connected';

  if (ATTENTION_STATUSES.has(status)) return 'attention_required';

  if (status === 'connected') {
    // A healthy record can still carry an unhealthy `health` sub-document: the
    // sync worker degrades health without flipping `status`. Trust the worse of
    // the two, or a rotted connection reads as fine.
    return healthStatus && DEGRADED_HEALTH.has(healthStatus) ? 'attention_required' : 'connected';
  }

  return 'not_connected';
}

/** True when the source should be presented as usable without further user action. */
export function isConnectedState(state: JobSourceState): boolean {
  return state === 'connected';
}

/** True when the UI should prompt the user to fix the connection. */
export function needsAttention(state: JobSourceState): boolean {
  return state === 'attention_required';
}

// ---------------------------------------------------------------------------
// Presentation
// ---------------------------------------------------------------------------

export interface JobSourceDescriptor {
  provider: JobSourceProvider;
  /** Card title. */
  name: string;
  /** One-line honest description of what connecting does today. */
  description: string;
  /** Connected-state subtitle, e.g. Indeed is a global account. */
  connectedSubtitle: string;
  /** Tailwind classes for the card's icon tile. */
  iconClass: string;
  /** Direct portal login page URL. */
  loginUrl: string;
  /** Portal domain for display. */
  domain: string;
}

/**
 * ⚠️ `description` must describe what connecting actually does **today**.
 *
 * The previous copy promised "Personalized discovery feed", "Automated
 * application support" and "Direct application sync". None of those were
 * implemented, and promising them is how a user ends up believing an account is
 * feeding jobs into the product when nothing is reading from it.
 */
export const JOB_SOURCE_DESCRIPTORS: Record<JobSourceProvider, JobSourceDescriptor> = {
  naukri: {
    provider: 'naukri',
    name: 'Naukri',
    description: 'Connect your Naukri account to personalize your AIResume job workflow.',
    connectedSubtitle: 'Account connected',
    iconClass: 'bg-blue-50 dark:bg-blue-950/30 text-blue-500',
    loginUrl: 'https://www.naukri.com/nlogin/login',
    domain: 'naukri.com',
  },
  indeed: {
    provider: 'indeed',
    name: 'Indeed',
    description: 'Connect your Indeed account to personalize your AIResume job workflow.',
    connectedSubtitle: 'Global account',
    iconClass: 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-500',
    loginUrl: 'https://secure.indeed.com/auth',
    domain: 'indeed.com',
  },
  linkedin: {
    provider: 'linkedin',
    name: 'LinkedIn',
    description: 'Connect your LinkedIn account to personalize your AIResume job workflow.',
    connectedSubtitle: 'Account connected',
    iconClass: 'bg-sky-50 dark:bg-sky-950/30 text-sky-500',
    loginUrl: 'https://www.linkedin.com/login',
    domain: 'linkedin.com',
  },
};

/** A single source as the API returns it, and as every surface renders it. */
export interface JobSourceConnectionView {
  source: JobSourceProvider;
  name: string;
  state: JobSourceState;
  /** ISO timestamp of when the account was connected. */
  connectedAt?: string;
  /**
   * The identifier the user supplied. Absent when we do not have one — we do not
   * synthesise a placeholder, because a fabricated `you@indeed.user` displayed
   * back as fact is worse than showing nothing.
   */
  accountIdentifier?: string;
  /** Safe, user-presentable failure reason. Never a stack trace or internal code. */
  lastError?: string;
  /** True when a stored record exists, so the UI can offer Manage rather than Connect. */
  hasRecord: boolean;
}

/**
 * AIResume's own network. Always available, never a user-connected account.
 *
 * `sourceCount` and `jobCount` are read from the ingestion system's real data —
 * they are **not** hard-coded here. When ingestion cannot be measured the API
 * omits them and the UI says so instead of inventing a number.
 */
export interface JobNetworkView {
  alwaysConnected: true;
  sourceCount?: number;
  jobCount?: number;
  /** Set when ingestion stats could not be read, so the UI can degrade honestly. */
  statsUnavailable?: boolean;
}

export interface JobSourceConnectionsResponse {
  success: boolean;
  network: JobNetworkView;
  sources: JobSourceConnectionView[];
}

export const JOB_SOURCES_QUERY_KEY = ['job-source-connections'] as const;

/**
 * Emails the old adapters invented when the user supplied none
 * (`${displayName}@naukri.user` and friends). Rows carrying one of these are
 * pre-existing fabricated data, not user input — the migration clears them and
 * nothing may display them.
 */
const SYNTHETIC_ACCOUNT_DOMAIN = /@(naukri|indeed|linkedin)\.(user|member)$/i;

export function isSyntheticAccountIdentifier(identifier?: string | null): boolean {
  if (!identifier) return false;
  return SYNTHETIC_ACCOUNT_DOMAIN.test(identifier.trim());
}

// ---------------------------------------------------------------------------
// Date formatting
// ---------------------------------------------------------------------------

/**
 * Card form: "23 Sep 2026".
 *
 * Fixed to `en-GB` rather than the runtime locale on purpose — the two surfaces
 * that render it (Settings and onboarding) must agree, and a locale-dependent
 * format makes the same connection read differently on two machines.
 */
export function formatConnectedDate(iso?: string): string | undefined {
  if (!iso) return undefined;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** Detail form: "23 September 2026", used in the Manage dialog. */
export function formatConnectedDateLong(iso?: string): string | undefined {
  if (!iso) return undefined;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
