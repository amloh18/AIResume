/**
 * Fix legacy jobs where `source` is a string instead of an object.
 * Also computes missing canonicalId.
 *
 * Usage: npx ts-node scripts/fix-legacy-jobs.ts --apply
 */

import dotenv from 'dotenv';
import { resolve } from 'path';
import mongoose from 'mongoose';
import crypto from 'crypto';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

function generateCanonicalId(company: string, title: string, countryCode: string, city: string): string {
  const payload = `${company}::${title}::${countryCode}::${city.toLowerCase()}`;
  return crypto.createHash('sha256').update(payload).digest('hex');
}

function generateContentHash(job: { title: string; description: string; location: string }): string {
  const payload = [
    job.title.toLowerCase().trim(),
    job.description.replace(/<[^>]*>/g, '').substring(0, 5000),
    job.location.toLowerCase().trim(),
  ].join('::');
  return crypto.createHash('sha256').update(payload).digest('hex');
}

async function fixLegacyJobs() {
  const dryRun = !process.argv.includes('--apply');
  console.log(dryRun ? '🔍 DRY RUN\n' : '🚀 APPLY MODE\n');

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) { console.error('❌ MONGODB_URI not set'); process.exit(1); }

  await mongoose.connect(mongoUri);
  console.log('✅ Connected\n');

  const coll = mongoose.connection.db!.collection('jobs');
  const count = await coll.countDocuments({ source: { $type: 'string' } });
  console.log(`📋 Legacy jobs with string source: ${count}\n`);

  if (count === 0) {
    console.log('✅ Nothing to fix');
    await mongoose.connection.close();
    return;
  }

  const cursor = coll.find({ source: { $type: 'string' } });
  const ops: any[] = [];
  let processed = 0;

  for await (const doc of cursor) {
    processed++;
    const sourceStr = doc.source as string;
    const now = new Date();

    const title = doc.title || '';
    const location = typeof doc.location === 'object' && doc.location
      ? `${doc.location.city || ''}, ${doc.location.country || ''}`
      : typeof doc.location === 'string' ? doc.location : '';
    const companyName = typeof doc.company === 'object' && doc.company
      ? doc.company.name || ''
      : typeof doc.company === 'string' ? doc.company : '';

    const canonicalId = doc.canonicalId || generateCanonicalId(
      companyName.toLowerCase().replace(/[^a-z0-9]/g, ''),
      title,
      (doc.location?.countryCode || 'XX').toUpperCase(),
      (doc.location?.city || 'unknown').toLowerCase()
    );

    const contentHash = doc.contentHash || generateContentHash({
      title,
      description: doc.description || '',
      location,
    });

    const createdAt = doc.createdAt ? new Date(doc.createdAt) : now;

    ops.push({
      updateOne: {
        filter: { _id: doc._id },
        update: {
          $set: {
            source: {
              primary: sourceStr,
              secondary: undefined,
              sourceJobId: doc._id.toString(),
              sourceUrl: doc.url || '',
              applicationUrl: doc.url || '',
              discoveredAt: createdAt,
              lastSeenAt: now,
            },
            canonicalId,
            contentHash,
            firstSeenAt: createdAt,
            lastSeenAt: now,
            lastVerifiedAt: now,
            status: 'active',
            updatedAt: now,
          },
        },
      },
    });

    if (ops.length >= 500) {
      if (!dryRun) await (coll as any).bulkWrite(ops, { ordered: false });
      console.log(`  [${dryRun ? 'DRY' : 'APPLY'}] ${processed}/${count}`);
      ops.length = 0;
    }
  }

  if (ops.length > 0 && !dryRun) {
    await (coll as any).bulkWrite(ops, { ordered: false });
  }

  console.log(`\n✅ ${dryRun ? 'Dry-run' : 'Fixed'}: ${processed} legacy jobs`);
  if (dryRun) console.log('💡 Run with --apply to write');
  await mongoose.connection.close();
}

fixLegacyJobs().catch((err) => { console.error('❌', err); process.exit(1); });
