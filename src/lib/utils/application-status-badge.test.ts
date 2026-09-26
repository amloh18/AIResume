import { describe, it, expect } from 'vitest';
import { deriveApplicationStatusBadge } from './application-status-badge';

describe('deriveApplicationStatusBadge', () => {
  it('keeps terminal statuses on their existing groups', () => {
    expect(deriveApplicationStatusBadge({ status: 'applied' })).toMatchObject({ label: 'Applied', tone: 'blue' });
    expect(deriveApplicationStatusBadge({ status: 'interview' })).toMatchObject({ label: 'Interview' });
    expect(deriveApplicationStatusBadge({ status: 'offer' })).toMatchObject({ label: 'Offer' });
    expect(deriveApplicationStatusBadge({ status: 'rejected' })).toMatchObject({ label: 'Rejected' });
    expect(deriveApplicationStatusBadge({ status: 'draft' })).toMatchObject({ label: 'Draft' });
    expect(deriveApplicationStatusBadge({ status: 'saved' })).toMatchObject({ label: 'Draft' });
  });

  it('shows Submitting only for a live in-flight run', () => {
    for (const internal of ['queued', 'processing', 'form_detected']) {
      expect(
        deriveApplicationStatusBadge({ status: 'created', internalStatus: internal })
      ).toMatchObject({ label: 'Submitting', tone: 'amber' });
    }
  });

  it('maps approval holds to "Awaiting approval" and keeps the reason as hover text', () => {
    const badge = deriveApplicationStatusBadge({
      status: 'created',
      internalStatus: 'review_required',
      reviewReason: 'Documents prepared for Airbnb. Awaiting your approval before submission.',
    });
    expect(badge.label).toBe('Awaiting approval');
    expect(badge.tone).toBe('violet');
    expect(badge.title).toContain('Awaiting your approval');
  });

  it('maps manual-ish halts to "Apply manually"', () => {
    const cases = [
      'Execution mode is "manual": automation is not permitted for this application. Submit it yourself, or re-queue it with mode "auto" to approve automated submission.',
      'ATS type "naukri" is not automatable. Manual submission required.',
      'CAPTCHA detected during submission on Greenhouse. Manual completion required.',
      'No application form detected at https://jobs.ashbyhq.com/notion/x. The job may be closed.',
      'Automated submission unavailable (some error). Please submit manually.',
    ];
    for (const reason of cases) {
      expect(
        deriveApplicationStatusBadge({ status: 'staging', internalStatus: 'review_required', reviewReason: reason }).label
      ).toBe('Apply manually');
    }
  });

  it('routes every other review_required halt to "Needs your action"', () => {
    const badge = deriveApplicationStatusBadge({
      status: 'created',
      internalStatus: 'review_required',
      reviewReason: 'No proof of submission found; routed to review by the watchdog.',
    });
    expect(badge.label).toBe('Needs your action');
    expect(badge.tone).toBe('rose');
  });

  it('flags legacy rows without internalStatus instead of pretending they submit', () => {
    const badge = deriveApplicationStatusBadge({ status: 'created' });
    expect(badge.label).toBe('Needs your action');
    expect(badge.title).toMatch(/before state tracking/i);
    // Empty string behaves like missing.
    expect(
      deriveApplicationStatusBadge({ status: 'created', internalStatus: '' }).label
    ).toBe('Needs your action');
  });

  it('shows Failed for automation_failed', () => {
    expect(
      deriveApplicationStatusBadge({ status: 'created', internalStatus: 'automation_failed' })
    ).toMatchObject({ label: 'Failed', tone: 'rose' });
  });

  it('falls back to Draft for unknown statuses', () => {
    expect(deriveApplicationStatusBadge({ status: 'something_new' })).toMatchObject({ label: 'Draft' });
    expect(deriveApplicationStatusBadge({})).toMatchObject({ label: 'Draft' });
  });
});
