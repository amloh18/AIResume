"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.batchProcessor = exports.BatchProcessor = void 0;
const constants_1 = require("../config/constants");
const logger_1 = require("../utils/logger");
class BatchProcessor {
    /**
     * Process and upsert a batch of normalized jobs into MongoDB with provenance merging
     */
    async processBatch(db, jobs, sourceName) {
        if (!jobs || jobs.length === 0) {
            return { inserted: 0, updated: 0, duplicates: 0, errors: 0 };
        }
        const jobsColl = db.collection(constants_1.SYSTEM_CONSTANTS.COLLECTIONS.JOBS);
        const eventsColl = db.collection(constants_1.SYSTEM_CONSTANTS.COLLECTIONS.JOB_EVENTS);
        const now = new Date();
        const bulkOps = [];
        for (const job of jobs) {
            // Upsert based on canonicalId or exact source primary key
            bulkOps.push({
                updateOne: {
                    filter: {
                        $or: [
                            { canonicalId: job.canonicalId },
                            { 'source.primary': job.source.primary, 'source.sourceJobId': job.source.sourceJobId },
                        ],
                    },
                    update: {
                        $setOnInsert: {
                            canonicalId: job.canonicalId,
                            title: job.title,
                            normalizedTitle: job.normalizedTitle,
                            company: job.company,
                            description: job.description,
                            descriptionText: job.descriptionText,
                            location: job.location,
                            employmentType: job.employmentType,
                            experience: job.experience,
                            salary: job.salary,
                            skills: job.skills,
                            requirements: job.requirements,
                            benefits: job.benefits,
                            visaSponsorship: job.visaSponsorship,
                            postedAt: job.postedAt,
                            status: constants_1.SYSTEM_CONSTANTS.STATUS.ACTIVE,
                            matching: job.matching,
                            search: job.search,
                            metadata: job.metadata,
                            createdAt: now,
                            'ingestion.firstSeenAt': now,
                        },
                        $set: {
                            'source.lastSeenAt': now,
                            'ingestion.lastSeenAt': now,
                            updatedAt: now,
                        },
                        $inc: {
                            'ingestion.updateCount': 1,
                        },
                        $addToSet: {
                            sources: {
                                name: job.source.primary,
                                sourceJobId: job.source.sourceJobId,
                                url: job.source.sourceUrl,
                                firstSeenAt: now,
                                lastSeenAt: now,
                            },
                        },
                    },
                    upsert: true,
                },
            });
        }
        try {
            const res = await jobsColl.bulkWrite(bulkOps, { ordered: false });
            const inserted = res.upsertedCount || 0;
            const updated = res.modifiedCount || res.matchedCount || 0;
            const duplicates = jobs.length - inserted;
            // Asynchronously record created events for newly inserted items
            if (inserted > 0 && res.upsertedIds) {
                const eventOps = Object.entries(res.upsertedIds).map(([index, id]) => {
                    const job = jobs[parseInt(index, 10)];
                    return {
                        insertOne: {
                            document: {
                                jobId: id,
                                canonicalId: job?.canonicalId || '',
                                eventType: constants_1.SYSTEM_CONSTANTS.EVENT_TYPES.JOB_CREATED,
                                source: sourceName,
                                metadata: {
                                    company: job?.company?.name,
                                    title: job?.title,
                                },
                                createdAt: now,
                            },
                        },
                    };
                });
                if (eventOps.length > 0) {
                    await eventsColl.bulkWrite(eventOps, { ordered: false }).catch((err) => {
                        logger_1.logger.warn('Error recording job events:', undefined, err);
                    });
                }
            }
            return {
                inserted,
                updated,
                duplicates,
                errors: 0,
            };
        }
        catch (err) {
            logger_1.logger.error('BulkWrite execution error in BatchProcessor:', err);
            return {
                inserted: 0,
                updated: 0,
                duplicates: 0,
                errors: jobs.length,
            };
        }
    }
}
exports.BatchProcessor = BatchProcessor;
exports.batchProcessor = new BatchProcessor();
//# sourceMappingURL=BatchProcessor.js.map