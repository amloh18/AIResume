import { describe, expect, it } from 'vitest';
import type { INotification } from '@/models/Notification';
import {
  INITIAL_FETCH_TOAST_WINDOW_MS,
  TOAST_DEBOUNCE_MS,
  TOAST_REPEAT_SUPPRESSION_MS,
  isInAppToastEligible,
  isRecentNotification,
  resolveToastGateState,
} from '../notificationToast';

const createNotification = (overrides: Partial<INotification> = {}): INotification =>
  ({
    _id: 'notif-id',
    read: false,
    channels: ['in-app'],
    title: 'Test',
    message: 'Body',
    type: 'job_status_check',
    interactive: false,
    priority: 'medium',
    persistent: false,
    deliveryStatus: {},
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as unknown as INotification);

describe('notificationToast utils', () => {
  describe('isInAppToastEligible', () => {
    it('returns false when user is not authenticated', () => {
      expect(isInAppToastEligible(createNotification(), false)).toBe(false);
    });

    it('returns false for read notifications', () => {
      expect(isInAppToastEligible(createNotification({ read: true }), true)).toBe(false);
    });

    it('returns false when notification lacks in-app channel', () => {
      expect(
        isInAppToastEligible(createNotification({ channels: ['email'] as any }), true)
      ).toBe(false);
    });

    it('returns true for unread in-app notifications', () => {
      expect(isInAppToastEligible(createNotification(), true)).toBe(true);
    });
  });

  describe('resolveToastGateState', () => {
    it('suppresses duplicates within repeat window', () => {
      const now = Date.now();
      const state = resolveToastGateState({
        now,
        lastToastAt: now - TOAST_DEBOUNCE_MS,
        lastShownAt: now - TOAST_REPEAT_SUPPRESSION_MS + 1000,
      });
      expect(state).toBe('repeat-suppressed');
    });

    it('debounces rapid successive toasts', () => {
      const now = Date.now();
      const state = resolveToastGateState({
        now,
        lastToastAt: now - TOAST_DEBOUNCE_MS + 50,
        lastShownAt: undefined,
      });
      expect(state).toBe('debounce');
    });

    it('allows toast when outside guardrails', () => {
      const now = Date.now();
      const state = resolveToastGateState({
        now,
        lastToastAt: now - TOAST_DEBOUNCE_MS - 10,
        lastShownAt: now - TOAST_REPEAT_SUPPRESSION_MS - 10,
      });
      expect(state).toBe('allowed');
    });
  });

  describe('isRecentNotification', () => {
    it('treats missing createdAt as recent', () => {
      expect(isRecentNotification(undefined)).toBe(true);
    });

    it('treats invalid dates as recent to avoid crashes', () => {
      expect(isRecentNotification('not-a-date')).toBe(true);
    });

    it('respects freshness window', () => {
      const now = Date.now();
      const windowMs = INITIAL_FETCH_TOAST_WINDOW_MS;
      expect(isRecentNotification(new Date(now - windowMs + 1000), now, windowMs)).toBe(true);
      expect(isRecentNotification(new Date(now - windowMs - 1000), now, windowMs)).toBe(false);
    });
  });
});


