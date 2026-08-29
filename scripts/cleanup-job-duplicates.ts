/**
 * Cleanup existing duplicate JobApplication documents.
 * 
 * Usage:
 *   npx tsx scripts/cleanup-job-duplicates.ts [--dry-run]
 * 
 * Finds jobs with the same normalized (userId + title + company) and keeps
 * the one with the most data (latest updatedAt, or longest jobDescription).
 * Deletes the rest.
 */

import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGODB_URL;
const DRY_RUN = process.argv.includes('--dry-run');

function normalizeTitle(title: string): string {
  return title.toLowerCase().trim().replace(/\s+/g, ' ');
}

function normalizeCompany(company: string): string {
  return company
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/,?\s*(inc\.?|llc\.?|ltd\.?|corp\.?|corporation|co\.?|company|plc|gmbh|s\.?a\.?|s\.?p\.?a\.?)\s*$/i, '');
}

async function main() {
  if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI not set. Run with: MONGODB_URI=... npx tsx scripts/cleanup-job-duplicates.ts');
    process.exit(1);
  }

  console.log('🔗 Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db!;
  const coll = db.collection('jobapplications');

  console.log('🔍 Scanning for duplicates...');
  const allJobs = await coll
    .find({})
    .project({ _id: 1, userId: 1, jobTitle: 1, company: 1, jobUrl: 1, updatedAt: 1, jobDescription: 1, source: 1 })
    .toArray();

  console.log(`   Found ${allJobs.length} total jobs`);

  // Group by normalized (userId + title + company)
  const groups = new Map<string, any[]>();
  for (const job of allJobs) {
    const userId = String(job.userId);
    const normTitle = normalizeTitle(job.jobTitle || '');
    const normCompany = normalizeCompany(job.company || '');
    const key = `${userId}::${normTitle}::${normCompany}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(job);
  }

  // Find groups with duplicates
  const dupGroups = [...groups.entries()].filter(([, jobs]) => jobs.length > 1);
  console.log(`   Found ${dupGroups.length} duplicate groups (${dupGroups.reduce((sum, [, j]) => sum + j.length - 1, 0)} excess jobs)`);

  let totalDeleted = 0;
  let totalKept = 0;

  for (const [key, jobs] of dupGroups) {
    const [userId, title, company] = key.split('::');

    // Sort: keep the one with most data (longest description, then most recent)
    jobs.sort((a, b) => {
      const aDescLen = (a.jobDescription || '').length;
      const bDescLen = (b.jobDescription || '').length;
      if (bDescLen !== aDescLen) return bDescLen - aDescLen;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

    const keep = jobs[0];
    const deletees = jobs.slice(1);

    console.log(`\n   📋 "${keep.jobTitle}" @ ${keep.company} (${jobs.length} copies)`);
    console.log(`      Keeping: ${keep._id} (desc: ${(keep.jobDescription || '').length} chars, updated: ${keep.updatedAt})`);
    for (const d of deletees) {
      console.log(`      Deleting: ${d._id} (source: ${d.source}, updated: ${d.updatedAt})`);
      if (!DRY_RUN) {
        await coll.deleteOne({ _id: d._id });
      }
      totalDeleted++;
    }
    totalKept++;
  }

  console.log(`\n${DRY_RUN ? '🔬 DRY RUN' : '✅ DONE'}:`);
  console.log(`   Kept: ${totalKept} jobs`);
  console.log(`   Deleted: ${totalDeleted} duplicates`);

  if (DRY_RUN) {
    console.log('\n   Run without --dry-run to apply changes.');
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});
