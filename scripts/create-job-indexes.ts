/**
 * Create database indexes for ingestion engine and job discovery.
 *
 * Run once after migration. Idempotent — existing indexes are skipped.
 *
 * Usage:
 *   npx ts-node scripts/create-job-indexes.ts          # dry-run (default)
 *   npx ts-node scripts/create-job-indexes.ts --apply   # apply
 */

import dotenv from 'dotenv';
import { resolve } from 'path';
import mongoose from 'mongoose';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

async function createIndexes() {
  const dryRun = !process.argv.includes('--apply');
  console.log(dryRun ? '🔍 DRY RUN\n' : '🚀 APPLY MODE\n');

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('❌ MONGODB_URI not set');
    process.exit(1);
  }

  await mongoose.connect(mongoUri);
  console.log('✅ Connected\n');

  const db = mongoose.connection.db!;

  // ── Jobs collection ────────────────────────────────────────────────
  const jobsColl = db.collection('jobs');

  const jobsIndexes = [
    // Dedup: canonicalId unique
    { key: { canonicalId: 1 }, name: 'jobs_canonicalId_unique', unique: true },
    // Dedup: source.primary + source.sourceJobId unique
    { key: { 'source.primary': 1, 'source.sourceJobId': 1 }, name: 'jobs_source_dedup_unique', unique: true },
    // Discovery: status + postedAt (most common user query)
    { key: { status: 1, postedAt: -1 }, name: 'jobs_status_postedAt' },
    // Discovery: location queries
    { key: { 'location.countryCode': 1, postedAt: -1 }, name: 'jobs_country_postedAt' },
    { key: { 'location.remote': 1, postedAt: -1 }, name: 'jobs_remote_postedAt' },
    // Company queries
    { key: { 'company.normalizedName': 1, postedAt: -1 }, name: 'jobs_company_postedAt' },
    // Category/department facets
    { key: { department: 1, postedAt: -1 }, name: 'jobs_department_postedAt' },
    { key: { category: 1, postedAt: -1 }, name: 'jobs_category_postedAt' },
    { key: { seniority: 1, postedAt: -1 }, name: 'jobs_seniority_postedAt' },
    { key: { employmentType: 1, postedAt: -1 }, name: 'jobs_employmentType_postedAt' },
    // Content hash check (for batchUpsert pre-check)
    { key: { canonicalId: 1, contentHash: 1 }, name: 'jobs_canonicalId_contentHash' },
    // Lifecycle: lastSeenAt for archival queries
    { key: { lastSeenAt: -1 }, name: 'jobs_lastSeenAt' },
    // Source analytics
    { key: { 'source.primary': 1, status: 1 }, name: 'jobs_source_status' },
    // Search: text index on title + descriptionText
    { key: { title: 'text', descriptionText: 'text', 'company.name': 'text' }, name: 'jobs_text_search' },
    // Role family queries (BuildAIResume - Sprint 1)
    { key: { roleFamily: 1, status: 1, postedAt: -1 }, name: 'jobs_roleFamily_status_postedAt' },
    // Normalized title search
    { key: { normalizedTitle: 1, status: 1 }, name: 'jobs_normalizedTitle_status' },
    // Compound: role family + location for candidate retrieval
    { key: { roleFamily: 1, 'location.countryCode': 1, 'location.remote': 1, postedAt: -1 }, name: 'jobs_roleFamily_country_remote_postedAt' },
  ];

  // ── Ingestion runs collection ──────────────────────────────────────
  const runsColl = db.collection('ingestionRuns');

  const runsIndexes = [
    { key: { runId: 1 }, name: 'runs_runId_unique', unique: true },
    { key: { source: 1, startedAt: -1 }, name: 'runs_source_startedAt' },
    { key: { status: 1, lastProgressAt: -1 }, name: 'runs_status_lastProgressAt' },
    { key: { startedAt: -1 }, name: 'runs_startedAt_desc' },
  ];

  // ── Job sources collection ─────────────────────────────────────────
  const sourcesColl = db.collection('jobSources');

  const sourcesIndexes = [
    { key: { name: 1 }, name: 'sources_name_unique', unique: true },
    { key: { enabled: 1, priority: -1 }, name: 'sources_enabled_priority' },
  ];

  // ── Job events collection ──────────────────────────────────────────
  const eventsColl = db.collection('jobEvents');

  const eventsIndexes = [
    { key: { jobId: 1, createdAt: -1 }, name: 'events_jobId_createdAt' },
    { key: { canonicalId: 1 }, name: 'events_canonicalId' },
    { key: { eventType: 1, createdAt: -1 }, name: 'events_type_createdAt' },
  ];

  // ── Job demand collection (BuildAIResume) ─────────────────────────
  const demandColl = db.collection('jobDemand');

  const demandIndexes = [
    { key: { roleFamily: 1, country: 1, remote: 1 }, name: 'demand_roleFamily_country_remote_unique', unique: true },
    { key: { priority: -1, nextEligibleFetchAt: 1, status: 1 }, name: 'demand_priority_fetchAt_status' },
    { key: { status: 1, priority: -1 }, name: 'demand_status_priority' },
    { key: { lastRequestedAt: -1 }, name: 'demand_lastRequestedAt' },
    { key: { lastFetchedAt: -1 }, name: 'demand_lastFetchedAt' },
    { key: { roleFamily: 1 }, name: 'demand_roleFamily' },
  ];

  // ── Ingestion locks collection (BuildAIResume) ────────────────────
  const locksColl = db.collection('ingestionLocks');

  const locksIndexes = [
    { key: { segmentKey: 1 }, name: 'locks_segmentKey_unique', unique: true },
    { key: { expiresAt: 1 }, name: 'locks_expiresAt_ttl', expireAfterSeconds: 0 },
  ];

  // ── Apply indexes ──────────────────────────────────────────────────

  async function applyIndexes(collName: string, coll: mongoose.Collection, indexes: any[]) {
    console.log(`\n📋 ${collName}:`);
    for (const idx of indexes) {
      const exists = await coll.indexExists(idx.name).catch(() => false);
      if (exists) {
        console.log(`  ✓ ${idx.name} (exists)`);
        continue;
      }
      if (dryRun) {
        console.log(`  → ${idx.name} (would create)`);
      } else {
        try {
          await coll.createIndex(idx.key, {
            name: idx.name,
            unique: idx.unique || false,
            background: true,
          } as any);
          console.log(`  ✅ ${idx.name} created`);
        } catch (err: any) {
          console.log(`  ⚠️  ${idx.name}: ${err.message}`);
        }
      }
    }
  }

  await applyIndexes('jobs', jobsColl as any, jobsIndexes);
  await applyIndexes('ingestionRuns', runsColl as any, runsIndexes);
  await applyIndexes('jobSources', sourcesColl as any, sourcesIndexes);
  await applyIndexes('jobEvents', eventsColl as any, eventsIndexes);
  await applyIndexes('jobDemand', demandColl as any, demandIndexes);
  await applyIndexes('ingestionLocks', locksColl as any, locksIndexes);

  console.log(dryRun ? '\n💡 Run with --apply to create indexes' : '\n✅ Done');
  await mongoose.connection.close();
}

createIndexes().catch((err) => {
  console.error('❌ Failed:', err);
  process.exit(1);
});
