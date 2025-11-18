import { INotification } from '@/models/Notification';

export const TOAST_DEBOUNCE_MS = 400;
export const TOAST_REPEAT_SUPPRESSION_MS = 60 * 1000; // 1 minute
export const INITIAL_FETCH_TOAST_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

export type ToastGateState = 'allowed' | 'debounce' | 'repeat-suppressed';

export function isInAppToastEligible(notification: INotification, isAuthenticated: boolean): boolean {
  if (!isAuthenticated || !notification || notification.read) {
    return false;
  }

  const channels = Array.isArray(notification.channels) ? notification.channels : [];
  return channels.includes('in-app');
}

export function isRecentNotification(
  createdAt?: string | Date | null,
  now = Date.now(),
  windowMs = INITIAL_FETCH_TOAST_WINDOW_MS
): boolean {
  if (!createdAt) {
    return true;
  }

  const timestamp = new Date(createdAt).getTime();
  if (Number.isNaN(timestamp)) {
    return true;
  }

  return now - timestamp <= windowMs;
}

export function resolveToastGateState({
  now,
  lastToastAt,
  lastShownAt,
  debounceMs = TOAST_DEBOUNCE_MS,
  repeatSuppressionMs = TOAST_REPEAT_SUPPRESSION_MS,
}: {
  now: number;
  lastToastAt: number;
  lastShownAt?: number;
  debounceMs?: number;
  repeatSuppressionMs?: number;
}): ToastGateState {
  if (typeof lastShownAt === 'number' && now - lastShownAt < repeatSuppressionMs) {
    return 'repeat-suppressed';
  }

  if (now - lastToastAt < debounceMs) {
    return 'debounce';
  }

  return 'allowed';
}


