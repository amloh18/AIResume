/**
 * Queue position + estimated-completion util shared by GET /api/jobs (row
 * enrichment) and POST /api/applications/[id]/automation (approve/retry
 * response), so the chip in the table and the toast after an approval always
 * agree.
 *
 * The worker claims with `sort: { priority: -1, scheduledAt: 1 }` and runs
 * ONE application at a time (concurrency 1, drain-chained ticks — see
 * src/workers/applicationWorker.ts), so a queued item's completion time is
 * essentially: (slots ahead × time per run) + its own run.
 *
 * The 75s average is a deliberately conservative default: a review-mode
 * preparation run is far faster, a Playwright auto-submit slower. It is a
 * display estimate only — nothing in the worker consults it.
 */

export const ESTIMATED_SECONDS_PER_APPLICATION = 75;
export const MIN_QUEUE_ETA_SECONDS = 30;
export const MAX_QUEUE_ETA_SECONDS = 30 * 60;

export interface ActiveQueueItem {
  /** JobApplication _id the item belongs to (Mixed field — compare as string). */
  applicationId: unknown;
  status: 'queued' | 'processing';
  priority?: number;
  scheduledAt?: Date | string | number | null;
}

export interface QueueEtaEstimate {
  /** 1-based: 1 = running now or the very next to run. */
  position: number;
  etaSeconds: number;
}

function toMillis(value: ActiveQueueItem['scheduledAt']): number {
  if (value == null) return 0;
  const t = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isFinite(t) ? t : 0;
}

function clampEta(seconds: number): number {
  return Math.min(MAX_QUEUE_ETA_SECONDS, Math.max(MIN_QUEUE_ETA_SECONDS, Math.round(seconds)));
}

/**
 * Sorts active items the same way the worker claims them
 * (priority desc, then scheduledAt asc).
 */
function sortActive(items: ActiveQueueItem[]): ActiveQueueItem[] {
  return [...items].sort((a, b) => {
    const byPriority = (b.priority ?? 50) - (a.priority ?? 50);
    if (byPriority !== 0) return byPriority;
    return toMillis(a.scheduledAt) - toMillis(b.scheduledAt);
  });
}

/**
 * Position + ETA for `targetApplicationId` among the given active
 * (queued/processing) items. Returns null when the target has no active item —
 * the row is not in the queue, so there is nothing to estimate.
 */
export function estimateQueueEta(
  items: ActiveQueueItem[],
  targetApplicationId: string,
  now: Date = new Date()
): QueueEtaEstimate | null {
  const targetId = String(targetApplicationId);
  const target = items.find((i) => String(i.applicationId) === targetId);
  if (!target) return null;

  if (target.status === 'processing') {
    const elapsedSec = Math.max(0, (now.getTime() - toMillis(target.scheduledAt)) / 1000);
    // It already holds the worker; only its own remaining run is left.
    return {
      position: 1,
      etaSeconds: clampEta(ESTIMATED_SECONDS_PER_APPLICATION - elapsedSec),
    };
  }

  const running = items.filter((i) => i.status === 'processing').length;
  const queued = sortActive(items.filter((i) => i.status === 'queued'));
  const index = queued.findIndex((i) => String(i.applicationId) === targetId);
  if (index === -1) return null;

  const position = running + index + 1;
  // Slots ahead: the running item (assume ~half of its run left) plus each
  // queued item before this one, then this item's own run.
  const etaSeconds =
    running * (ESTIMATED_SECONDS_PER_APPLICATION / 2) +
    index * ESTIMATED_SECONDS_PER_APPLICATION +
    ESTIMATED_SECONDS_PER_APPLICATION;

  return { position, etaSeconds: clampEta(etaSeconds) };
}

/** Human label for chip/toast: "under a minute" / "~2 min" / "~18 min". */
export function formatQueueEta(etaSeconds: number): string {
  if (etaSeconds < 60) return 'under a minute';
  const minutes = Math.round(etaSeconds / 60);
  return `~${minutes} min`;
}
