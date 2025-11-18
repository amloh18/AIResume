import { formatDistanceToNow } from 'date-fns';

const MOMENT_WINDOW_MS = 60 * 1000;

export function getRelativeTimeLabel(dateValue?: string | Date | null): string {
  if (!dateValue) {
    return 'Just now';
  }

  try {
    const parsedDate = new Date(dateValue);
    const timestamp = parsedDate.getTime();

    if (Number.isNaN(timestamp)) {
      console.warn('Invalid date value for notification timestamp:', dateValue);
      return 'Just now';
    }

    const diffMs = Math.abs(Date.now() - timestamp);
    if (diffMs < MOMENT_WINDOW_MS) {
      return 'Moments ago';
    }

    const relative = formatDistanceToNow(parsedDate, { addSuffix: true });
    return relative || 'Just now';
  } catch (error) {
    console.error('Error formatting notification timestamp:', error);
    return 'Just now';
  }
}

