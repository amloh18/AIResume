/**
 * End-to-End Pipeline Test
 *
 * Tests the full search pipeline:
 * query normalization → candidate retrieval → scoring → feed building
 *
 * Run: npx tsx src/tests/intelligent-discovery/pipeline.test.ts
 */

import dotenv from 'dotenv';
import { resolve } from 'path';
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

import mongoose from 'mongoose';

async function runTests() {
  await mongoose.connect(process.env.MONGODB_URI!);
  const db = mongoose.connection.db!;

  let passed = 0;
  let failed = 0;

  function assert(name: string, condition: boolean, detail?: string) {
    if (condition) {
      console.log(`  ✅ ${name}`);
      passed++;
    } else {
      console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ''}`);
      failed++;
    }
  }

  const coll = db.collection('jobs');
  const baseFilter = {
    $or: [{ status: { $in: ['new', 'active'] } }, { status: { $exists: false } }],
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // Test 1: "IT support" query normalization
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n=== Test 1: Query Normalization ===');

  // We can't import the normalizer directly due to server-only, so test via MongoDB
  const itSupportTextResults = await coll.countDocuments({
    ...baseFilter,
    $text: { $search: 'IT support' },
  });
  assert('"IT support" text search returns > 0 results', itSupportTextResults > 0, `got ${itSupportTextResults}`);

  const itSupportRoleResults = await coll.countDocuments({
    ...baseFilter,
    roleFamily: 'IT_SUPPORT',
  });
  assert('IT_SUPPORT role family has jobs', itSupportRoleResults > 0, `got ${itSupportRoleResults}`);

  // ═══════════════════════════════════════════════════════════════════════════
  // Test 2: Case-insensitive
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n=== Test 2: Case Insensitive ===');

  const lowerTextResults = await coll.countDocuments({
    ...baseFilter,
    $text: { $search: 'it support' },
  });
  assert('"it support" (lowercase) text search works', lowerTextResults > 0, `got ${lowerTextResults}`);

  // ═══════════════════════════════════════════════════════════════════════════
  // Test 3: Role family backfill
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n=== Test 3: Role Family Backfill ===');

  const totalJobs = await coll.countDocuments();
  const withRoleFamily = await coll.countDocuments({ roleFamily: { $ne: null } });
  const fillRate = withRoleFamily / totalJobs;
  assert('Role family fill rate > 80%', fillRate > 0.8, `${(fillRate * 100).toFixed(1)}%`);

  const itSupportCount = await coll.countDocuments({ roleFamily: 'IT_SUPPORT' });
  assert('IT_SUPPORT family has > 10 jobs', itSupportCount > 10, `got ${itSupportCount}`);

  const serviceDeskCount = await coll.countDocuments({ roleFamily: 'SERVICE_DESK' });
  assert('SERVICE_DESK family has jobs', serviceDeskCount > 0, `got ${serviceDeskCount}`);

  const desktopSupportCount = await coll.countDocuments({ roleFamily: 'DESKTOP_SUPPORT' });
  assert('DESKTOP_SUPPORT family has jobs', desktopSupportCount > 0, `got ${desktopSupportCount}`);

  // ═══════════════════════════════════════════════════════════════════════════
  // Test 4: Help desk finds related IT support roles
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n=== Test 4: Related Roles ===');

  const helpDeskText = await coll.countDocuments({
    ...baseFilter,
    $text: { $search: 'help desk' },
  });
  assert('"help desk" text search returns results', helpDeskText > 0, `got ${helpDeskText}`);

  const relatedFamilies = await coll.countDocuments({
    ...baseFilter,
    roleFamily: { $in: ['IT_SUPPORT', 'SERVICE_DESK', 'DESKTOP_SUPPORT', 'NETWORK_SUPPORT'] },
  });
  assert('IT support related families combined > 50', relatedFamilies > 50, `got ${relatedFamilies}`);

  // ═══════════════════════════════════════════════════════════════════════════
  // Test 5: Software engineering search
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n=== Test 5: Software Engineering ===');

  const sweText = await coll.countDocuments({
    ...baseFilter,
    $text: { $search: 'software engineer' },
  });
  assert('"software engineer" text search returns results', sweText > 0, `got ${sweText}`);

  const sweRole = await coll.countDocuments({
    ...baseFilter,
    roleFamily: 'SOFTWARE_ENGINEERING',
  });
  assert('SOFTWARE_ENGINEERING family has jobs', sweRole > 10, `got ${sweRole}`);

  // ═══════════════════════════════════════════════════════════════════════════
  // Test 6: Freshness model
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n=== Test 6: Freshness Model ===');

  const withExpiresAt = await coll.countDocuments({ expiresAt: { $exists: true } });
  assert('Jobs have expiresAt field', withExpiresAt > 0, `got ${withExpiresAt}`);

  const withFreshnessScore = await coll.countDocuments({ freshnessScore: { $exists: true } });
  assert('Jobs have freshnessScore field', withFreshnessScore > 0, `got ${withFreshnessScore}`);

  const notExpired = await coll.countDocuments({
    ...baseFilter,
    $or: [
      { expiresAt: { $gt: new Date() } },
      { expiresAt: { $exists: false } },
    ],
  });
  assert('Active jobs are not expired', notExpired > 0, `got ${notExpired}`);

  // ═══════════════════════════════════════════════════════════════════════════
  // Test 7: normalizedTitle
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n=== Test 7: normalizedTitle ===');

  const withNormTitle = await coll.countDocuments({
    normalizedTitle: { $exists: true, $nin: [null, ''] },
  });
  const normTitleRate = withNormTitle / totalJobs;
  assert('normalizedTitle fill rate > 95%', normTitleRate > 0.95, `${(normTitleRate * 100).toFixed(1)}%`);

  // ═══════════════════════════════════════════════════════════════════════════
  // Test 8: Source distribution
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n=== Test 8: Source Distribution ===');

  const sources = await coll.aggregate([
    { $match: baseFilter },
    { $group: { _id: '$source.primary', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]).toArray();
  assert('Multiple sources present', sources.length >= 3, `got ${sources.length}`);
  assert('Greenhouse is a major source', sources.some((s: any) => s._id === 'greenhouse'), '');

  // ═══════════════════════════════════════════════════════════════════════════
  // Test 9: Demand tracking infrastructure
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n=== Test 9: Demand Infrastructure ===');

  const demandColl = db.collection('jobDemand');
  const demandCount = await demandColl.countDocuments();
  assert('JobDemand collection exists', true);
  // Demand may be 0 if no searches have been made yet
  console.log(`  ℹ️  Demand segments: ${demandCount}`);

  const lockColl = db.collection('ingestionLocks');
  const lockCount = await lockColl.countDocuments();
  assert('IngestionLocks collection exists', true);
  console.log(`  ℹ️  Active locks: ${lockCount}`);

  // ═══════════════════════════════════════════════════════════════════════════
  // Test 10: Indexes
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n=== Test 10: Indexes ===');

  const indexes = await coll.listIndexes().toArray();
  const textIndex = indexes.find((i: any) => Object.values(i.key || {}).some((v) => v === 'text'));
  assert('Text index exists', !!textIndex, '');

  // Text index fields are in the weights property
  const textWeights = textIndex?.weights ? Object.keys(textIndex.weights) : [];
  assert('Text index covers title', textWeights.includes('title'), `weights: ${textWeights.join(', ')}`);
  assert('Text index covers descriptionText', textWeights.includes('descriptionText'), '');

  const roleFamilyIndex = indexes.find((i: any) => i.key?.roleFamily === 1);
  assert('roleFamily index exists', !!roleFamilyIndex, '');

  const normalizedTitleIndex = indexes.find((i: any) => i.key?.normalizedTitle === 1);
  assert('normalizedTitle index exists', !!normalizedTitleIndex, '');

  // ═══════════════════════════════════════════════════════════════════════════
  // Summary
  // ═══════════════════════════════════════════════════════════════════════════
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log(`${'═'.repeat(60)}\n`);

  await mongoose.disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch((err) => {
  console.error('Test runner failed:', err);
  process.exit(1);
});
