/**
 * Migration Telemetry for JobSearchProfile rollout
 * 
 * Tracks legacy fallback reads to measure migration health.
 * Logs structured events that can be queried from logs or
 * exported to metrics systems (e.g., PostHog, Datadog).
 */

import { logger } from '@/lib/structured-logger';

export type LegacySource = 'job_preferences' | 'user_auto_apply_preferences' | 'user_quota_auto_apply_settings';

export interface FallbackReadEvent {
  service: string;
  userId: string;
  legacySource: LegacySource;
  reason: 'profile_not_found' | 'profile_error' | 'flag_disabled';
  error?: string;
}

// In-memory counters for quick health checks (resets on restart)
const counters = {
  totalReads: 0,
  newStoreReads: 0,
  legacyFallbackReads: 0,
  byService: {} as Record<string, { total: number; new: number; legacy: number }>,
  byReason: {} as Record<string, number>,
  byLegacySource: {} as Record<string, number>,
};

/**
 * Record a successful read from the new JobSearchProfile store.
 */
export function trackNewStoreRead(service: string, userId: string): void {
  counters.totalReads++;
  counters.newStoreReads++;
  initServiceCounter(service);
  counters.byService[service].total++;
  counters.byService[service].new++;
}

/**
 * Record a fallback read from a legacy store.
 * Logs a structured warning for observability.
 */
export function trackLegacyFallbackRead(event: FallbackReadEvent): void {
  counters.totalReads++;
  counters.legacyFallbackReads++;
  initServiceCounter(event.service);
  counters.byService[event.service].total++;
  counters.byService[event.service].legacy++;
  counters.byReason[event.reason] = (counters.byReason[event.reason] || 0) + 1;
  counters.byLegacySource[event.legacySource] = (counters.byLegacySource[event.legacySource] || 0) + 1;

  logger.warn('[MigrationTelemetry] Legacy fallback read', {
    service: event.service,
    userId: event.userId,
    legacySource: event.legacySource,
    reason: event.reason,
    error: event.error,
    counters: getMigrationTelemetrySnapshot(),
  });
}

/**
 * Get current telemetry snapshot.
 * Useful for health check endpoints or debug logging.
 */
export function getMigrationTelemetrySnapshot() {
  const fallbackRate = counters.totalReads > 0
    ? (counters.legacyFallbackReads / counters.totalReads * 100).toFixed(1) + '%'
    : '0%';

  return {
    ...counters,
    fallbackRate,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Log a periodic summary of migration telemetry.
 * Call from a cron job or health check endpoint.
 */
export function logMigrationSummary(): void {
  const snapshot = getMigrationTelemetrySnapshot();
  
  logger.info('[MigrationTelemetry] Migration health summary', {
    totalReads: snapshot.totalReads,
    newStoreReads: snapshot.newStoreReads,
    legacyFallbackReads: snapshot.legacyFallbackReads,
    fallbackRate: snapshot.fallbackRate,
    byService: snapshot.byService,
    byReason: snapshot.byReason,
    byLegacySource: snapshot.byLegacySource,
  });
}

function initServiceCounter(service: string): void {
  if (!counters.byService[service]) {
    counters.byService[service] = { total: 0, new: 0, legacy: 0 };
  }
}
