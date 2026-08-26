import { Db } from 'mongodb';
import { SYSTEM_CONSTANTS } from './constants';
import { logger } from '../utils/logger';

export async function ensureAllIndexes(db: Db): Promise<void> {
  logger.info('⚙️ Ensuring MongoDB indexes across all job ingestion collections...');

  // 1. jobs collection indexes
  const jobs = db.collection(SYSTEM_CONSTANTS.COLLECTIONS.JOBS);
  await jobs.createIndex({ canonicalId: 1 }, { unique: true, name: 'uniq_canonicalId' });
  await jobs.createIndex(
    { 'source.primary': 1, 'source.sourceJobId': 1 },
    { unique: true, name: 'uniq_source_jobId' }
  );
  await jobs.createIndex({ status: 1, postedAt: -1 }, { name: 'idx_status_postedAt' });
  await jobs.createIndex({ status: 1, 'ingestion.lastSeenAt': -1 }, { name: 'idx_status_lastSeenAt' });
  await jobs.createIndex({ 'company.normalizedName': 1 }, { name: 'idx_company_normalized' });
  await jobs.createIndex({ normalizedTitle: 1 }, { name: 'idx_normalizedTitle' });
  await jobs.createIndex({ 'location.countryCode': 1, 'location.city': 1 }, { name: 'idx_location_geo' });
  await jobs.createIndex({ 'location.remote': 1 }, { name: 'idx_location_remote' });
  await jobs.createIndex({ employmentType: 1 }, { name: 'idx_employmentType' });
  await jobs.createIndex({ 'experience.level': 1 }, { name: 'idx_exp_level' });
  await jobs.createIndex({ skills: 1 }, { name: 'idx_skills' });
  await jobs.createIndex({ 'salary.min': 1, 'salary.max': 1 }, { name: 'idx_salary_range' });
  await jobs.createIndex({ createdAt: -1 }, { name: 'idx_createdAt' });
  await jobs.createIndex({ updatedAt: -1 }, { name: 'idx_updatedAt' });

  // Full-Text search index
  try {
    await jobs.createIndex(
      {
        title: 'text',
        'company.name': 'text',
        descriptionText: 'text',
        skills: 'text',
        'location.city': 'text',
      },
      {
        weights: {
          title: 10,
          'company.name': 5,
          skills: 5,
          'location.city': 3,
          descriptionText: 1,
        },
        name: 'idx_jobs_text_search',
      }
    );
  } catch (err: any) {
    // If text index already exists with different options, log warning
    logger.warn('Text index on jobs creation note:', undefined, err);
  }

  // 2. jobSources collection indexes
  const jobSources = db.collection(SYSTEM_CONSTANTS.COLLECTIONS.JOB_SOURCES);
  await jobSources.createIndex({ name: 1 }, { unique: true, name: 'uniq_source_name' });
  await jobSources.createIndex({ enabled: 1, priority: -1 }, { name: 'idx_sources_enabled_prio' });

  // 3. ingestionRuns collection indexes
  const ingestionRuns = db.collection(SYSTEM_CONSTANTS.COLLECTIONS.INGESTION_RUNS);
  await ingestionRuns.createIndex({ runId: 1 }, { unique: true, name: 'uniq_runId' });
  await ingestionRuns.createIndex({ source: 1, startedAt: -1 }, { name: 'idx_runs_source_started' });
  await ingestionRuns.createIndex({ status: 1 }, { name: 'idx_runs_status' });

  // 4. jobEvents collection indexes
  const jobEvents = db.collection(SYSTEM_CONSTANTS.COLLECTIONS.JOB_EVENTS);
  await jobEvents.createIndex({ jobId: 1, createdAt: -1 }, { name: 'idx_events_job_created' });
  await jobEvents.createIndex({ canonicalId: 1, eventType: 1 }, { name: 'idx_events_canonical_type' });
  await jobEvents.createIndex({ eventType: 1, createdAt: -1 }, { name: 'idx_events_type_created' });

  // 5. jobMatches collection indexes
  const jobMatches = db.collection(SYSTEM_CONSTANTS.COLLECTIONS.JOB_MATCHES);
  await jobMatches.createIndex({ userId: 1, jobId: 1 }, { unique: true, name: 'uniq_user_job_match' });
  await jobMatches.createIndex({ userId: 1, score: -1, status: 1 }, { name: 'idx_user_score_status' });

  // 6. job_ingestion_locks distributed mutex indexes with TTL
  const jobLocks = db.collection(SYSTEM_CONSTANTS.COLLECTIONS.JOB_LOCKS);
  await jobLocks.createIndex({ source: 1 }, { unique: true, name: 'uniq_lock_source' });
  await jobLocks.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0, name: 'ttl_lock_expires' });

  logger.info('✅ All MongoDB indexes verified successfully');
}
