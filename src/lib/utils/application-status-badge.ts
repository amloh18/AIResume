import type { ChipTone } from '@/components/ui/chip-styles';

/**
 * Application-table badge derivation.
 *
 * The legacy `status` field alone cannot express what the table needs: every
 * application the pipeline parks with a safe halt keeps `status: created/staging`
 * forever, while the real state lives in `internalStatus` plus the reason of its
 * latest `APPLICATION_REQUIRES_REVIEW` event. Rendering all of them as
 * "Submitting" made a reviewable backlog look like an in-flight one.
 *
 * `reviewReason` is that event's `metadata.reason`, attached by GET /api/jobs.
 */

export type StatusIconKey = 'clock' | 'external' | 'eye' | 'x' | 'sparkles' | 'check' | 'none';

export interface ApplicationStatusBadge {
  label: string;
  tone: ChipTone;
  icon: StatusIconKey;
  /** Hover text — usually the raw reason the run parked. */
  title?: string;
}

export interface StatusBadgeInput {
  status?: string;
  internalStatus?: string;
  reviewReason?: string;
}

type BaseGroup = Pick<ApplicationStatusBadge, 'label' | 'tone' | 'icon'>;

/**
 * Raw status → display group. Several statuses collapse onto one label
 * (`screening`/`assessment`/… all render as "Interview"), so this stays a
 * list-of-groups lookup rather than a flat record.
 */
const BASE_GROUPS: Array<{ statuses: string[] } & BaseGroup> = [
  { statuses: ['applied'], label: 'Applied', tone: 'blue', icon: 'clock' },
  {
    statuses: ['interview', 'screening', 'assessment', 'phone_screen', 'technical_test'],
    label: 'Interview',
    tone: 'purple',
    icon: 'sparkles',
  },
  { statuses: ['offer', 'accepted'], label: 'Offer', tone: 'emerald', icon: 'check' },
  { statuses: ['rejected'], label: 'Rejected', tone: 'rose', icon: 'x' },
  // In-flight fallback for created/staging while a run is actually live.
  { statuses: ['created', 'staging'], label: 'Submitting', tone: 'amber', icon: 'clock' },
  { statuses: ['draft'], label: 'Draft', tone: 'neutral', icon: 'none' },
];

/**
 * Review-required rows split on the halt reason:
 *   approval-hold  → "Awaiting approval"  (review mode: prepared, waiting on you)
 *   manual-ish     → "Apply manually"     (manual mode, no automatable ATS, CAPTCHA,
 *                                          missing form, automation unavailable)
 *   anything else  → "Needs your action"  (watchdog routes, unknown/legacy halts)
 */
function reviewBadge(reason: string): ApplicationStatusBadge {
  const title = reason || undefined;
  if (/awaiting (your )?approval|approval before submission/i.test(reason)) {
    return { label: 'Awaiting approval', tone: 'violet', icon: 'clock', title };
  }
  if (/manual|not automatable|captcha|no application form/i.test(reason)) {
    return { label: 'Apply manually', tone: 'orange', icon: 'external', title };
  }
  return { label: 'Needs your action', tone: 'rose', icon: 'eye', title };
}

export function deriveApplicationStatusBadge(input: StatusBadgeInput): ApplicationStatusBadge {
  const status = (input.status || 'draft').toLowerCase();
  const internal = (input.internalStatus || '').toLowerCase();
  const reason = input.reviewReason || '';

  if (status === 'created' || status === 'staging') {
    if (internal === 'review_required') return reviewBadge(reason);
    if (internal === 'automation_failed') return { label: 'Failed', tone: 'rose', icon: 'x' };
    if (!internal) {
      // Pre-state-machine rows: no live run, no queue item — nothing will ever
      // move them, so they must not masquerade as submitting either.
      return {
        label: 'Needs your action',
        tone: 'rose',
        icon: 'eye',
        title: 'Created before state tracking existed — no live run or queue item. Review or archive it.',
      };
    }
    return { label: 'Submitting', tone: 'amber', icon: 'clock' };
  }

  const group = BASE_GROUPS.find((g) => g.statuses.includes(status));
  if (group) return { label: group.label, tone: group.tone, icon: group.icon };
  return { label: 'Draft', tone: 'neutral', icon: 'none' };
}
