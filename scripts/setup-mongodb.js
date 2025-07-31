#!/usr/bin/env node

/**
 * MongoDB Setup Script
 * 
 * This script helps set up your MongoDB cluster and create the schema.
 * Run this after creating your MongoDB Atlas cluster.
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://username:password@cluster.mongodb.net/cvcircle?retryWrites=true&w=majority';
const DATABASE_NAME = 'cvcircle';

// Collections to create
const COLLECTIONS = [
  'users',
  'cvs', 
  'jobapplications',
  'coverletters',
  'templates',
  'snippets',
  'cvdata'
];

// Indexes configuration
const INDEXES = {
  users: [
    { key: { email: 1 }, options: { unique: true } },
    { key: { 'subscription.status': 1 } },
    { key: { isEmailVerified: 1 } }
  ],
  cvs: [
    { key: { userId: 1, status: 1 } },
    { key: { userId: 1, createdAt: -1 } },
    { key: { 'metadata.tags': 1 } },
    { key: { 'metadata.isPublic': 1, 'metadata.lastModified': -1 } },
    { key: { templateId: 1 } }
  ],
  jobapplications: [
    { key: { userId: 1, status: 1 } },
    { key: { userId: 1, applicationDate: -1 } },
    { key: { userId: 1, company: 1 } },
    { key: { userId: 1, isArchived: 1 } },
    { key: { 'contacts.email': 1 } }
  ],
  coverletters: [
    { key: { userId: 1, status: 1 } },
    { key: { userId: 1, createdAt: -1 } },
    { key: { 'metadata.targetCompany': 1 } },
    { key: { 'metadata.keywords': 1 } },
    { key: { 'metadata.isPublic': 1, 'metadata.lastModified': -1 } }
  ],
  templates: [
    { key: { name: 1 }, options: { unique: true } },
    { key: { category: 1 } },
    { key: { isActive: 1 } },
    { key: { isPremium: 1 } }
  ],
  snippets: [
    { key: { userId: 1, category: 1 } },
    { key: { category: 1 } },
    { key: { isPublic: 1 } },
    { key: { tags: 1 } }
  ]
};

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

async function testConnection() {
  console.log('🔍 Testing MongoDB connection...');
  
  const command = `mongosh "${MONGODB_URI}" --eval "db.runCommand({ping: 1})" --quiet`;
  
  try {
    await executeCommand(command);
    console.log('✅ MongoDB connection successful');
    return true;
  } catch (error) {
    console.error('❌ MongoDB connection failed');
    return false;
  }
}

async function createCollections() {
  console.log('\n📁 Creating collections...');
  
  for (const collection of COLLECTIONS) {
    try {
      const command = `mongosh "${MONGODB_URI}" --eval "db.createCollection('${collection}')" --quiet`;
      await executeCommand(command);
      console.log(`✅ Created collection: ${collection}`);
    } catch (error) {
      console.warn(`⚠️ Collection ${collection} might already exist`);
    }
  }
}

async function createIndexes() {
  console.log('\n🔍 Creating indexes...');
  
  for (const [collection, indexes] of Object.entries(INDEXES)) {
    console.log(`\n📊 Creating indexes for ${collection}...`);
    
    for (const index of indexes) {
      try {
        const keyStr = JSON.stringify(index.key);
        const optionsStr = index.options ? JSON.stringify(index.options) : '{}';
        const command = `mongosh "${MONGODB_URI}" --eval "db.${collection}.createIndex(${keyStr}, ${optionsStr})" --quiet`;
        await executeCommand(command);
        console.log(`✅ Created index: ${JSON.stringify(index.key)}`);
      } catch (error) {
        console.warn(`⚠️ Index might already exist for ${collection}: ${JSON.stringify(index.key)}`);
      }
    }
  }
}

async function insertSampleData() {
  console.log('\n📊 Inserting sample data...');
  
  // Sample user
  const sampleUser = {
    email: "admin@cvcircle.com",
    password: "$2a$12$hashedpasswordhere",
    firstName: "Admin",
    lastName: "User",
    isEmailVerified: true,
    subscription: {
      plan: "basic",
      status: "active",
      startDate: new Date(),
      seats: 3,
      storageUsed: 0
    },
    settings: {
      theme: "auto",
      notifications: {
        email: true,
        push: true
      }
    },
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  try {
    const userCommand = `mongosh "${MONGODB_URI}" --eval "db.users.insertOne(${JSON.stringify(sampleUser)})" --quiet`;
    await executeCommand(userCommand);
    console.log('✅ Inserted sample user');
  } catch (error) {
    console.warn('⚠️ Could not insert sample user (might already exist)');
  }
  
  // Sample template
  const sampleTemplate = {
    name: "Modern Professional",
    description: "A clean and modern CV template",
    category: "professional",
    isActive: true,
    isPremium: false,
    sections: [
      { id: "header", type: "header", title: "Header", required: true, order: 1 },
      { id: "experience", type: "section", title: "Experience", required: false, order: 2 },
      { id: "education", type: "section", title: "Education", required: false, order: 3 },
      { id: "skills", type: "section", title: "Skills", required: false, order: 4 }
    ],
    styling: {
      primaryColor: "#84cc16",
      secondaryColor: "#22c55e",
      fontFamily: "Inter",
      fontSize: "medium",
      spacing: 1.5
    },
    metadata: {
      version: "1.0",
      author: "CV Circle",
      tags: ["professional", "modern"],
      usageCount: 0
    },
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  try {
    const templateCommand = `mongosh "${MONGODB_URI}" --eval "db.templates.insertOne(${JSON.stringify(sampleTemplate)})" --quiet`;
    await executeCommand(templateCommand);
    console.log('✅ Inserted sample template');
  } catch (error) {
    console.warn('⚠️ Could not insert sample template (might already exist)');
  }
}

async function verifySetup() {
  console.log('\n🔍 Verifying setup...');
  
  try {
    // Check collections
    const collectionsCommand = `mongosh "${MONGODB_URI}" --eval "db.getCollectionNames()" --quiet`;
    const collections = await executeCommand(collectionsCommand);
    console.log('📁 Collections:', collections.trim());
    
    // Check indexes
    for (const collection of COLLECTIONS) {
      const indexesCommand = `mongosh "${MONGODB_URI}" --eval "db.${collection}.getIndexes()" --quiet`;
      const indexes = await executeCommand(indexesCommand);
      console.log(`🔍 Indexes for ${collection}:`, indexes.trim().split('\n').length - 1, 'indexes');
    }
    
    // Check sample data
    const userCountCommand = `mongosh "${MONGODB_URI}" --eval "db.users.countDocuments()" --quiet`;
    const userCount = await executeCommand(userCountCommand);
    console.log('👥 Users count:', userCount.trim());
    
    const templateCountCommand = `mongosh "${MONGODB_URI}" --eval "db.templates.countDocuments()" --quiet`;
    const templateCount = await executeCommand(templateCountCommand);
    console.log('📄 Templates count:', templateCount.trim());
    
  } catch (error) {
    console.error('❌ Error verifying setup:', error.message);
  }
}

async function main() {
  console.log('🚀 Setting up MongoDB for CV Circle...\n');
  
  // Check if MongoDB tools are installed
  try {
    await executeCommand('mongosh --version');
  } catch (error) {
    console.error('❌ MongoDB Shell not found.');
    console.log('📥 Please install MongoDB Database Tools:');
    console.log('   https://www.mongodb.com/try/download/database-tools');
    process.exit(1);
  }
  
  // Test connection
  const connectionOk = await testConnection();
  if (!connectionOk) {
    console.error('❌ Cannot proceed without database connection.');
    console.log('💡 Please check your MONGODB_URI environment variable.');
    process.exit(1);
  }
  
  // Create collections
  await createCollections();
  
  // Create indexes
  await createIndexes();
  
  // Insert sample data
  await insertSampleData();
  
  // Verify setup
  await verifySetup();
  
  console.log('\n✅ MongoDB setup completed successfully!');
  console.log('\n📋 Next steps:');
  console.log('1. Test your application with the new database');
  console.log('2. Update your Vercel environment variables if needed');
  console.log('3. Run: npm run test-deployment');
}

// Command line interface
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
MongoDB Setup Script

Usage:
  node scripts/setup-mongodb.js [options]

Options:
  --help, -h          Show this help message
  --test-connection   Test connection only
  --create-collections Create collections only
  --create-indexes    Create indexes only
  --sample-data       Insert sample data only

Environment Variables:
  MONGODB_URI         MongoDB connection string

Example:
  MONGODB_URI="mongodb+srv://user:pass@cluster.mongodb.net/cvcircle" \\
  node scripts/setup-mongodb.js
    `);
    process.exit(0);
  }
  
  if (args.includes('--test-connection')) {
    testConnection().then(() => console.log('✅ Connection test completed'));
    return;
  }
  
  main().catch(console.error);
}

module.exports = { 
  testConnection, 
  createCollections, 
  createIndexes, 
  insertSampleData, 
  verifySetup 
}; 