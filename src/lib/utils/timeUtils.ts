/**
 * Utility functions for time formatting
 */

/**
 * Formats a date to show relative time (e.g., "2h ago", "5 days ago")
 * For dates older than 30 days, shows the actual date
 * 
 * @param dateString - The date string to format
 * @param options - Optional formatting options
 * @returns Formatted time string
 */
export const formatRelativeTime = (
  dateString: string | Date | null | undefined,
  options: {
    showSeconds?: boolean;
    showMinutes?: boolean;
    showHours?: boolean;
    showDays?: boolean;
    showWeeks?: boolean;
    showMonths?: boolean;
    maxRelativeDays?: number;
  } = {}
): string => {
  if (!dateString) return 'Unknown';

  const {
    showSeconds = true,
    showMinutes = true,
    showHours = true,
    showDays = true,
    showWeeks = true,
    showMonths = true,
    maxRelativeDays = 30
  } = options;

  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return 'Unknown';
    }

    const now = new Date();
    const diffInMs = Math.abs(now.getTime() - date.getTime());
    const diffInSeconds = Math.floor(diffInMs / 1000);
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    const diffInWeeks = Math.floor(diffInDays / 7);
    const diffInMonths = Math.floor(diffInDays / 30);

    // If older than maxRelativeDays, show actual date
    if (diffInDays > maxRelativeDays) {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    }

    // Show relative time for recent dates
    if (diffInSeconds < 60 && showSeconds) {
      return diffInSeconds <= 1 ? 'Just now' : `${diffInSeconds}s ago`;
    }

    if (diffInMinutes < 60 && showMinutes) {
      return diffInMinutes <= 1 ? '1m ago' : `${diffInMinutes}m ago`;
    }

    if (diffInHours < 24 && showHours) {
      return diffInHours <= 1 ? '1h ago' : `${diffInHours}h ago`;
    }

    if (diffInDays < 7 && showDays) {
      return diffInDays <= 1 ? '1 day ago' : `${diffInDays} days ago`;
    }

    if (diffInWeeks < 4 && showWeeks) {
      return diffInWeeks <= 1 ? '1 week ago' : `${diffInWeeks} weeks ago`;
    }

    if (diffInMonths < 12 && showMonths) {
      return diffInMonths <= 1 ? '1 month ago' : `${diffInMonths} months ago`;
    }

    // Fallback to actual date
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });

  } catch (error) {
    console.error('Error formatting relative time:', error);
    return 'Unknown';
  }
};

/**
 * Formats a date for display in collapsed cards (shorter format)
 * Shows relative time for recent dates, actual date for older dates
 */
export const formatCardTime = (dateString: string | Date | null | undefined): string => {
  return formatRelativeTime(dateString, {
    showSeconds: false,
    showMinutes: true,
    showHours: true,
    showDays: true,
    showWeeks: true,
    showMonths: true,
    maxRelativeDays: 30
  });
};

/**
 * Formats a date for display in expanded cards (more detailed format)
 * Shows more granular time information
 */
export const formatDetailedTime = (dateString: string | Date | null | undefined): string => {
  return formatRelativeTime(dateString, {
    showSeconds: true,
    showMinutes: true,
    showHours: true,
    showDays: true,
    showWeeks: true,
    showMonths: true,
    maxRelativeDays: 30
  });
};
