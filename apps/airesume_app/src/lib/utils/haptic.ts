/**
 * Haptic feedback utility for mobile/web.
 * Uses the Vibration API where available.
 */

type HapticStyle = 'light' | 'medium' | 'heavy' | 'selection' | 'success' | 'error';

const patterns: Record<HapticStyle, number | number[]> = {
  light: 10,
  medium: 20,
  heavy: 40,
  selection: 5,
  success: [10, 50, 20],
  error: [30, 50, 30, 50, 30],
};

export function haptic(style: HapticStyle = 'light'): void {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(patterns[style]);
    } catch {
      // Silently fail - vibration not supported or blocked
    }
  }
}
