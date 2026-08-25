export declare const SYSTEM_CONSTANTS: {
    readonly SERVICE_VERSION: "1.0.0";
    readonly DEFAULT_PARSER_VERSION: "1.0.0";
    readonly DEFAULT_NORMALIZER_VERSION: "1.0.0";
    readonly DEFAULT_MATCHING_VERSION: "matching-v1";
    readonly COLLECTIONS: {
        readonly JOBS: "jobs";
        readonly JOB_SOURCES: "jobSources";
        readonly INGESTION_RUNS: "ingestionRuns";
        readonly JOB_EVENTS: "jobEvents";
        readonly JOB_MATCHES: "jobMatches";
        readonly JOB_LOCKS: "job_ingestion_locks";
        readonly APPLICATIONS: "applications";
        readonly APPLICATION_EVENTS: "applicationEvents";
        readonly APPLICATION_QUEUE: "applicationQueue";
        readonly APPLICATION_RUNS: "applicationRuns";
        readonly ADMIN_AUDIT_LOGS: "adminAuditLogs";
    };
    readonly STATUS: {
        readonly ACTIVE: "active";
        readonly UPDATED: "updated";
        readonly STALE: "stale";
        readonly EXPIRED: "expired";
        readonly REMOVED: "removed";
        readonly BLOCKED: "blocked";
    };
    readonly SOURCE_TYPES: {
        readonly ATS: "ats";
        readonly API: "api";
        readonly SCRAPER: "scraper";
    };
    readonly HEALTH_STATUS: {
        readonly HEALTHY: "healthy";
        readonly DEGRADED: "degraded";
        readonly FAILING: "failing";
        readonly CIRCUIT_OPEN: "circuit_open";
    };
    readonly RUN_STATUS: {
        readonly RUNNING: "running";
        readonly COMPLETED: "completed";
        readonly FAILED: "failed";
        readonly CANCELLED: "cancelled";
    };
    readonly EVENT_TYPES: {
        readonly JOB_CREATED: "created";
        readonly JOB_UPDATED: "updated";
        readonly JOB_EXPIRED: "expired";
        readonly JOB_REAPPEARED: "reappeared";
        readonly SOURCE_ADDED: "source_added";
        readonly SOURCE_REMOVED: "source_removed";
    };
    readonly DEFAULT_SCHEDULES: {
        readonly FAST_API_MINUTES: 15;
        readonly ATS_MINUTES: 30;
        readonly MEDIUM_API_MINUTES: 60;
        readonly HEAVY_SCRAPER_MINUTES: 180;
        readonly STALE_RECONCILIATION_HOURS: 6;
        readonly FULL_CLEANUP_HOURS: 24;
    };
    readonly LIMITS: {
        readonly MAX_BATCH_SIZE: 1000;
        readonly MIN_BATCH_SIZE: 100;
        readonly DEFAULT_CONCURRENCY: 5;
        readonly MAX_CONCURRENCY: 20;
        readonly CIRCUIT_BREAKER_FAILURES: 5;
        readonly CIRCUIT_BREAKER_COOLDOWN_MS: 300000;
        readonly SIMILARITY_DUPLICATE_THRESHOLD: 0.88;
    };
};
