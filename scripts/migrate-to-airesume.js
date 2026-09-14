#!/usr/bin/env node
/**
 * MongoDB Migration: test + cvcircle → airesume
 *
 * This script:
 * 1. Audits collections in `test` and `cvcircle` databases
 * 2. Creates `airesume` database with `test` schema structure
 * 3. Copies all data from `test` → `airesume`
 * 4. Merges data from `cvcircle` → `airesume` (normalizing if schema differs)
 * 5. Drops `admin`, `cvcircle`, and `test` databases
 *
 * Usage:
 *   node scripts/migrate-to-airesume.js              # Full migration
 *   node scripts/migrate-to-airesume.js --audit       # Audit only (no changes)
 *   node scripts/migrate-to-airesume.js --no-cleanup  # Skip dropping old databases
 *
 * Requires MONGODB_URI env var or reads from .env.local
 */

const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

// ── Config ──────────────────────────────────────────────────────────────────

const SOURCE_DB = 'test';
const OLD_DB = 'cvcircle';
const TARGET_DB = 'airesume';
const USELESS_DB = 'admin';

const DRY_RUN = process.argv.includes('--audit');
const NO_CLEANUP = process.argv.includes('--no-cleanup');

// ── Helpers ─────────────────────────────────────────────────────────────────

function loadEnv() {
  const envPath = path.resolve(__dirname, '..', '.env.local');
  if (!fs.existsSync(envPath)) {
    const envPath2 = path.resolve(__dirname, '..', '.env');
    if (fs.existsSync(envPath2)) return envPath2;
    console.error('No .env.local or .env found');
    process.exit(1);
  }
  return envPath;
}

function getMongoUri() {
  if (process.env.MONGODB_URI) return process.env.MONGODB_URI;

  const envFile = loadEnv();
  const content = fs.readFileSync(envFile, 'utf8');
  const match = content.match(/^MONGODB_URI\s*=\s*(.+)$/m);
  if (match) return match[1].trim();

  console.error('MONGODB_URI not found in environment or .env.local');
  process.exit(1);
}

function log(emoji, msg) {
  console.log(`${emoji}  ${msg}`);
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// ── Schema Normalization ────────────────────────────────────────────────────
// Normalize cvcircle documents to match test schema structure

const FIELD_MAPPINGS = {
  // cvcircle → test field name mappings
  users: {
    // cvcircle might use different field names
    email_address: 'email',
    full_name: 'name',
    created_at: 'createdAt',
    updated_at: 'updatedAt',
  },
  cvs: {
    resume_data: 'cvData',
    created_at: 'createdAt',
    updated_at: 'updatedAt',
  },
  jobs: {
    job_title: 'jobTitle',
    job_url: 'jobUrl',
    job_description: 'jobDescription',
    created_at: 'createdAt',
    updated_at: 'updatedAt',
  },
  jobapplications: {
    job_title: 'jobTitle',
    applied_date: 'applicationDate',
    created_at: 'createdAt',
    updated_at: 'updatedAt',
  },
};

function normalizeDocument(doc, collectionName) {
  const mapping = FIELD_MAPPINGS[collectionName];
  if (!mapping) return doc;

  const normalized = { ...doc };
  for (const [oldField, newField] of Object.entries(mapping)) {
    if (normalized[oldField] !== undefined && normalized[newField] === undefined) {
      normalized[newField] = normalized[oldField];
      delete normalized[oldField];
    }
  }

  // Ensure _id is preserved
  if (doc._id) normalized._id = doc._id;

  return normalized;
}

// ── Audit ───────────────────────────────────────────────────────────────────

async function auditDatabases(client) {
  const adminDb = client.db();
  const testDb = client.db(SOURCE_DB);
  const cvcircleDb = client.db(OLD_DB);

  log('🔍', `Auditing databases...`);
  console.log('');

  // List all databases
  const dbs = await adminDb.admin().listDatabases();
  log('📁', `Databases on cluster:`);
  for (const db of dbs.databases) {
    const size = formatBytes(db.sizeOnDisk || 0);
    console.log(`   ${db.name.padEnd(20)} ${size}`);
  }
  console.log('');

  // Audit test database
  const testCollections = await testDb.listCollections().toArray();
  log('📊', `Database "${SOURCE_DB}" — ${testCollections.length} collections:`);

  let testTotalDocs = 0;
  for (const coll of testCollections) {
    const count = await testDb.collection(coll.name).countDocuments();
    testTotalDocs += count;
    const indexes = await testDb.collection(coll.name).indexes();
    console.log(`   ${coll.name.padEnd(30)} ${String(count).padStart(8)} docs  ${indexes.length} indexes`);
  }
  console.log(`   ${''.padEnd(30)} ${String(testTotalDocs).padStart(8)} total`);
  console.log('');

  // Audit cvcircle database
  try {
    const cvcircleCollections = await cvcircleDb.listCollections().toArray();
    log('📊', `Database "${OLD_DB}" — ${cvcircleCollections.length} collections:`);

    let cvcircleTotalDocs = 0;
    for (const coll of cvcircleCollections) {
      const count = await cvcircleDb.collection(coll.name).countDocuments();
      cvcircleTotalDocs += count;
      console.log(`   ${coll.name.padEnd(30)} ${String(count).padStart(8)} docs`);
    }
    console.log(`   ${''.padEnd(30)} ${String(cvcircleTotalDocs).padStart(8)} total`);
    console.log('');

    // Find overlapping collections
    const testNames = new Set(testCollections.map(c => c.name));
    const overlapping = cvcircleCollections.filter(c => testNames.has(c.name));
    if (overlapping.length > 0) {
      log('⚠️', `Overlapping collections (will MERGE data):`);
      for (const coll of overlapping) {
        const testCount = await testDb.collection(coll.name).countDocuments();
        const cvcircleCount = await cvcircleDb.collection(coll.name).countDocuments();
        console.log(`   ${coll.name.padEnd(25)} test=${testCount}  cvcircle=${cvcircleCount}`);
      }
      console.log('');
    }

    // Find cvcircle-only collections
    const cvcircleOnly = cvcircleCollections.filter(c => !testNames.has(c.name));
    if (cvcircleOnly.length > 0) {
      log('📦', `cvcircle-only collections (will be copied to airesume):`);
      for (const coll of cvcircleOnly) {
        const count = await cvcircleDb.collection(coll.name).countDocuments();
        console.log(`   ${coll.name.padEnd(30)} ${String(count).padStart(8)} docs`);
      }
      console.log('');
    }
  } catch (e) {
    log('ℹ️', `Database "${OLD_DB}" not accessible or doesn't exist`);
  }

  // Sample schema differences for overlapping collections
  log('🔬', `Schema comparison (sampling first doc from each):`);
  for (const coll of testCollections.slice(0, 10)) {
    const testDoc = await testDb.collection(coll.name).findOne();
    let cvcircleDoc = null;
    try {
      cvcircleDoc = await cvcircleDb.collection(coll.name).findOne();
    } catch {}

    if (testDoc && cvcircleDoc) {
      const testKeys = Object.keys(testDoc).sort().join(', ');
      const cvcircleKeys = Object.keys(cvcircleDoc).sort().join(', ');
      if (testKeys !== cvcircleKeys) {
        console.log(`\n   ${coll.name}:`);
        console.log(`     test keys:      ${testKeys}`);
        console.log(`     cvcircle keys:  ${cvcircleKeys}`);
      }
    }
  }
  console.log('');

  return { testCollections, testTotalDocs };
}

// ── Migration ───────────────────────────────────────────────────────────────

async function migrateCollection(sourceDb, targetDb, collectionName) {
  const sourceColl = sourceDb.collection(collectionName);
  const targetColl = targetDb.collection(collectionName);

  const count = await sourceColl.countDocuments();
  if (count === 0) return 0;

  // Stream documents in batches to avoid memory issues
  const BATCH_SIZE = 1000;
  let migrated = 0;
  const cursor = sourceColl.find().batchSize(BATCH_SIZE);

  const docs = [];
  while (await cursor.hasNext()) {
    const doc = await cursor.next();
    const normalized = normalizeDocument(doc, collectionName);
    docs.push(normalized);

    if (docs.length >= BATCH_SIZE) {
      await targetColl.insertMany(docs, { ordered: false }).catch(() => {});
      migrated += docs.length;
      docs.length = 0;
    }
  }

  if (docs.length > 0) {
    await targetColl.insertMany(docs, { ordered: false }).catch(() => {});
    migrated += docs.length;
  }

  return migrated;
}

async function migrateDatabases(client) {
  const sourceDb = client.db(SOURCE_DB);
  const cvcircleDb = client.db(OLD_DB);
  const targetDb = client.db(TARGET_DB);

  log('🚀', `Starting migration: ${SOURCE_DB} + ${OLD_DB} → ${TARGET_DB}`);
  console.log('');

  // Step 1: Copy all collections from test → airesume
  const testCollections = await sourceDb.listCollections().toArray();
  log('📋', `Step 1: Copying ${testCollections.length} collections from "${SOURCE_DB}"...`);

  let totalMigrated = 0;
  for (const coll of testCollections) {
    const count = await migrateCollection(sourceDb, targetDb, coll.name);
    totalMigrated += count;
    log('  ✓', `${coll.name}: ${count} documents`);
  }
  log('✅', `Step 1 complete: ${totalMigrated} documents copied to "${TARGET_DB}"`);
  console.log('');

  // Step 2: Merge cvcircle data into airesume
  try {
    const cvcircleCollections = await cvcircleDb.listCollections().toArray();
    const testCollNames = new Set(testCollections.map(c => c.name));

    log('📋', `Step 2: Merging ${cvcircleCollections.length} collections from "${OLD_DB}"...`);

    let mergedCount = 0;
    for (const coll of cvcircleCollections) {
      const cvcircleCount = await cvcircleDb.collection(coll.name).countDocuments();
      if (cvcircleCount === 0) continue;

      if (testCollNames.has(coll.name)) {
        // Overlapping collection — merge (append cvcircle docs, skip duplicates by _id)
        const existingIds = new Set();
        const existingCursor = targetDb.collection(coll.name).find({}, { projection: { _id: 1 } }).batchSize(1000);
        while (await existingCursor.hasNext()) {
          const doc = await existingCursor.next();
          existingIds.add(doc._id.toString());
        }

        const cvcircleCursor = cvcircleDb.collection(coll.name).find().batchSize(1000);
        const newDocs = [];
        let skipped = 0;

        while (await cvcircleCursor.hasNext()) {
          const doc = await cvcircleCursor.next();
          const normalized = normalizeDocument(doc, coll.name);

          if (existingIds.has(normalized._id.toString())) {
            skipped++;
            continue;
          }
          newDocs.push(normalized);

          if (newDocs.length >= 1000) {
            await targetDb.collection(coll.name).insertMany(newDocs, { ordered: false }).catch(() => {});
            mergedCount += newDocs.length;
            newDocs.length = 0;
          }
        }

        if (newDocs.length > 0) {
          await targetDb.collection(coll.name).insertMany(newDocs, { ordered: false }).catch(() => {});
          mergedCount += newDocs.length;
        }

        log('  ✓', `${coll.name}: ${mergedCount} merged, ${skipped} skipped (duplicates)`);
      } else {
        // cvcircle-only — copy all
        const count = await migrateCollection(cvcircleDb, targetDb, coll.name);
        mergedCount += count;
        log('  ✓', `${coll.name}: ${count} documents (new collection)`);
      }
    }
    log('✅', `Step 2 complete: ${mergedCount} documents merged from "${OLD_DB}"`);
  } catch (e) {
    log('⚠️', `Step 2 skipped: ${OLD_DB} not accessible — ${e.message}`);
  }
  console.log('');

  // Step 3: Create indexes on airesume (copy from test)
  log('📋', `Step 3: Recreating indexes...`);
  for (const coll of testCollections) {
    const indexes = await sourceDb.collection(coll.name).indexes();
    for (const index of indexes) {
      if (index.name === '_id_') continue; // Skip default _id index
      try {
        const { key, ...options } = index;
        await targetDb.collection(coll.name).createIndex(key, options);
      } catch (e) {
        // Index creation may fail if it already exists
      }
    }
    if (testCollections.indexOf(coll) % 5 === 0) {
      log('  ✓', `Indexes for ${coll.name} created`);
    }
  }
  log('✅', `Step 3 complete: indexes recreated`);
  console.log('');

  // Summary
  const finalCollections = await targetDb.listCollections().toArray();
  let finalTotal = 0;
  for (const coll of finalCollections) {
    const count = await targetDb.collection(coll.name).countDocuments();
    finalTotal += count;
  }

  log('📊', `Migration Summary:`);
  console.log(`   Target database:  ${TARGET_DB}`);
  console.log(`   Collections:      ${finalCollections.length}`);
  console.log(`   Total documents:  ${finalTotal}`);
  console.log('');

  return { collections: finalCollections.length, documents: finalTotal };
}

// ── Cleanup ─────────────────────────────────────────────────────────────────

async function cleanupDatabases(client) {
  const admin = client.db().admin();

  log('🗑️', `Cleaning up old databases...`);

  for (const dbName of [USELESS_DB, OLD_DB, SOURCE_DB]) {
    try {
      await client.db(dbName).dropDatabase();
      log('  ✓', `Dropped "${dbName}"`);
    } catch (e) {
      log('  ⚠', `Could not drop "${dbName}": ${e.message}`);
    }
  }

  log('✅', `Cleanup complete`);
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const uri = getMongoUri();

  // Extract database name from URI for display
  const uriDbMatch = uri.match(/\/([^/?]+)(\?|$)/);
  const currentDb = uriDbMatch ? uriDbMatch[1] : '(default)';

  log('🔗', `MongoDB URI: ${uri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`);
  log('📍', `Current default database: ${currentDb}`);
  log('🎯', `Target database: ${TARGET_DB}`);
  if (DRY_RUN) log('🔍', `Mode: AUDIT ONLY (no changes will be made)`);
  if (NO_CLEANUP) log('ℹ️', `Mode: NO CLEANUP (old databases will be preserved)`);
  console.log('');

  const client = new MongoClient(uri, {
    ssl: uri.startsWith('mongodb+srv://'),
    tlsAllowInvalidCertificates: false,
  });

  try {
    await client.connect();
    log('✅', `Connected to MongoDB`);
    console.log('');

    // Always run audit first
    const { testCollections } = await auditDatabases(client);

    if (DRY_RUN) {
      log('ℹ️', `Audit complete. No changes were made.`);
      log('ℹ️', `Run without --audit to perform the migration.`);
      return;
    }

    // Confirm before proceeding
    console.log('─'.repeat(60));
    log('⚠️', `WARNING: This will modify the following databases:`);
    console.log(`   ${SOURCE_DB} → copied to ${TARGET_DB} (then dropped)`);
    console.log(`   ${OLD_DB} → merged into ${TARGET_DB} (then dropped)`);
    console.log(`   ${USELESS_DB} → dropped`);
    console.log('─'.repeat(60));
    console.log('');

    // Perform migration
    const result = await migrateDatabases(client);

    // Cleanup old databases
    if (!NO_CLEANUP) {
      await cleanupDatabases(client);
    } else {
      log('ℹ️', `Skipping cleanup (--no-cleanup flag)`);
    }

    console.log('');
    log('🎉', `Migration complete!`);
    log('ℹ️', `Update your MONGODB_URI to include /${TARGET_DB} in the path:`);

    // Show suggested URI
    const baseUri = uri.replace(/\/[^/?]+(\?|$)/, '/');
    const suggestedUri = `${baseUri}${TARGET_DB}${uri.includes('?') ? uri.split('?')[1] : ''}`;
    console.log(`   ${suggestedUri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`);
    console.log('');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

main();
