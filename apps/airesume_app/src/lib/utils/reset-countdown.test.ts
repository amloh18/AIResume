/**
 * Tests for the shared reset-countdown formatter.
 *
 * These guard the "remaining time until rate limit refresh" UX: every limit
 * surface (Jobs Hub pill, Settings meter, limit modals, denial toasts) renders
 * its reset window through this module, so a formatting regression shows up as
 * wrong countdown text in many places at once.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  formatResetCountdown,
  formatResetLabel,
  describeReset,
} from './reset-countdown';

afterEach(() => {
  vi.useRealTimers();
});

describe('formatResetCountdown', () => {
  it('returns null for missing/invalid dates', () => {
    expect(formatResetCountdown(null)).toBeNull();
    expect(formatResetCountdown(undefined)).toBeNull();
    expect(formatResetCountdown('not-a-date')).toBeNull();
  });

  it('returns null when the reset time is already past', () => {
    expect(formatResetCountdown(new Date(Date.now() - 1000))).toBeNull();
  });

  it('formats sub-minute windows as "less than a minute"', () => {
    vi.setSystemTime(new Date('2026-09-25T10:00:00Z'));
    expect(formatResetCountdown(new Date('2026-09-25T10:00:30Z'))).toBe('less than a minute');
  });

  it('formats minutes', () => {
    vi.setSystemTime(new Date('2026-09-25T10:00:00Z'));
    expect(formatResetCountdown(new Date('2026-09-25T10:43:00Z'))).toBe('43m');
  });

  it('formats hours with leftover minutes', () => {
    vi.setSystemTime(new Date('2026-09-25T10:00:00Z'));
    expect(formatResetCountdown(new Date('2026-09-25T15:12:00Z'))).toBe('5h 12m');
  });

  it('formats whole hours without minutes', () => {
    vi.setSystemTime(new Date('2026-09-25T10:00:00Z'));
    expect(formatResetCountdown(new Date('2026-09-25T15:00:00Z'))).toBe('5h');
  });

  it('formats days with leftover hours', () => {
    vi.setSystemTime(new Date('2026-09-25T10:00:00Z'));
    expect(formatResetCountdown(new Date('2026-09-27T14:00:00Z'))).toBe('2d 4h');
  });

  it('accepts ISO strings and epoch numbers', () => {
    vi.setSystemTime(new Date('2026-09-25T10:00:00Z'));
    expect(formatResetCountdown('2026-09-25T12:00:00Z')).toBe('2h');
    expect(formatResetCountdown(new Date('2026-09-25T12:00:00Z').getTime())).toBe('2h');
  });
});

describe('formatResetLabel', () => {
  it('prefixes the countdown', () => {
    vi.setSystemTime(new Date('2026-09-25T10:00:00Z'));
    expect(formatResetLabel(new Date('2026-09-25T12:00:00Z'))).toBe('Resets in 2h');
    expect(formatResetLabel(new Date('2026-09-25T12:00:00Z'), 'Refreshes')).toBe('Refreshes in 2h');
  });

  it('returns null when there is no valid future reset time', () => {
    expect(formatResetLabel(null)).toBeNull();
    expect(formatResetLabel(new Date('2020-01-01T00:00:00Z'))).toBeNull();
  });
});

describe('describeReset', () => {
  it('always returns a usable clause even in the past', () => {
    vi.setSystemTime(new Date('2026-09-25T10:00:00Z'));
    const past = new Date('2026-09-25T09:00:00Z');
    const clause = describeReset(past);
    expect(clause).toMatch(/^resets /);
    expect(clause).toContain('Sep 25');
  });

  it('uses the countdown for future resets', () => {
    vi.setSystemTime(new Date('2026-09-25T10:00:00Z'));
    expect(describeReset(new Date('2026-09-25T12:00:00Z'))).toBe('resets in 2h');
  });
});
