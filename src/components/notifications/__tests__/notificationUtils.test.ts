import { describe, expect, it, vi } from 'vitest';
import { getRelativeTimeLabel } from '../utils';

const fixedNow = new Date('2024-01-01T12:00:00.000Z');

describe('notification utils', () => {
  it('returns "Just now" when date is empty or invalid', () => {
    expect(getRelativeTimeLabel()).toBe('Just now');
    expect(getRelativeTimeLabel('invalid-date')).toBe('Just now');
  });

  it('returns "Moments ago" for timestamps under a minute', () => {
    vi.useFakeTimers();
    vi.setSystemTime(fixedNow);
    const fiftySecondsAgo = new Date(fixedNow.getTime() - 50 * 1000);
    expect(getRelativeTimeLabel(fiftySecondsAgo)).toBe('Moments ago');
    vi.useRealTimers();
  });

  it('returns distance label for older timestamps', () => {
    vi.useFakeTimers();
    vi.setSystemTime(fixedNow);
    const oneHourAgo = new Date(fixedNow.getTime() - 60 * 60 * 1000);
    expect(getRelativeTimeLabel(oneHourAgo)).toBe('about 1 hour ago');
    vi.useRealTimers();
  });
});


