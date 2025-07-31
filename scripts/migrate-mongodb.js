#!/usr/bin/env node

/**
 * MongoDB Migration Script
 * 
 * This script helps migrate data from one MongoDB cluster to another.
 * Make sure you have MongoDB Database Tools installed.
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration - Update these with your actual connection strings
const OLD_CLUSTER_URI = process.env.OLD_MONGODB_URI || 'mongodb+srv://olduser:oldpass@oldcluster.mongodb.net/cvcircle';
const NEW_CLUSTER_URI = process.env.NEW_MONGODB_URI || 'mongodb+srv://newuser:newpass@newcluster.mongodb.net/cvcircle';
const BACKUP_DIR = './mongodb-backup';

// Collections to migrate
const COLLECTIONS = ['users', 'cvs', 'jobs', 'coverletters'];

function executeCommand(command) {
  return new Promise((resolve, reject) => {
    console.log(`🔄 Executing: ${command}`);
    
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`❌ Error: ${error.message}`);
        reject(error);
        return;
      }
      if (stderr) {
        console.warn(`⚠️ Warning: ${stderr}`);
      }
      console.log(`✅ Success: ${stdout}`);
      resolve(stdout);
    });
  });
}

async function createBackupDirectory() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    console.log(`📁 Created backup directory: ${BACKUP_DIR}`);
  }
}

async function exportCollection(collectionName) {
  const command = `mongodump --uri="${OLD_CLUSTER_URI}" --collection=${collectionName} --out=${BACKUP_DIR}`;
  
  try {
    await executeCommand(command);
    console.log(`📤 Exported collection: ${collectionName}`);
  } catch (error) {
    console.error(`❌ Failed to export ${collectionName}:`, error.message);
    throw error;
  }
}

async function importCollection(collectionName) {
  const bsonFile = path.join(BACKUP_DIR, 'cvcircle', `${collectionName}.bson`);
  const metadataFile = path.join(BACKUP_DIR, 'cvcircle', `${collectionName}.metadata.json`);
  
  // Check if files exist
  if (!fs.existsSync(bsonFile)) {
    console.warn(`⚠️ BSON file not found for ${collectionName}, skipping...`);
    return;
  }
  
  const command = `mongorestore --uri="${NEW_CLUSTER_URI}" --collection=${collectionName} ${bsonFile}`;
  
  try {
    await executeCommand(command);
    console.log(`📥 Imported collection: ${collectionName}`);
  } catch (error) {
    console.error(`❌ Failed to import ${collectionName}:`, error.message);
    throw error;
  }
}

async function testConnection(uri, name) {
  const command = `mongosh "${uri}" --eval "db.runCommand({ping: 1})" --quiet`;
  
  try {
    await executeCommand(command);
    console.log(`✅ ${name} connection test successful`);
    return true;
  } catch (error) {
    console.error(`❌ ${name} connection test failed:`, error.message);
    return false;
  }
}

async function getCollectionCount(uri, collectionName) {
  const command = `mongosh "${uri}" --eval "db.${collectionName}.countDocuments()" --quiet`;
  
  try {
    const result = await executeCommand(command);
    const count = parseInt(result.trim());
    console.log(`📊 ${collectionName} count: ${count}`);
    return count;
  } catch (error) {
    console.error(`❌ Failed to get count for ${collectionName}:`, error.message);
    return 0;
  }
}

async function migrateData() {
  console.log('🚀 Starting MongoDB Migration...\n');
  
  // Test connections
  console.log('🔍 Testing connections...');
  const oldConnectionOk = await testConnection(OLD_CLUSTER_URI, 'Old cluster');
  const newConnectionOk = await testConnection(NEW_CLUSTER_URI, 'New cluster');
  
  if (!oldConnectionOk || !newConnectionOk) {
    console.error('❌ Connection test failed. Please check your connection strings.');
    process.exit(1);
  }
  
  // Create backup directory
  await createBackupDirectory();
  
  // Export all collections
  console.log('\n📤 Exporting data from old cluster...');
  for (const collection of COLLECTIONS) {
    try {
      await exportCollection(collection);
    } catch (error) {
      console.warn(`⚠️ Skipping ${collection} due to error`);
    }
  }
  
  // Import all collections
  console.log('\n📥 Importing data to new cluster...');
  for (const collection of COLLECTIONS) {
    try {
      await importCollection(collection);
    } catch (error) {
      console.warn(`⚠️ Skipping ${collection} due to error`);
    }
  }
  
  // Verify migration
  console.log('\n🔍 Verifying migration...');
  for (const collection of COLLECTIONS) {
    await getCollectionCount(NEW_CLUSTER_URI, collection);
  }
  
  console.log('\n✅ Migration completed successfully!');
  console.log(`📁 Backup files saved in: ${BACKUP_DIR}`);
}

async function main() {
  try {
    // Check if MongoDB tools are installed
    try {
      await executeCommand('mongodump --version');
      await executeCommand('mongorestore --version');
      await executeCommand('mongosh --version');
    } catch (error) {
      console.error('❌ MongoDB Database Tools not found.');
      console.log('📥 Please install MongoDB Database Tools:');
      console.log('   https://www.mongodb.com/try/download/database-tools');
      process.exit(1);
    }
    
    await migrateData();
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

// Command line interface
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
MongoDB Migration Script

Usage:
  node scripts/migrate-mongodb.js [options]

Options:
  --help, -h          Show this help message
  --test-connection   Test connections only
  --export-only       Export data only
  --import-only       Import data only

Environment Variables:
  OLD_MONGODB_URI     Connection string for old cluster
  NEW_MONGODB_URI     Connection string for new cluster

Example:
  OLD_MONGODB_URI="mongodb+srv://olduser:oldpass@oldcluster.mongodb.net/cvcircle" \\
  NEW_MONGODB_URI="mongodb+srv://newuser:newpass@newcluster.mongodb.net/cvcircle" \\
  node scripts/migrate-mongodb.js
    `);
    process.exit(0);
  }
  
  if (args.includes('--test-connection')) {
    console.log('🔍 Testing connections only...');
    testConnection(OLD_CLUSTER_URI, 'Old cluster')
      .then(() => testConnection(NEW_CLUSTER_URI, 'New cluster'))
      .then(() => console.log('✅ All connection tests passed!'))
      .catch(() => process.exit(1));
    return;
  }
  
  main();
}

module.exports = { migrateData, testConnection, exportCollection, importCollection }; 