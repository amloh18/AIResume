/**
 * Backfill Role Families for Existing Jobs
 *
 * One-time script to add roleFamily and roleFamilyKeywords to all existing
 * jobs in the jobs collection based on their title.
 *
 * Usage:
 *   npx ts-node scripts/backfill-role-families.ts          # dry-run (default)
 *   npx ts-node scripts/backfill-role-families.ts --apply   # apply
 *   npx ts-node scripts/backfill-role-families.ts --batch-size 500  # custom batch size
 */

import dotenv from 'dotenv';
import { resolve } from 'path';
import mongoose from 'mongoose';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

import { resolveRoleFamily, getFamilySearchTerms } from '../src/lib/taxonomy/roleTaxonomy';

async function backfillRoleFamilies() {
  const dryRun = !process.argv.includes('--apply');
  const batchSizeArg = process.argv.find((a) => a.startsWith('--batch-size'));
  const batchSize = batchSizeArg ? parseInt(process.argv[process.argv.indexOf(batchSizeArg) + 1]) || 500 : 500;

  console.log(dryRun ? '🔍 DRY RUN\n' : '🚀 APPLY MODE\n');
  console.log(`📦 Batch size: ${batchSize}\n`);

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('❌ MONGODB_URI not set');
    process.exit(1);
  }

  await mongoose.connect(mongoUri);
  console.log('✅ Connected\n');

  const db = mongoose.connection.db!;
  const coll = db.collection('jobs');

  // Count total jobs
  const totalCount = await coll.countDocuments();
  console.log(`📊 Total jobs: ${totalCount}\n`);

  // Count jobs without roleFamily
  const missingCount = await coll.countDocuments({
    $or: [
      { roleFamily: { $exists: false } },
      { roleFamily: null },
      { roleFamily: '' },
    ],
  });
  console.log(`📊 Jobs missing roleFamily: ${missingCount}\n`);

  if (missingCount === 0) {
    console.log('✅ All jobs already have roleFamily. Nothing to do.');
    await mongoose.connection.close();
    return;
  }

  let processed = 0;
  let updated = 0;
  let unresolved = 0;
  const unresolvedSamples: Array<{ _id: any; title: string }> = [];

  // Process in batches using cursor
  const cursor = coll
    .find({
      $or: [
        { roleFamily: { $exists: false } },
        { roleFamily: null },
        { roleFamily: '' },
      ],
    })
    .batchSize(batchSize);

  const batch: any[] = [];

  for await (const doc of cursor) {
    processed++;
    const title = doc.title || doc.normalizedTitle || '';
    const roleFamily = resolveRoleFamily(title);
    const roleFamilyKeywords = roleFamily ? getFamilySearchTerms(roleFamily) : undefined;

    if (roleFamily) {
      batch.push({
        updateOne: {
          filter: { _id: doc._id },
          update: {
            $set: {
              roleFamily,
              roleFamilyKeywords,
            },
          },
        },
      });
      updated++;
    } else {
      unresolved++;
      if (unresolvedSamples.length < 20) {
        unresolvedSamples.push({ _id: doc._id, title });
      }
    }

    // Execute batch
    if (batch.length >= batchSize) {
      if (!dryRun) {
        await coll.bulkWrite(batch, { ordered: false });
      }
      console.log(`  ${dryRun ? '🔍' : '✅'} Processed ${processed}/${missingCount} (updated: ${updated}, unresolved: ${unresolved})`);
      batch.length = 0;
    }
  }

  // Execute remaining batch
  if (batch.length > 0) {
    if (!dryRun) {
      await coll.bulkWrite(batch, { ordered: false });
    }
    console.log(`  ${dryRun ? '🔍' : '✅'} Processed ${processed}/${missingCount} (updated: ${updated}, unresolved: ${unresolved})`);
  }

  console.log(`\n📊 Summary:`);
  console.log(`  Total processed: ${processed}`);
  console.log(`  Updated with roleFamily: ${updated}`);
  console.log(`  Unresolved (no matching family): ${unresolved}`);

  if (unresolvedSamples.length > 0) {
    console.log(`\n⚠️  Sample unresolved titles:`);
    for (const sample of unresolvedSamples) {
      console.log(`  - "${sample.title}"`);
    }
  }

  console.log(dryRun ? '\n💡 Run with --apply to backfill' : '\n✅ Done');
  await mongoose.connection.close();
}

backfillRoleFamilies().catch((err) => {
  console.error('❌ Failed:', err);
  process.exit(1);
});
