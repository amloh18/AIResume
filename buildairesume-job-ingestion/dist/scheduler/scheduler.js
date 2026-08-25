"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ingestionScheduler = exports.IngestionScheduler = void 0;
const sources_1 = require("../sources");
const IngestionManager_1 = require("../ingestion/IngestionManager");
const logger_1 = require("../utils/logger");
class IngestionScheduler {
    isRunning = false;
    intervals = [];
    start(db) {
        if (this.isRunning) {
            logger_1.logger.warn('Scheduler already running.');
            return;
        }
        logger_1.logger.info('⏰ Initializing IngestionScheduler interval schedules...');
        // 1. Schedule each source independently
        for (const source of sources_1.ALL_JOB_SOURCES) {
            const schedule = source.getDefaultSchedule();
            const intervalMs = Math.max(1, schedule.frequencyMinutes) * 60 * 1000;
            const timer = setInterval(() => {
                logger_1.logger.info(`⏰ Triggered schedule for source [${source.name}] (every ${schedule.frequencyMinutes}m)`);
                IngestionManager_1.ingestionManager.runSource(db, source.name).catch((err) => {
                    logger_1.logger.error(`Scheduled run failed for [${source.name}]:`, err);
                });
            }, intervalMs);
            this.intervals.push(timer);
            logger_1.logger.info(`  • Scheduled [${source.displayName}] => every ${schedule.frequencyMinutes} minutes`);
        }
        // 2. Schedule Stale Job Reconciliation (every 6 hours)
        const reconciliationIntervalMs = 6 * 60 * 60 * 1000;
        const reconTimer = setInterval(() => {
            IngestionManager_1.ingestionManager.reconcileStaleJobs(db).catch((err) => {
                logger_1.logger.error('Scheduled reconciliation failed:', err);
            });
        }, reconciliationIntervalMs);
        this.intervals.push(reconTimer);
        this.isRunning = true;
        logger_1.logger.info(`✅ Scheduler initialized with ${this.intervals.length} active triggers.`);
    }
    stop() {
        logger_1.logger.info('⏹ Stopping IngestionScheduler...');
        for (const timer of this.intervals) {
            clearInterval(timer);
        }
        this.intervals = [];
        this.isRunning = false;
        logger_1.logger.info('✅ IngestionScheduler stopped.');
    }
    isSchedulerRunning() {
        return this.isRunning;
    }
}
exports.IngestionScheduler = IngestionScheduler;
exports.ingestionScheduler = new IngestionScheduler();
//# sourceMappingURL=scheduler.js.map