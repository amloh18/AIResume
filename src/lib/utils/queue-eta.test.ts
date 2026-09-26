import { describe, it, expect } from 'vitest';
import {
  estimateQueueEta,
  formatQueueEta,
  ESTIMATED_SECONDS_PER_APPLICATION,
  MIN_QUEUE_ETA_SECONDS,
  MAX_QUEUE_ETA_SECONDS,
} from './queue-eta';

const NOW = new Date('2026-09-26T10:00:00Z');

function item(over: Partial<Parameters<typeof estimateQueueEta>[0][number]> = {}) {
  return {
    applicationId: 'app-1',
    status: 'queued' as const,
    priority: 60,
    scheduledAt: NOW,
    ...over,
  };
}

describe('estimateQueueEta', () => {
  it('returns null when the target has no active queue item', () => {
    expect(estimateQueueEta([item({ applicationId: 'other' })], 'app-1', NOW)).toBeNull();
    expect(estimateQueueEta([], 'app-1', NOW)).toBeNull();
  });

  it('gives a single ready item one slot and one run of ETA', () => {
    const eta = estimateQueueEta([item()], 'app-1', NOW);
    expect(eta).toEqual({ position: 1, etaSeconds: ESTIMATED_SECONDS_PER_APPLICATION });
  });

  it('ranks queued items the way the worker claims them (priority desc, then scheduledAt asc)', () => {
    const early = item({ applicationId: 'early', priority: 60, scheduledAt: NOW });
    const late = item({ applicationId: 'late', priority: 60, scheduledAt: new Date(NOW.getTime() + 60_000) });
    const urgent = item({ applicationId: 'urgent', priority: 90, scheduledAt: new Date(NOW.getTime() + 120_000) });

    // priority wins over scheduledAt — same order claimNextApplication uses.
    expect(estimateQueueEta([early, late, urgent], 'urgent', NOW)?.position).toBe(1);
    expect(estimateQueueEta([early, late, urgent], 'early', NOW)?.position).toBe(2);
    expect(estimateQueueEta([early, late, urgent], 'late', NOW)?.position).toBe(3);
  });

  it('counts a running item as a slot ahead of queued work', () => {
    const running = item({ applicationId: 'running', status: 'processing' });
    const target = item({ applicationId: 'app-1' });
    const eta = estimateQueueEta([running, target], 'app-1', NOW);
    expect(eta?.position).toBe(2);
    // half of the running run + the target's own run (rounded by the clamp)
    expect(eta?.etaSeconds).toBe(Math.round(ESTIMATED_SECONDS_PER_APPLICATION * 1.5));
  });

  it('estimates the remaining run for the item currently processing', () => {
    const running = item({
      applicationId: 'app-1',
      status: 'processing',
      scheduledAt: new Date(NOW.getTime() - 30_000), // started 30s ago
    });
    const eta = estimateQueueEta([running], 'app-1', NOW);
    expect(eta?.position).toBe(1);
    expect(eta?.etaSeconds).toBe(ESTIMATED_SECONDS_PER_APPLICATION - 30);
  });

  it('clamps to the documented bounds', () => {
    const long = Array.from({ length: 60 }, (_, i) => item({ applicationId: `app-${i}` }));
    const last = estimateQueueEta(long, 'app-59', NOW);
    expect(last!.etaSeconds).toBe(MAX_QUEUE_ETA_SECONDS);

    const almostDone = item({
      applicationId: 'app-1',
      status: 'processing',
      scheduledAt: new Date(NOW.getTime() - 10 * 60_000), // elapsed 10 min
    });
    expect(estimateQueueEta([almostDone], 'app-1', NOW)!.etaSeconds).toBe(MIN_QUEUE_ETA_SECONDS);
  });

  it('treats a missing scheduledAt as immediately claimable', () => {
    const noSchedule = item({ applicationId: 'app-1', scheduledAt: undefined });
    expect(estimateQueueEta([noSchedule], 'app-1', NOW)).toEqual({
      position: 1,
      etaSeconds: ESTIMATED_SECONDS_PER_APPLICATION,
    });
  });
});

describe('formatQueueEta', () => {
  it('formats minutes and sub-minute waits', () => {
    expect(formatQueueEta(45)).toBe('under a minute');
    expect(formatQueueEta(60)).toBe('~1 min');
    expect(formatQueueEta(150)).toBe('~3 min');
    expect(formatQueueEta(1200)).toBe('~20 min');
  });
});
