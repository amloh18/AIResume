// Script to identify admin-related tables in cvcircle database
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function identifyAdminTables() {
  try {
    console.log('🔍 Identifying Admin-Related Tables...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Check current database
    const currentDb = mongoose.connection.db.databaseName;
    console.log('📊 Currently connected to:', currentDb);
    
    const db = mongoose.connection.db;
    
    // List all collections
    const collections = await db.listCollections().toArray();
    console.log('\n📋 All collections in cvcircle database:');
    
    const adminCollections = [];
    const userCollections = [];
    
    for (const col of collections) {
      const collectionName = col.name;
      const collection = db.collection(collectionName);
      const count = await collection.countDocuments();
      
      console.log(`  - ${collectionName}: ${count} documents`);
      
      // Categorize collections
      if (isAdminCollection(collectionName)) {
        adminCollections.push({ name: collectionName, count });
      } else {
        userCollections.push({ name: collectionName, count });
      }
    }
    
    console.log('\n🔍 Admin Collections (should move to admin database):');
    adminCollections.forEach(col => {
      console.log(`  ✅ ${col.name}: ${col.count} documents`);
    });
    
    console.log('\n👤 User Collections (stay in cvcircle database):');
    userCollections.forEach(col => {
      console.log(`  ✅ ${col.name}: ${col.count} documents`);
    });
    
    console.log('\n📝 Summary:');
    console.log(`  Admin collections to move: ${adminCollections.length}`);
    console.log(`  User collections to keep: ${userCollections.length}`);
    
  } catch (error) {
    console.error('❌ Error identifying admin tables:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from database');
  }
}

function isAdminCollection(collectionName) {
  const adminCollections = [
    'discountcodes',
    'newsletters', 
    'testimonials',
    'pricingplans',
    'templates',
    'betasignups',
    'aiusagelogs',
    'invoices',
    'subscriptions',
    'paymentmethods'
  ];
  
  return adminCollections.includes(collectionName);
}

identifyAdminTables();
