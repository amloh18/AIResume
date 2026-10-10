import type { ChipTone } from '@/components/ui/chip-styles';
import { formatQueueEta } from '@/lib/utils/queue-eta';

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
 * `queueEtaSeconds`/`queuePosition` come from the same route's active-queue
 * join (src/lib/utils/queue-eta.ts).
 *
 * The badge also carries the ONE control the row needs right now (`action`),
 * so list, kanban, sidebar and notification all offer the same verb:
 *   approve → POST /api/applications/[id]/automation {action:'approve'}
 *   dismiss → …{action:'dismiss'} (cancel automation, apply manually)
 *   retry   → …{action:'retry'}
 */

export type StatusIconKey = 'clock' | 'external' | 'eye' | 'x' | 'sparkles' | 'check' | 'key' | 'none';

export type BadgeActionId = 'approve' | 'dismiss' | 'retry' | 'enter_code' | 'submit_code';

export interface BadgeAction {
  id: BadgeActionId;
  label: string;
}

export interface ApplicationStatusBadge {
  label: string;
  tone: ChipTone;
  icon: StatusIconKey;
  /** Hover text — usually the raw reason the run parked. */
  title?: string;
  /** Formatted queue ETA ("~2 min") for rows with a live queue item. */
  eta?: string;
  /** The single control this row needs right now, if any. */
  action?: BadgeAction;
}

export interface StatusBadgeInput {
  status?: string;
  internalStatus?: string;
  reviewReason?: string;
  /** Seconds until this application's run is expected to finish. */
  queueEtaSeconds?: number;
  /** 1-based position in the active queue (1 = running / next to run). */
  queuePosition?: number;
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
 *
 * Every review row gets a control: approval-hold rows can approve automated
 * submission directly; everything else resolves by the user taking over
 * (dismiss cancels the queued item so the worker can never submit behind
 * their back). The one halt without a control is handled below — the
 * unverified-submission case, which must never be re-submitted.
 */
function reviewBadge(reason: string): ApplicationStatusBadge {
  const title = reason || undefined;
  if (/no confirmation evidence|needs manual verification/i.test(reason)) {
    // May already be out there — only "handle it manually" is safe, and the
    // badge offers no one-click verb that could double-submit.
    return { label: 'Needs your action', tone: 'rose', icon: 'eye', title };
  }
  if (/verification|security.?code|otp|enter.?code/i.test(reason)) {
    return {
      label: 'Verification code needed',
      tone: 'amber',
      icon: 'key',
      title: title || 'Greenhouse sent an 8-character verification code to your email.',
      action: { id: 'enter_code', label: 'Enter code' },
    };
  }
  if (/awaiting (your )?approval|approval before submission|held for your approval/i.test(reason)) {
    return {
      label: 'Awaiting approval',
      tone: 'violet',
      icon: 'clock',
      title,
      action: { id: 'approve', label: 'Approve & submit' },
    };
  }
  if (/manual|not automatable|captcha|no application form/i.test(reason)) {
    return {
      label: 'Apply manually',
      tone: 'orange',
      icon: 'external',
      title,
      action: { id: 'dismiss', label: 'Apply manually' },
    };
  }
  return {
    label: 'Needs your action',
    tone: 'rose',
    icon: 'eye',
    title,
    action: { id: 'dismiss', label: 'Take over' },
  };
}

/** ETA suffix + hover copy for rows with a live queue item. */
function withEta(badge: ApplicationStatusBadge, input: StatusBadgeInput): ApplicationStatusBadge {
  if (typeof input.queueEtaSeconds !== 'number') return badge;
  const eta = formatQueueEta(input.queueEtaSeconds);
  const position =
    typeof input.queuePosition === 'number' && input.queuePosition > 1
      ? ` Position ${input.queuePosition} in queue.`
      : '';
  return {
    ...badge,
    eta,
    title: `${badge.title ? `${badge.title} ` : ''}Estimated completion ${eta}.${position}`,
  };
}

export function deriveApplicationStatusBadge(input: StatusBadgeInput): ApplicationStatusBadge {
  const status = (input.status || 'draft').toLowerCase();
  const internal = (input.internalStatus || '').toLowerCase();
  const reason = input.reviewReason || '';

  if (status === 'created' || status === 'staging' || internal === 'verification') {
    if (internal === 'verification') {
      return {
        label: 'Verification code needed',
        tone: 'amber',
        icon: 'key',
        title: reason || 'Greenhouse sent an 8-character verification code to your email.',
        action: { id: 'enter_code', label: 'Enter code' },
      };
    }
    if (internal === 'review_required') return reviewBadge(reason);
    if (internal === 'automation_dismissed') {
      return {
        label: 'Apply manually',
        tone: 'orange',
        icon: 'external',
        title: 'Automation stopped — apply manually and mark the application applied when done.',
      };
    }
    if (internal === 'automation_failed') {
      return {
        label: 'Failed',
        tone: 'rose',
        icon: 'x',
        title: 'The automation run failed — retry it, or take over and apply manually.',
        action: { id: 'retry', label: 'Retry' },
      };
    }
    if (internal === 'automation_unknown') {
      // Outcome never confirmed — a blind retry could double-submit.
      return {
        label: 'Needs your action',
        tone: 'rose',
        icon: 'eye',
        title:
          'The run ended without confirmation — check whether the application went out, then mark it applied or archive it.',
      };
    }
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
    // queued / processing / form_detected / staging_* — a run is (or will be) live.
    return withEta({ label: 'Submitting', tone: 'amber', icon: 'clock' }, input);
  }

  const group = BASE_GROUPS.find((g) => g.statuses.includes(status));
  if (group) {
    if (group.label === 'Submitting') return withEta({ ...group }, input);
    return { label: group.label, tone: group.tone, icon: group.icon };
  }
  return { label: 'Draft', tone: 'neutral', icon: 'none' };
}
