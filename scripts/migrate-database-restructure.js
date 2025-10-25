#!/usr/bin/env node

/**
 * Database Restructure Migration Script
 * 
 * This script migrates data from the redundant cvcircle_admin database
 * to consolidate everything into the main cvcircle database and cvcircle_logs.
 * 
 * Usage:
 *   node scripts/migrate-database-restructure.js --dry-run
 *   node scripts/migrate-database-restructure.js --execute
 */

const { MongoClient } = require('mongodb');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

// Configuration
const MONGODB_URI = process.env.MONGODB_URI;
const DRY_RUN = process.argv.includes('--dry-run');
const EXECUTE = process.argv.includes('--execute');

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI environment variable is required');
  process.exit(1);
}

if (!DRY_RUN && !EXECUTE) {
  console.error('❌ Please specify either --dry-run or --execute');
  process.exit(1);
}

// Database URIs
const baseUri = MONGODB_URI;
const cvcircleUri = baseUri.includes('/cvcircle') ? baseUri : baseUri + '/cvcircle';
const cvcircleAdminUri = baseUri.includes('/cvcircle') 
  ? baseUri.replace('/cvcircle', '/cvcircle_admin')
  : baseUri + '/cvcircle_admin';
const cvcircleLogsUri = baseUri.includes('/cvcircle')
  ? baseUri.replace('/cvcircle', '/cvcircle_logs')
  : baseUri + '/cvcircle_logs';

console.log('🔧 Database Restructure Migration Script');
console.log('==========================================');
console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'EXECUTE'}`);
console.log(`Main DB: ${cvcircleUri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`);
console.log(`Admin DB: ${cvcircleAdminUri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`);
console.log(`Logs DB: ${cvcircleLogsUri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`);
console.log('');

let cvcircleClient, cvcircleAdminClient, cvcircleLogsClient;
let cvcircleDb, cvcircleAdminDb, cvcircleLogsDb;

async function connectToDatabases() {
  try {
    console.log('🔗 Connecting to databases...');
    
    // Connect to main database
    cvcircleClient = new MongoClient(cvcircleUri);
    await cvcircleClient.connect();
    cvcircleDb = cvcircleClient.db();
    console.log('✅ Connected to cvcircle database');
    
    // Connect to admin database
    try {
      cvcircleAdminClient = new MongoClient(cvcircleAdminUri);
      await cvcircleAdminClient.connect();
      cvcircleAdminDb = cvcircleAdminClient.db();
      console.log('✅ Connected to cvcircle_admin database');
    } catch (error) {
      console.log('⚠️  cvcircle_admin database not found or not accessible');
      cvcircleAdminDb = null;
    }
    
    // Connect to logs database
    cvcircleLogsClient = new MongoClient(cvcircleLogsUri);
    await cvcircleLogsClient.connect();
    cvcircleLogsDb = cvcircleLogsClient.db();
    console.log('✅ Connected to cvcircle_logs database');
    
  } catch (error) {
    console.error('❌ Database connection error:', error);
    throw error;
  }
}

async function analyzeCurrentState() {
  console.log('\n📊 Analyzing Current State');
  console.log('============================');
  
  const collections = await cvcircleDb.listCollections().toArray();
  console.log(`Main database collections: ${collections.map(c => c.name).join(', ')}`);
  
  if (cvcircleAdminDb) {
    const adminCollections = await cvcircleAdminDb.listCollections().toArray();
    console.log(`Admin database collections: ${adminCollections.map(c => c.name).join(', ')}`);
  }
  
  const logsCollections = await cvcircleLogsDb.listCollections().toArray();
  console.log(`Logs database collections: ${logsCollections.map(c => c.name).join(', ')}`);
  
  // Check for verification tokens in users collection
  const usersWithTokens = await cvcircleDb.collection('users').countDocuments({
    $or: [
      { emailVerificationToken: { $exists: true } },
      { resetPasswordToken: { $exists: true } }
    ]
  });
  console.log(`Users with embedded tokens: ${usersWithTokens}`);
  
  // Check AI usage logs
  const aiUsageLogsCount = await cvcircleDb.collection('aiusagelogs').countDocuments();
  console.log(`AI usage logs in main DB: ${aiUsageLogsCount}`);
}

async function migrateAdminData() {
  if (!cvcircleAdminDb) {
    console.log('⚠️  No admin database found, skipping admin data migration');
    return;
  }
  
  console.log('\n🔄 Migrating Admin Data');
  console.log('========================');
  
  const adminCollections = await cvcircleAdminDb.listCollections().toArray();
  const collectionsToMigrate = [
    'templates', 'invoices', 'subscriptions', 'pricingplans', 
    'discountcodes', 'newsletters', 'paymentmethods', 'testimonials'
  ];
  
  for (const collectionName of collectionsToMigrate) {
    const adminCollection = cvcircleAdminDb.collection(collectionName);
    const mainCollection = cvcircleDb.collection(collectionName);
    
    const adminCount = await adminCollection.countDocuments();
    const mainCount = await mainCollection.countDocuments();
    
    console.log(`📁 ${collectionName}: Admin=${adminCount}, Main=${mainCount}`);
    
    if (adminCount > 0) {
      if (DRY_RUN) {
        console.log(`   [DRY RUN] Would migrate ${adminCount} documents from admin to main`);
      } else {
        // Check for unique documents in admin that don't exist in main
        const adminDocs = await adminCollection.find({}).toArray();
        const mainIds = new Set((await mainCollection.find({}, { projection: { _id: 1 } }).toArray()).map(d => d._id.toString()));
        
        const uniqueDocs = adminDocs.filter(doc => !mainIds.has(doc._id.toString()));
        
        if (uniqueDocs.length > 0) {
          await mainCollection.insertMany(uniqueDocs);
          console.log(`   ✅ Migrated ${uniqueDocs.length} unique documents`);
        } else {
          console.log(`   ⚠️  No unique documents to migrate`);
        }
      }
    }
  }
}

async function migrateVerificationTokens() {
  console.log('\n🔑 Migrating Verification Tokens');
  console.log('==================================');
  
  const usersWithTokens = await cvcircleDb.collection('users').find({
    $or: [
      { emailVerificationToken: { $exists: true } },
      { resetPasswordToken: { $exists: true } }
    ]
  }).toArray();
  
  console.log(`Found ${usersWithTokens.length} users with embedded tokens`);
  
  if (usersWithTokens.length === 0) {
    console.log('✅ No verification tokens to migrate');
    return;
  }
  
  const verificationTokens = [];
  
  for (const user of usersWithTokens) {
    // Email verification tokens
    if (user.emailVerificationToken && user.emailVerificationExpires) {
      verificationTokens.push({
        userId: user._id,
        token: user.emailVerificationToken,
        type: 'email',
        email: user.email,
        expiresAt: user.emailVerificationExpires,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
    
    // Password reset tokens
    if (user.resetPasswordToken && user.resetPasswordExpires) {
      verificationTokens.push({
        userId: user._id,
        token: user.resetPasswordToken,
        type: 'password',
        email: user.email,
        expiresAt: user.resetPasswordExpires,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
  }
  
  if (verificationTokens.length > 0) {
    if (DRY_RUN) {
      console.log(`[DRY RUN] Would create ${verificationTokens.length} verification token documents`);
    } else {
      await cvcircleDb.collection('verificationtokens').insertMany(verificationTokens);
      console.log(`✅ Created ${verificationTokens.length} verification token documents`);
    }
  }
}

async function migrateAIUsageLogs() {
  console.log('\n📊 Migrating AI Usage Logs');
  console.log('===========================');
  
  const aiUsageLogsCount = await cvcircleDb.collection('aiusagelogs').countDocuments();
  console.log(`AI usage logs in main DB: ${aiUsageLogsCount}`);
  
  if (aiUsageLogsCount === 0) {
    console.log('✅ No AI usage logs to migrate');
    return;
  }
  
  if (DRY_RUN) {
    console.log(`[DRY RUN] Would move ${aiUsageLogsCount} AI usage logs to logs database`);
  } else {
    // Get all AI usage logs
    const aiUsageLogs = await cvcircleDb.collection('aiusagelogs').find({}).toArray();
    
    // Insert into logs database
    if (aiUsageLogs.length > 0) {
      await cvcircleLogsDb.collection('aiusagelogs').insertMany(aiUsageLogs);
      console.log(`✅ Moved ${aiUsageLogs.length} AI usage logs to logs database`);
    }
  }
}

async function createTTLIndexes() {
  console.log('\n⏰ Creating TTL Indexes');
  console.log('=======================');
  
  const indexes = [
    {
      collection: 'verificationtokens',
      database: cvcircleDb,
      index: { expiresAt: 1 },
      options: { expireAfterSeconds: 0 }
    },
    {
      collection: 'aiusagelogs',
      database: cvcircleLogsDb,
      index: { createdAt: 1 },
      options: { expireAfterSeconds: 7776000 } // 90 days
    },
    {
      collection: 'api_logs',
      database: cvcircleLogsDb,
      index: { timestamp: 1 },
      options: { expireAfterSeconds: 2592000 } // 30 days
    }
  ];
  
  for (const { collection, database, index, options } of indexes) {
    if (DRY_RUN) {
      console.log(`[DRY RUN] Would create TTL index on ${collection}`);
    } else {
      try {
        await database.collection(collection).createIndex(index, options);
        console.log(`✅ Created TTL index on ${collection}`);
      } catch (error) {
        console.log(`⚠️  TTL index on ${collection} may already exist: ${error.message}`);
      }
    }
  }
}

async function cleanupUserTokens() {
  console.log('\n🧹 Cleaning Up User Tokens');
  console.log('==========================');
  
  const usersWithTokens = await cvcircleDb.collection('users').countDocuments({
    $or: [
      { emailVerificationToken: { $exists: true } },
      { emailVerificationExpires: { $exists: true } },
      { resetPasswordToken: { $exists: true } },
      { resetPasswordExpires: { $exists: true } }
    ]
  });
  
  console.log(`Users with token fields: ${usersWithTokens}`);
  
  if (usersWithTokens > 0) {
    if (DRY_RUN) {
      console.log(`[DRY RUN] Would remove token fields from ${usersWithTokens} users`);
    } else {
      const result = await cvcircleDb.collection('users').updateMany(
        {
          $or: [
            { emailVerificationToken: { $exists: true } },
            { emailVerificationExpires: { $exists: true } },
            { resetPasswordToken: { $exists: true } },
            { resetPasswordExpires: { $exists: true } }
          ]
        },
        {
          $unset: {
            emailVerificationToken: "",
            emailVerificationExpires: "",
            resetPasswordToken: "",
            resetPasswordExpires: ""
          }
        }
      );
      console.log(`✅ Removed token fields from ${result.modifiedCount} users`);
    }
  }
}

async function verifyMigration() {
  console.log('\n✅ Verifying Migration');
  console.log('====================');
  
  // Check verification tokens
  const verificationTokensCount = await cvcircleDb.collection('verificationtokens').countDocuments();
  console.log(`Verification tokens: ${verificationTokensCount}`);
  
  // Check AI usage logs in logs database
  const aiUsageLogsInLogs = await cvcircleLogsDb.collection('aiusagelogs').countDocuments();
  console.log(`AI usage logs in logs DB: ${aiUsageLogsInLogs}`);
  
  // Check users without token fields
  const usersWithoutTokens = await cvcircleDb.collection('users').countDocuments({
    $and: [
      { emailVerificationToken: { $exists: false } },
      { emailVerificationExpires: { $exists: false } },
      { resetPasswordToken: { $exists: false } },
      { resetPasswordExpires: { $exists: false } }
    ]
  });
  console.log(`Users without token fields: ${usersWithoutTokens}`);
  
  // Check indexes
  const verificationTokensIndexes = await cvcircleDb.collection('verificationtokens').listIndexes().toArray();
  const ttlIndexes = verificationTokensIndexes.filter(idx => idx.expireAfterSeconds !== undefined);
  console.log(`TTL indexes on verificationtokens: ${ttlIndexes.length}`);
}

async function main() {
  try {
    await connectToDatabases();
    await analyzeCurrentState();
    await migrateAdminData();
    await migrateVerificationTokens();
    await migrateAIUsageLogs();
    await createTTLIndexes();
    await cleanupUserTokens();
    await verifyMigration();
    
    console.log('\n🎉 Migration completed successfully!');
    
    if (DRY_RUN) {
      console.log('\n⚠️  This was a dry run. Use --execute to perform the actual migration.');
    } else {
      console.log('\n✅ Database restructure completed. You can now:');
      console.log('   1. Update your application code to use the new structure');
      console.log('   2. Test all functionality');
      console.log('   3. Drop the cvcircle_admin database when ready');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    // Close connections
    if (cvcircleClient) await cvcircleClient.close();
    if (cvcircleAdminClient) await cvcircleAdminClient.close();
    if (cvcircleLogsClient) await cvcircleLogsClient.close();
  }
}

// Run the migration
main();
