/**
 * reset-countdown.ts — Human-readable "time until quota reset" formatting.
 *
 * Shared by the enforcement service (denial messages), the Jobs Hub Auto-Apply
 * pill, the Settings usage meter, and the limit modals so every surface words
 * the reset window the same way.
 *
 * Pure functions — safe on both server and client.
 */

/**
 * Format the remaining time until `resetAt` as a compact countdown,
 * e.g. "43m", "5h 12m", "2d 4h".
 *
 * Returns null when the date is missing, invalid, or already in the past —
 * callers should fall back to displaying the raw date in that case.
 */
export function formatResetCountdown(
  resetAt: Date | string | number | null | undefined
): string | null {
  if (resetAt === null || resetAt === undefined) return null;

  const target = resetAt instanceof Date ? resetAt : new Date(resetAt);
  if (Number.isNaN(target.getTime())) return null;

  const ms = target.getTime() - Date.now();
  if (ms <= 0) return null;

  const totalMinutes = Math.floor(ms / 60_000);
  if (totalMinutes < 1) return 'less than a minute';
  if (totalMinutes < 60) return `${totalMinutes}m`;

  const hours = Math.floor(totalMinutes / 60);
  const remMinutes = totalMinutes % 60;
  if (hours < 24) return remMinutes > 0 ? `${hours}h ${remMinutes}m` : `${hours}h`;

  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  return remHours > 0 ? `${days}d ${remHours}h` : `${days}d`;
}

/**
 * Full label for UI surfaces, e.g. "Resets in 5h 12m".
 * Returns null when no valid future reset time exists.
 */
export function formatResetLabel(
  resetAt: Date | string | number | null | undefined,
  prefix = 'Resets'
): string | null {
  const countdown = formatResetCountdown(resetAt);
  if (!countdown) return null;
  return `${prefix} in ${countdown}`;
}

/**
 * Compact clause for server-side denial messages, e.g. "resets in 5h 12m".
 * Always returns a usable string (falls back to the absolute date).
 */
export function describeReset(resetAt: Date): string {
  const countdown = formatResetCountdown(resetAt);
  if (countdown) return `resets in ${countdown}`;
  return `resets ${resetAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
}
