/**
 * Migration: Add lifecycle fields + contentHash to existing jobs
 *
 * Adds to every job in the `jobs` collection:
 *   - firstSeenAt  (defaults to createdAt)
 *   - lastSeenAt   (defaults to now)
 *   - lastVerifiedAt (defaults to now)
 *   - contentHash  (SHA-256 of title+desc+location+salary+type)
 *   - seniority    (extracted from title if missing)
 *   - status       (set to 'active' if missing)
 *
 * Usage:
 *   npx ts-node scripts/migrate-jobs-schema.ts          # dry-run (default)
 *   npx ts-node scripts/migrate-jobs-schema.ts --apply   # apply changes
 *
 * Safe to re-run: idempotent — skips jobs that already have the fields.
 */

import dotenv from 'dotenv';
import { resolve } from 'path';
import mongoose from 'mongoose';
import crypto from 'crypto';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

// ── Helpers ─────────────────────────────────────────────────────────────

function generateContentHash(job: {
  title?: string;
  description?: string;
  location?: string;
  salary?: string;
  employmentType?: string;
}): string {
  const payload = [
    (job.title || '').toLowerCase().trim(),
    (job.description || '').replace(/<[^>]*>/g, '').substring(0, 5000),
    (job.location || '').toLowerCase().trim(),
    job.salary || '',
    job.employmentType || '',
  ].join('::');
  return crypto.createHash('sha256').update(payload).digest('hex');
}

function extractSeniority(title: string): string | undefined {
  const lower = title.toLowerCase();
  if (/\b(chief|vp|vice president|c-level|cxo)\b/.test(lower)) return 'executive';
  if (/\b(director)\b/.test(lower)) return 'director';
  if (/\b(head of|lead|principal)\b/.test(lower)) return 'lead';
  if (/\b(senior|sr\.?|staff)\b/.test(lower)) return 'senior';
  if (/\b(mid|intermediate)\b/.test(lower)) return 'mid';
  if (/\b(junior|jr\.?|entry|associate|intern)\b/.test(lower)) return 'junior';
  if (/\b(lead)\b/.test(lower)) return 'lead';
  return undefined;
}

// ── Main ────────────────────────────────────────────────────────────────

async function migrateJobsSchema() {
  const dryRun = !process.argv.includes('--apply');

  console.log(dryRun ? '🔍 DRY RUN — no changes will be written\n' : '🚀 APPLY MODE — changes will be written\n');

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('❌ MONGODB_URI not set');
    process.exit(1);
  }

  await mongoose.connect(mongoUri);
  console.log('✅ Connected to database\n');

  const coll = mongoose.connection.db!.collection('jobs');

  // Count jobs that need migration (missing firstSeenAt or contentHash)
  const needsMigration = await coll.countDocuments({
    $or: [
      { firstSeenAt: { $exists: false } },
      { contentHash: { $exists: false } },
    ],
  });

  console.log(`📊 Total jobs in DB:       ${await coll.countDocuments()}`);
  console.log(`📋 Needs migration:        ${needsMigration}\n`);

  if (needsMigration === 0) {
    console.log('✅ All jobs already migrated. Nothing to do.');
    await mongoose.connection.close();
    return;
  }

  const BATCH_SIZE = 500;
  let processed = 0;
  let updated = 0;
  let skipped = 0;

  const cursor = coll
    .find({
      $or: [
        { firstSeenAt: { $exists: false } },
        { contentHash: { $exists: false } },
      ],
    })
    .batchSize(BATCH_SIZE);

  const now = new Date();
  const ops: any[] = [];

  for await (const doc of cursor) {
    processed++;

    // Skip if already has all fields
    if (doc.firstSeenAt && doc.contentHash) {
      skipped++;
      continue;
    }

    const title = doc.title || '';
    const description = doc.description || '';
    const location = typeof doc.location === 'string'
      ? doc.location
      : doc.location?.city
        ? `${doc.location.city}, ${doc.location.country || ''}`
        : '';
    const salary = doc.salary || '';
    const employmentType = doc.employmentType || 'full_time';

    const contentHash = generateContentHash({ title, description, location, salary, employmentType });
    const seniority = extractSeniority(title);
    const createdAt = doc.createdAt ? new Date(doc.createdAt) : now;

    const setFields: Record<string, any> = {
      updatedAt: now,
    };

    // Only set if missing
    if (!doc.firstSeenAt) setFields.firstSeenAt = createdAt;
    if (!doc.lastSeenAt) setFields.lastSeenAt = now;
    if (!doc.lastVerifiedAt) setFields.lastVerifiedAt = now;
    if (!doc.contentHash) setFields.contentHash = contentHash;
    if (!doc.seniority && seniority) setFields.seniority = seniority;
    if (!doc.status) setFields.status = 'active';

    // Ensure source.lastSeenAt exists (only if source is an object, not a string)
    if (doc.source && typeof doc.source === 'object' && !doc.source.lastSeenAt) {
      setFields['source.lastSeenAt'] = doc.source.discoveredAt || now;
    }

    ops.push({
      updateOne: {
        filter: { _id: doc._id },
        update: { $set: setFields },
      },
    });

    if (ops.length >= BATCH_SIZE) {
      if (!dryRun) {
        await (coll as any).bulkWrite(ops, { ordered: false });
      }
      updated += ops.length;
      console.log(`  [${dryRun ? 'DRY' : 'APPLY'}] Processed ${processed}/${needsMigration}, updated ${updated}`);
      ops.length = 0;
    }
  }

  // Final batch
  if (ops.length > 0) {
    if (!dryRun) {
      await (coll as any).bulkWrite(ops, { ordered: false });
    }
    updated += ops.length;
  }

  console.log(`\n✅ Migration ${dryRun ? 'dry-run' : 'complete'}:`);
  console.log(`   Processed: ${processed}`);
  console.log(`   Updated:   ${updated}`);
  console.log(`   Skipped:   ${skipped}`);

  if (dryRun) {
    console.log(`\n💡 Run with --apply to write changes`);
  }

  await mongoose.connection.close();
}

migrateJobsSchema().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
