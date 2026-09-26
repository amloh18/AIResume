import Notification from '@/models/Notification';
import notificationService from '@/lib/services/notificationService';
import { log } from '@/lib/structured-logger';

/**
 * "Take action" alerts for parked/failed applications.
 *
 * Called by the application worker right after `processApplication` returns a
 * terminal-but-not-done outcome, so the user learns about it without polling:
 *
 *   review_required + approval hold → application_approval_required
 *   review_required + anything else → application_action_required
 *   automation_failed               → application_automation_failed
 *
 * Every alert carries a WORKING route: `/dashboard/jobs?tab=applications&jobId=<applicationId>`
 * opens the applications tab and deep-links straight into that application's
 * detail modal (ApplicationsPanel deep-link effect). The same id later lets
 * `applicationAutomationActionService` mark these notifications read when the
 * user acts.
 *
 * Three rules:
 *   - never throws: a notification problem must not affect queue processing;
 *   - 24h per-application dedupe per type: retries/backoff cannot spam;
 *   - explicit `in-app` channel: these are actionable alerts, delivery does
 *     not depend on preference bookkeeping for a type the user never saw.
 */

export type ApplicationAlertType =
  | 'application_approval_required'
  | 'application_action_required'
  | 'application_automation_failed';

const APPROVAL_HOLD_RE = /awaiting (your )?approval|approval before submission|held for your approval/i;

const DEDUPE_WINDOW_MS = 24 * 60 * 60 * 1000;
const MAX_TITLE_LENGTH = 200;

export function classifyApplicationAlert(
  status: string,
  reason: string
): ApplicationAlertType | null {
  if (status === 'automation_failed') return 'application_automation_failed';
  if (status !== 'review_required') return null;
  return APPROVAL_HOLD_RE.test(reason || '')
    ? 'application_approval_required'
    : 'application_action_required';
}

function clamp(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

export interface ApplicationAlertOutcome {
  userId: string;
  applicationId: string;
  jobTitle?: string;
  company?: string;
  status: string;
  reason: string;
}

export async function notifyApplicationNeedsAction(outcome: ApplicationAlertOutcome): Promise<void> {
  try {
    const { userId, applicationId, jobTitle, company, status, reason } = outcome;
    const type = classifyApplicationAlert(status, reason);
    if (!type || !userId || !applicationId) return;

    const label = [company, jobTitle].filter(Boolean).join(' — ') || 'your application';

    const recent = await Notification.findOne({
      userId,
      type,
      'metadata.applicationId': applicationId,
      createdAt: { $gte: new Date(Date.now() - DEDUPE_WINDOW_MS) },
    })
      .select('_id')
      .lean();
    if (recent) return;

    const actionUrl = `/dashboard/jobs?tab=applications&jobId=${applicationId}`;
    const title =
      type === 'application_approval_required'
        ? clamp(`Approval needed — ${label}`, MAX_TITLE_LENGTH)
        : type === 'application_automation_failed'
          ? clamp(`Submission failed — ${label}`, MAX_TITLE_LENGTH)
          : clamp(`Action needed — ${label}`, MAX_TITLE_LENGTH);

    const message =
      type === 'application_automation_failed'
        ? `${reason} Open the application to retry, or take over and apply manually.`
        : reason;

    await notificationService.createNotification({
      userId,
      type,
      title,
      message: clamp(message, 500),
      actionType: 'review_job',
      actionUrl,
      actionData: { jobId: applicationId, url: actionUrl },
      interactive: true,
      priority: 'high',
      category: 'application_tracker',
      channels: ['in-app'],
      metadata: { applicationId, status, reason: clamp(reason || '', 500) },
    });
  } catch (err: any) {
    log.warn('[ApplicationActionNotifier] Failed to create notification', { error: err?.message });
  }
}
