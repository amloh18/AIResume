"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ingestionManager = exports.IngestionManager = void 0;
const sources_1 = require("../sources");
const SourceRunner_1 = require("./SourceRunner");
const constants_1 = require("../config/constants");
const env_1 = require("../config/env");
const logger_1 = require("../utils/logger");
class IngestionManager {
    /**
     * Run a specific source by its name
     */
    async runSource(db, sourceName) {
        const source = (0, sources_1.getSourceByName)(sourceName);
        if (!source) {
            logger_1.logger.error(`Cannot run unknown source: ${sourceName}`);
            return false;
        }
        await SourceRunner_1.sourceRunner.runSource(db, source);
        return true;
    }
    /**
     * Run all registered sources in parallel with controlled concurrency
     */
    async runAll(db) {
        logger_1.logger.info('🎬 IngestionManager: Triggering all registered job sources...');
        for (const source of sources_1.ALL_JOB_SOURCES) {
            // Run asynchronously so fast sources don't block slow ones
            SourceRunner_1.sourceRunner.runSource(db, source).catch((err) => {
                logger_1.logger.error(`Error in background runner for [${source.name}]:`, err);
            });
        }
    }
    /**
     * Reconcile stale and expired jobs
     */
    async reconcileStaleJobs(db) {
        logger_1.logger.info('🧹 Running stale and expired job reconciliation...');
        const jobsColl = db.collection(constants_1.SYSTEM_CONSTANTS.COLLECTIONS.JOBS);
        const now = new Date();
        const staleDays = env_1.env.STALE_THRESHOLD_DAYS;
        const expirationDays = env_1.env.EXPIRATION_THRESHOLD_DAYS;
        const staleThresholdDate = new Date(now.getTime() - staleDays * 24 * 60 * 60 * 1000);
        const expirationThresholdDate = new Date(now.getTime() - expirationDays * 24 * 60 * 60 * 1000);
        // 1. Mark stale: active jobs not seen for > STALE_THRESHOLD_DAYS
        const staleRes = await jobsColl.updateMany({
            status: constants_1.SYSTEM_CONSTANTS.STATUS.ACTIVE,
            'ingestion.lastSeenAt': { $lt: staleThresholdDate },
        }, {
            $set: {
                status: constants_1.SYSTEM_CONSTANTS.STATUS.STALE,
                updatedAt: now,
            },
        });
        // 2. Mark expired: stale jobs not seen for > EXPIRATION_THRESHOLD_DAYS
        const expiredRes = await jobsColl.updateMany({
            status: { $in: [constants_1.SYSTEM_CONSTANTS.STATUS.ACTIVE, constants_1.SYSTEM_CONSTANTS.STATUS.STALE] },
            'ingestion.lastSeenAt': { $lt: expirationThresholdDate },
        }, {
            $set: {
                status: constants_1.SYSTEM_CONSTANTS.STATUS.EXPIRED,
                expiresAt: now,
                updatedAt: now,
            },
        });
        const markedStale = staleRes.modifiedCount || 0;
        const markedExpired = expiredRes.modifiedCount || 0;
        logger_1.logger.info(`🧹 Reconciliation complete: ${markedStale} marked stale, ${markedExpired} marked expired.`);
        return { markedStale, markedExpired };
    }
}
exports.IngestionManager = IngestionManager;
exports.ingestionManager = new IngestionManager();
//# sourceMappingURL=IngestionManager.js.map