#!/usr/bin/env node
/**
 * One-off migration: make `PortalConnection` idempotent.
 *
 * ## Why
 *
 * There is no unique index on `{ userId, provider }`, so nothing stopped a
 * double-click on "Connect" from writing two records for the same account. The
 * read path then papered over it (`connectionMap.set(provider, conn)` — last
 * write wins), which means duplicates exist in production but are invisible.
 *
 * Adding the unique index *before* collapsing those duplicates fails the index
 * build, so this script runs first, then the index builds cleanly on next boot.
 *
 * ## What it does
 *
 *   1. Normalises `userId` to the canonical 24-hex string. The field is
 *      `Schema.Types.Mixed`, so a legacy row may hold an ObjectId; the unique
 *      index would treat `ObjectId(x)` and `"x"` as two different keys and
 *      happily keep both.
 *   2. Collapses duplicate `{ userId, provider }` groups, keeping the most
 *      recently updated record — preferring a `connected` one over a stale
 *      `disconnected` sibling, since the alternative is deleting the live
 *      connection and keeping the dead one.
 *   3. Clears fabricated account identifiers. The old adapters invented
 *      `you@indeed.user` when the user supplied no email, and the UI printed it
 *      back as fact.
 *   4. Backfills `connectedAt` from `sessionMetadata.createdAt`.
 *   5. Builds the unique index and verifies it.
 *
 * ## Usage
 *
 *   node scripts/migrate-portal-connections-dedupe.mjs --dry-run
 *   node scripts/migrate-portal-connections-dedupe.mjs --apply
 *
 * Requires MONGODB_URI (or MONGODB_URL) in the environment. Refuses to run
 * without an explicit `--dry-run` or `--apply`, because "did I mean to run this
 * against production?" is not a question to guess at.
 */

import { MongoClient } from 'mongodb';

const APPLY = process.argv.includes('--apply');
const DRY_RUN = process.argv.includes('--dry-run');

const COLLECTION = 'portalconnections';
const SYNTHETIC = /@(naukri|indeed|linkedin)\.(user|member)$/i;
const HEX24 = /^[0-9a-fA-F]{24}$/;

/** Ordering used to pick a survivor: connected beats disconnected, then recency. */
const STATUS_RANK = {
  connected: 0,
  connecting: 1,
  pending: 2,
  reauth_required: 3,
  expired: 4,
  error: 5,
  blocked: 6,
  disconnected: 7,
};

function rank(record) {
  const byStatus = STATUS_RANK[record.status] ?? 99;
  const updated = record.updatedAt ? new Date(record.updatedAt).getTime() : 0;
  // Lower status rank wins; ties broken by the more recently touched record.
  return [byStatus, -updated];
}

function isBetter(candidate, incumbent) {
  const [cStatus, cUpdated] = rank(candidate);
  const [iStatus, iUpdated] = rank(incumbent);
  if (cStatus !== iStatus) return cStatus < iStatus;
  return cUpdated > iUpdated;
}

function canonicalUserId(value) {
  if (value == null) return null;
  if (typeof value === 'string') return value.toLowerCase();
  // Mongo ObjectId
  if (typeof value === 'object' && typeof value.toHexString === 'function') {
    return value.toHexString().toLowerCase();
  }
  if (typeof value === 'object' && value.$oid) return String(value.$oid).toLowerCase();
  return String(value).toLowerCase();
}

async function main() {
  if (!APPLY && !DRY_RUN) {
    console.error('Refusing to run without an explicit --dry-run or --apply flag.');
    console.error('  node scripts/migrate-portal-connections-dedupe.mjs --dry-run');
    process.exit(1);
  }

  const uri = process.env.MONGODB_URI || process.env.MONGODB_URL;
  if (!uri) {
    console.error('MONGODB_URI (or MONGODB_URL) is required.');
    process.exit(1);
  }

  const client = new MongoClient(uri);
  await client.connect();

  try {
    const db = client.db();
    const collection = db.collection(COLLECTION);

    const total = await collection.countDocuments();
    console.log(`\nportalconnections: ${total} document(s)`);
    console.log(`mode: ${APPLY ? 'APPLY (writing)' : 'DRY RUN (no writes)'}\n`);

    // --- 1. Normalise userId -------------------------------------------------
    let normalised = 0;
    const all = await collection.find({}).toArray();

    for (const doc of all) {
      const canonical = canonicalUserId(doc.userId);
      const current =
        typeof doc.userId === 'string' ? doc.userId : canonicalUserId(doc.userId);

      if (canonical && current !== canonical) {
        normalised++;
        if (APPLY) {
          await collection.updateOne({ _id: doc._id }, { $set: { userId: canonical } });
        }
        doc.userId = canonical;
      } else if (canonical) {
        doc.userId = canonical;
      }
    }
    console.log(`1. userId normalised to canonical hex string : ${normalised}`);

    // --- 2. Collapse duplicates ---------------------------------------------
    const groups = new Map();
    for (const doc of all) {
      if (!doc.userId || !doc.provider) continue;
      const key = `${doc.userId}::${doc.provider}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(doc);
    }

    const duplicateGroups = [...groups.entries()].filter(([, docs]) => docs.length > 1);
    let removed = 0;

    for (const [key, docs] of duplicateGroups) {
      const [userId, provider] = key.split('::');
      let survivor = docs[0];
      for (const doc of docs.slice(1)) {
        if (isBetter(doc, survivor)) survivor = doc;
      }
      const doomed = docs.filter((d) => String(d._id) !== String(survivor._id));
      removed += doomed.length;

      console.log(
        `   ${provider} / ${userId.slice(0, 8)}… : ${docs.length} → 1 ` +
          `(keeping status=${survivor.status}, dropping ${doomed.length})`
      );

      if (APPLY && doomed.length) {
        await collection.deleteMany({ _id: { $in: doomed.map((d) => d._id) } });
      }
    }
    console.log(`2. duplicate {userId, provider} groups collapsed : ${duplicateGroups.length} group(s), ${removed} row(s)`);

    // --- 3. Clear fabricated account identifiers ----------------------------
    const fabricated = await collection
      .find({ $or: [{ 'account.email': SYNTHETIC }, { 'account.portalUserId': SYNTHETIC }] })
      .toArray();

    if (fabricated.length) {
      const ids = fabricated.map((d) => d._id);
      if (APPLY) {
        await collection.updateMany(
          { _id: { $in: ids } },
          { $unset: { 'account.email': '', 'account.portalUserId': '' } }
        );
      }
    }
    console.log(`3. fabricated account identifiers cleared : ${fabricated.length}`);

    // --- 4. Backfill connectedAt -------------------------------------------
    const missingConnectedAt = await collection
      .find({ connectedAt: { $exists: false }, status: 'connected' })
      .toArray();

    let backfilled = 0;
    for (const doc of missingConnectedAt) {
      const when =
        doc.sessionMetadata?.createdAt || doc.createdAt || doc.updatedAt || new Date();
      backfilled++;
      if (APPLY) {
        await collection.updateOne({ _id: doc._id }, { $set: { connectedAt: when } });
      }
    }
    console.log(`4. connectedAt backfilled : ${backfilled}`);

    // --- 5. Build the unique index -----------------------------------------
    const INDEX_NAME = 'userId_1_provider_1';
    const existing = await collection.indexes();
    const stale = existing.find(
      (i) => i.name === INDEX_NAME && !i.unique
    );

    if (stale) {
      console.log(`5. dropping non-unique index ${INDEX_NAME} before rebuilding`);
      if (APPLY) await collection.dropIndex(INDEX_NAME);
    }

    const stillDuplicated = await collection
      .aggregate([
        { $group: { _id: { userId: '$userId', provider: '$provider' }, n: { $sum: 1 } } },
        { $match: { n: { $gt: 1 } } },
        { $count: 'groups' },
      ])
      .toArray();

    const remaining = stillDuplicated[0]?.groups ?? 0;
    if (remaining > 0) {
      console.error(
        `\n✗ ${remaining} duplicate group(s) still present — refusing to build a unique index.\n` +
          '  Re-run with --apply so step 2 actually deletes them.'
      );
      process.exitCode = 1;
    } else if (APPLY) {
      await collection.createIndex(
        { userId: 1, provider: 1 },
        { unique: true, name: INDEX_NAME }
      );
      const verified = (await collection.indexes()).find((i) => i.name === INDEX_NAME);
      console.log(
        `5. unique index ${INDEX_NAME} : ${verified?.unique ? 'built and unique ✓' : 'NOT unique ✗'}`
      );
      if (!verified?.unique) process.exitCode = 1;
    } else {
      console.log('5. unique index userId_1_provider_1 : would be built (dry run)');
    }

    console.log(
      APPLY
        ? '\nDone.\n'
        : '\nDry run complete. Re-run with --apply to write these changes.\n'
    );
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
