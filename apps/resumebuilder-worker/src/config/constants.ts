export const SYSTEM_CONSTANTS = {
  SERVICE_VERSION: '1.0.0',
  DEFAULT_PARSER_VERSION: '1.0.0',
  DEFAULT_NORMALIZER_VERSION: '1.0.0',
  DEFAULT_MATCHING_VERSION: 'matching-v1',

  COLLECTIONS: {
    JOBS: 'jobs',
    JOB_SOURCES: 'jobSources',
    INGESTION_RUNS: 'ingestionRuns',
    JOB_EVENTS: 'jobEvents',
    JOB_MATCHES: 'jobMatches',
    JOB_LOCKS: 'job_ingestion_locks',
    APPLICATIONS: 'applications',
    APPLICATION_EVENTS: 'applicationEvents',
    APPLICATION_QUEUE: 'applicationQueue',
    APPLICATION_RUNS: 'applicationRuns',
    ADMIN_AUDIT_LOGS: 'adminAuditLogs',
  },

  STATUS: {
    ACTIVE: 'active',
    UPDATED: 'updated',
    STALE: 'stale',
    EXPIRED: 'expired',
    REMOVED: 'removed',
    BLOCKED: 'blocked',
  } as const,

  SOURCE_TYPES: {
    ATS: 'ats',
    API: 'api',
    SCRAPER: 'scraper',
  } as const,

  HEALTH_STATUS: {
    HEALTHY: 'healthy',
    DEGRADED: 'degraded',
    FAILING: 'failing',
    CIRCUIT_OPEN: 'circuit_open',
  } as const,

  RUN_STATUS: {
    RUNNING: 'running',
    COMPLETED: 'completed',
    FAILED: 'failed',
    CANCELLED: 'cancelled',
  } as const,

  EVENT_TYPES: {
    JOB_CREATED: 'created',
    JOB_UPDATED: 'updated',
    JOB_EXPIRED: 'expired',
    JOB_REAPPEARED: 'reappeared',
    SOURCE_ADDED: 'source_added',
    SOURCE_REMOVED: 'source_removed',
  } as const,

  DEFAULT_SCHEDULES: {
    FAST_API_MINUTES: 15,
    ATS_MINUTES: 30,
    MEDIUM_API_MINUTES: 60,
    HEAVY_SCRAPER_MINUTES: 180,
    STALE_RECONCILIATION_HOURS: 6,
    FULL_CLEANUP_HOURS: 24,
  },

  LIMITS: {
    MAX_BATCH_SIZE: 1000,
    MIN_BATCH_SIZE: 100,
    DEFAULT_CONCURRENCY: 5,
    MAX_CONCURRENCY: 20,
    CIRCUIT_BREAKER_FAILURES: 5,
    CIRCUIT_BREAKER_COOLDOWN_MS: 300000, // 5 minutes
    SIMILARITY_DUPLICATE_THRESHOLD: 0.88,
  },
} as const;
