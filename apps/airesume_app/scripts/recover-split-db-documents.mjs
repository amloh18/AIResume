#!/usr/bin/env node
/**
 * Split-database recovery script.
 *
 * Background (see docs/mongodb-split-database-recovery.md):
 * A local dev server process bound the shared mongoose default connection to
 * the driver-default database `test` (the MONGODB_URI has no database path)
 * before the connection manager's MONGODB_DB override could apply. Documents
 * created while that process was alive — a master CV, a tailored journey CV,
 * a cover letter and a Databricks application — landed in `test` instead of
 * the real `airesume` database, so they are invisible to the running app.
 *
 * This script moves (copies) those documents into `airesume`, under the real
 * account, keeping every _id so all cross-references stay valid.
 *
 * SAFETY:
 *  - DRY RUN by default: prints the plan, writes nothing.
 *  - Never deletes or modifies anything in the source database.
 *  - Skips documents that already exist in the target (idempotent re-runs).
 *  - Aborts on identity mismatch or duplicate master/application conflicts.
 *  - Writes a JSON backup of every source document before applying.
 *
 * Usage:
 *   node scripts/recover-split-db-documents.mjs                    # dry run (master CV only)
 *   node scripts/recover-split-db-documents.mjs --with-history     # dry run incl. application history
 *   node scripts/recover-split-db-documents.mjs --apply --with-history
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';

const { ObjectId } = mongoose.Types;

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// ---------------------------------------------------------------------------
// Configuration.
//
// ⚠️ EVERY identifier here is instance-specific — production document ObjectIds and a real account
// address — so all of it comes from the environment. This is a public repository and a recovery
// script must not carry one deployment's document ids. Nothing is optional: the script exits
// loudly rather than operating on the wrong documents.
//
// Required env:
//   RECOVERY_SOURCE_DB        source database name (the driver default for a path-less MONGODB_URI)
//   RECOVERY_SOURCE_OWNER_ID  owner _id of the duplicate account in the source database
//   RECOVERY_GUEST_OWNER_ID   owner _id of the guest account in the source database
//   RECOVERY_TARGET_OWNER_ID  owner _id of the real account in the target database
//   RECOVERY_OWNER_EMAIL      email of the real account (asserted against both accounts)
//   RECOVERY_MASTER_CV_ID     the "primary CV" to move
// Optional env:
//   RECOVERY_HISTORY_ITEMS    JSON array of { coll, id, why } for the --with-history bundle
// ---------------------------------------------------------------------------

const requiredEnv = (name) => {
  const value = (process.env[name] || '').trim();
  if (!value) {
    console.error(`❌ ${name} is required — see the configuration block in this file.`);
    process.exit(1);
  }
  return value;
};

const SOURCE_DB = requiredEnv('RECOVERY_SOURCE_DB');
const SOURCE_OWNER_ID = requiredEnv('RECOVERY_SOURCE_OWNER_ID');
const GUEST_OWNER_ID = requiredEnv('RECOVERY_GUEST_OWNER_ID');
const TARGET_OWNER_ID = requiredEnv('RECOVERY_TARGET_OWNER_ID');
const OWNER_EMAIL = requiredEnv('RECOVERY_OWNER_EMAIL');

// Core: the "primary CV" the user reported missing from the docs page.
const MASTER_CV_ID = requiredEnv('RECOVERY_MASTER_CV_ID');

// Optional (--with-history): the application bundle. All ids are kept as-is so
// journeyId / jobId / applicationId / cvId / coverLetterId references continue to resolve.
const HISTORY_ITEMS = process.env.RECOVERY_HISTORY_ITEMS
  ? JSON.parse(process.env.RECOVERY_HISTORY_ITEMS)
  : [];
// applicationevents are discovered dynamically via applicationId.

// Intentionally NOT migrated (documented in the runbook): activitylogs,
// loginsessions, notifications, jobsearchprofiles (target already has one),
// autoapplyreservations, applicationqueues (entry is status=completed).

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const argv = process.argv.slice(2);
const APPLY = argv.includes('--apply');
const WITH_HISTORY = argv.includes('--with-history');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function loadEnvLocal() {
  const p = path.join(REPO_ROOT, '.env.local');
  if (!fs.existsSync(p)) {
    fail('.env.local not found — run this from the repository root.');
  }
  const env = fs.readFileSync(p, 'utf8');
  const uri = (env.match(/^MONGODB_URI=(.+)$/m) || [])[1]?.trim();
  const db = (env.match(/^MONGODB_DB=(.+)$/m) || [])[1]?.trim();
  if (!uri) fail('MONGODB_URI not found in .env.local');
  return { uri, db: db || 'airesume' };
}

function fail(msg) {
  console.error(`\n❌ ${msg}\n`);
  process.exit(1);
}

/** Never print credentials — only a redacted form. */
function redact(uri) {
  return uri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@');
}

async function connect(uri, dbName) {
  return mongoose.createConnection(uri, { dbName, serverSelectionTimeoutMS: 15000 }).asPromise();
}

async function findById(coll, id) {
  try {
    return await coll.findOne({ _id: new ObjectId(id) });
  } catch {
    return null;
  }
}

function isTargetUserOwned(doc) {
  return (
    doc.userId &&
    (String(doc.userId) === SOURCE_OWNER_ID || String(doc.userId) === GUEST_OWNER_ID)
  );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const { uri, db: TARGET_DB } = loadEnvLocal();

if (TARGET_DB === SOURCE_DB) {
  fail(`MONGODB_DB resolves to "${TARGET_DB}" which equals the source database — refusing to run.`);
}
// The whole problem exists because the URI has no database path. If that ever
// changes, SOURCE_DB = 'test' is no longer the right source.
const uriPath = (() => {
  try {
    return new URL(uri.replace('mongodb+srv://', 'http://').replace('mongodb://', 'http://')).pathname;
  } catch {
    return '/';
  }
})();
if (uriPath && uriPath !== '/') {
  fail(`MONGODB_URI contains a database path ("${uriPath}") — SOURCE_DB assumption ('test') no longer holds. Update this script.`);
}

console.log(`\nSplit-database recovery — ${APPLY ? 'APPLY' : 'DRY RUN'}${WITH_HISTORY ? ' (master CV + application history)' : ' (master CV only)'}`);
console.log(`  source db : ${SOURCE_DB}`);
console.log(`  target db : ${TARGET_DB}`);
console.log(`  uri       : ${redact(uri)}\n`);

const src = await connect(uri, SOURCE_DB);
const tgt = await connect(uri, TARGET_DB);

try {
  // ---- Identity assertions -------------------------------------------------
  const srcOwner = await src.db.collection('users').findOne({ _id: new ObjectId(SOURCE_OWNER_ID) });
  const tgtOwner = await tgt.db.collection('users').findOne({ _id: new ObjectId(TARGET_OWNER_ID) });

  if (!srcOwner) fail(`source owner ${SOURCE_OWNER_ID} not found in ${SOURCE_DB}.users — nothing to recover?`);
  if (!tgtOwner) fail(`target owner ${TARGET_OWNER_ID} not found in ${TARGET_DB}.users — has the account been removed?`);
  if ((srcOwner.email || '').toLowerCase() !== OWNER_EMAIL) {
    fail(`source owner email is "${srcOwner.email}", expected ${OWNER_EMAIL} — aborting to avoid migrating another user's data.`);
  }
  if ((tgtOwner.email || '').toLowerCase() !== OWNER_EMAIL) {
    fail(`target owner email is "${tgtOwner.email}", expected ${OWNER_EMAIL} — aborting.`);
  }
  console.log(`✅ identity: ${OWNER_EMAIL}`);
  console.log(`   source account ${SOURCE_OWNER_ID} (created ${srcOwner.createdAt ? new Date(srcOwner.createdAt).toISOString() : '?'})`);
  console.log(`   target account ${TARGET_OWNER_ID} (created ${tgtOwner.createdAt ? new Date(tgtOwner.createdAt).toISOString() : '?'})\n`);

  // ---- Collect planned operations ----------------------------------------
  const operations = []; // {coll, id, doc, why, userIdRewrite}

  async function planItem(collName, id, why) {
    const coll = src.db.collection(collName);
    const doc = await findById(coll, id);
    if (!doc) {
      console.log(`   ⚠️  ${collName}/${id} — NOT FOUND in source, will be skipped`);
      return null;
    }
    const targetColl = tgt.db.collection(collName);
    const existing = await findById(targetColl, id);
    if (existing) {
      console.log(`   ↷️  ${collName}/${id} — already present in target, skipping`);
      return null;
    }
    operations.push({ coll: collName, id, doc, why });
    console.log(`   ➕ ${collName}/${id} — ${why}`);
    return doc;
  }

  // Core: master CV
  console.log('Planned operations:');
  const masterDoc = await planItem('cvs', MASTER_CV_ID, `master CV "${(await findById(src.db.collection('cvs'), MASTER_CV_ID))?.title || ''}" (cvType: master)`);
  if (!masterDoc) fail('master CV not found in source — refusing to continue.');

  if (masterDoc.cvType !== 'master') {
    fail(`document ${MASTER_CV_ID} has cvType "${masterDoc.cvType}", expected "master" — aborting.`);
  }
  if (masterDoc.journeyId) fail(`master CV unexpectedly has journeyId ${masterDoc.journeyId} — aborting.`);
  if (!isTargetUserOwned(masterDoc) || String(masterDoc.userId) !== SOURCE_OWNER_ID) {
    fail(`master CV owner is ${masterDoc.userId}, expected ${SOURCE_OWNER_ID} — aborting.`);
  }

  // Duplicate-master conflict check in target.
  const existingMaster = await tgt.db.collection('cvs').findOne({
    userId: new ObjectId(TARGET_OWNER_ID),
    $or: [{ cvType: 'master' }, { 'metadata.isMaster': true }],
  });
  if (existingMaster && String(existingMaster._id) !== MASTER_CV_ID) {
    fail(
      `target account already has a different master CV (${existingMaster._id} "${existingMaster.title}").\n` +
        'Migrating would create two masters — resolve manually first (inspect both, then delete/merge).'
    );
  }

  // Optional: application history bundle
  if (WITH_HISTORY) {
    for (const item of HISTORY_ITEMS) {
      await planItem(item.coll, item.id, item.why);
    }
    const appDoc = operations.find((o) => o.coll === 'jobapplications');
    if (appDoc) {
      // Duplicate-application check in target (by company + title, not just _id).
      const dup = await tgt.db.collection('jobapplications').findOne({
        userId: new ObjectId(TARGET_OWNER_ID),
        company: appDoc.doc.company,
        jobTitle: appDoc.doc.jobTitle || appDoc.doc.title,
      });
      if (dup) {
        fail(
          `target account already has an application for "${dup.company} / ${dup.jobTitle}" (${dup._id}).\n` +
            'Re-run without --with-history, or resolve the duplicate manually.'
        );
      }
      // Discover application events dynamically.
      const events = await src.db
        .collection('applicationevents')
        .find({ applicationId: new ObjectId(appDoc.id) })
        .toArray();
      for (const ev of events) {
        const already = await findById(tgt.db.collection('applicationevents'), String(ev._id));
        if (already) {
          console.log(`   ↷️  applicationevents/${ev._id} — already present in target, skipping`);
        } else {
          operations.push({ coll: 'applicationevents', id: String(ev._id), doc: ev, why: 'application event (history)' });
          console.log(`   ➕ applicationevents/${ev._id} — application event (history)`);
        }
      }
    }
  }

  console.log(`\nTotal documents to copy: ${operations.length}`);

  if (operations.length === 0) {
    console.log('\nNothing to do — target already contains everything planned.');
    process.exit(0);
  }

  if (!APPLY) {
    console.log('\nDRY RUN — no changes written. Re-run with --apply to execute.');
    if (!WITH_HISTORY) {
      console.log('Add --with-history to also include the application history (journey CV, cover letter, application, events, job posting).');
    }
    process.exit(0);
  }

  // ---- Backup -------------------------------------------------------------
  const backupFile = path.join(
    REPO_ROOT,
    `split-db-recovery-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
  );
  fs.writeFileSync(
    backupFile,
    JSON.stringify(
      {
        createdAt: new Date().toISOString(),
        sourceDb: SOURCE_DB,
        targetDb: TARGET_DB,
        documents: operations.map((o) => ({ coll: o.coll, doc: o.doc })),
      },
      null,
      2
    )
  );
  console.log(`\nBackup written: ${path.relative(REPO_ROOT, backupFile)}`);

  // ---- Apply --------------------------------------------------------------
  let copied = 0;
  const summary = [];

  for (const op of operations) {
    const doc = { ...op.doc };
    // Rewrite ownership to the real account. Global documents (e.g. job
    // postings without userId) are copied unchanged.
    if (doc.userId && (String(doc.userId) === SOURCE_OWNER_ID || String(doc.userId) === GUEST_OWNER_ID)) {
      doc.userId = new ObjectId(TARGET_OWNER_ID);
    }
    try {
      await tgt.db.collection(op.coll).insertOne(doc);
      copied += 1;
      summary.push({ coll: op.coll, id: op.id, status: 'copied' });
    } catch (e) {
      if (e && e.code === 11000) {
        summary.push({ coll: op.coll, id: op.id, status: 'already existed (dup key) — skipped' });
      } else {
        throw e;
      }
    }
  }

  // ---- Verify -------------------------------------------------------------
  console.log('\nVerification (re-read from target):');
  let verified = 0;
  for (const op of operations) {
    const back = await findById(tgt.db.collection(op.coll), op.id);
    const ownerOk = !back || !back.userId || String(back.userId) === TARGET_OWNER_ID || op.coll === 'jobs';
    if (back && ownerOk) verified += 1;
    console.log(
      `   ${back && ownerOk ? '✅' : '❌'} ${op.coll}/${op.id}` +
        (back && back.userId ? ` userId=${back.userId}` : '')
    );
  }

  const masterBack = await tgt.db.collection('cvs').findOne({ _id: new ObjectId(MASTER_CV_ID) });
  console.log(
    `\nMaster CV in target: ${masterBack ? `"${masterBack.title}" status=${masterBack.status} templateId=${masterBack.templateId} userId=${masterBack.userId}` : 'MISSING'}`
  );
  console.log(`Copied: ${copied}, verified: ${verified}/${operations.length}`);
  console.log('\n✅ Done. Open the docs page — the master CV should now be listed.');
  console.log(`   Rollback (if ever needed): delete the verified ids above from ${TARGET_DB}; the source database was never modified.`);
  if (verified !== operations.length) {
    console.log('\n⚠️  Some documents did not verify — inspect before considering this complete.');
    process.exit(2);
  }
} finally {
  await src.close();
  await tgt.close();
}
