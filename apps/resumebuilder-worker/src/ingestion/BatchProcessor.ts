import { Db, AnyBulkWriteOperation } from 'mongodb';
import { NormalizedJob } from '../models/Job';
import { SYSTEM_CONSTANTS } from '../config/constants';
import { logger } from '../utils/logger';

export interface BatchProcessingResult {
  inserted: number;
  updated: number;
  duplicates: number;
  errors: number;
}

export class BatchProcessor {
  /**
   * Process and upsert a batch of normalized jobs into MongoDB with provenance merging
   */
  async processBatch(db: Db, jobs: NormalizedJob[], sourceName: string): Promise<BatchProcessingResult> {
    if (!jobs || jobs.length === 0) {
      return { inserted: 0, updated: 0, duplicates: 0, errors: 0 };
    }

    const jobsColl = db.collection(SYSTEM_CONSTANTS.COLLECTIONS.JOBS);
    const eventsColl = db.collection(SYSTEM_CONSTANTS.COLLECTIONS.JOB_EVENTS);

    const now = new Date();
    const bulkOps: AnyBulkWriteOperation<any>[] = [];

    for (const job of jobs) {
      // Upsert by canonicalId only.
      // The previous $or filter (canonicalId || sourceJobId) caused E11000
      // collisions in bulkWrite with ordered:false when parallel operations
      // couldn't see each other's inserts, and when Greenhouse sourceJobIds
      // were per-company numeric IDs (not globally unique).
      bulkOps.push({
        updateOne: {
          filter: { canonicalId: job.canonicalId },
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
              status: SYSTEM_CONSTANTS.STATUS.ACTIVE,
              matching: job.matching,
              search: job.search,
              metadata: job.metadata,
              createdAt: now,
              'ingestion.firstSeenAt': now,
            },
            $set: {
              'source.primary': job.source.primary,
              'source.sourceJobId': job.source.sourceJobId,
              'source.sourceUrl': job.source.sourceUrl,
              'source.applicationUrl': job.source.applicationUrl,
              'source.discoveredAt': job.source.discoveredAt,
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
      let res: any;
      try {
        res = await jobsColl.bulkWrite(bulkOps, { ordered: false });
      } catch (bulkErr: any) {
        // E11000 from ordered:false bulkWrite means some ops succeeded and some hit
        // duplicate key conflicts (e.g. concurrent upserts racing on the same canonicalId).
        // Retry the failed ops individually — they'll match existing docs on the second attempt.
        if (bulkErr.code === 11000 && bulkErr.writeErrors?.length) {
          logger.warn(`BulkWrite E11000: ${bulkErr.writeErrors.length} ops failed, retrying individually`);
          const failedIndices = new Set(bulkErr.writeErrors.map((e: any) => e.index));
          const retryOps = bulkOps.filter((_: any, i: number) => failedIndices.has(i));
          if (retryOps.length > 0) {
            res = await jobsColl.bulkWrite(retryOps, { ordered: false });
          } else {
            res = { upsertedCount: 0, modifiedCount: 0, upsertedIds: {} };
          }
        } else {
          throw bulkErr;
        }
      }

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
                eventType: SYSTEM_CONSTANTS.EVENT_TYPES.JOB_CREATED,
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
            logger.warn('Error recording job events:', undefined, err);
          });
        }
      }

      return {
        inserted,
        updated,
        duplicates,
        errors: 0,
      };
    } catch (err: any) {
      logger.error('BulkWrite execution error in BatchProcessor:', err);
      return {
        inserted: 0,
        updated: 0,
        duplicates: 0,
        errors: jobs.length,
      };
    }
  }
}

export const batchProcessor = new BatchProcessor();
