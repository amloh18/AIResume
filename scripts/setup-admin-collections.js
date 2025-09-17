// Script to setup admin collections by creating them in cvcircle first, then moving
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function setupAdminCollections() {
  try {
    console.log('🚀 Setting up Admin Collections...');
    
    // Connect to cvcircle database first
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to cvcircle database');
    
    const db = mongoose.connection.db;
    console.log('📊 Database:', db.databaseName);
    
    // Admin collections to setup
    const adminCollections = [
      'templates',
      'invoices', 
      'newsletters',
      'discountcodes',
      'paymentmethods',
      'aiusagelogs',
      'testimonials',
      'pricingplans',
      'subscriptions'
    ];
    
    console.log('\n🔧 Setting up admin collections in cvcircle database...');
    
    for (const collectionName of adminCollections) {
      try {
        const collection = db.collection(collectionName);
        const count = await collection.countDocuments();
        
        console.log(`  📦 ${collectionName}: ${count} documents`);
        
        // Create indexes for admin collections
        if (collectionName === 'templates') {
          await collection.createIndex({ name: 1 }, { unique: true });
          await collection.createIndex({ isActive: 1 });
          await collection.createIndex({ category: 1 });
          console.log(`    ✅ Created indexes for ${collectionName}`);
        } else if (collectionName === 'discountcodes') {
          await collection.createIndex({ code: 1 }, { unique: true });
          await collection.createIndex({ isActive: 1 });
          await collection.createIndex({ validUntil: 1 });
          console.log(`    ✅ Created indexes for ${collectionName}`);
        } else if (collectionName === 'newsletters') {
          await collection.createIndex({ email: 1 }, { unique: true });
          await collection.createIndex({ isActive: 1 });
          console.log(`    ✅ Created indexes for ${collectionName}`);
        } else if (collectionName === 'testimonials') {
          await collection.createIndex({ isActive: 1 });
          await collection.createIndex({ starRating: 1 });
          console.log(`    ✅ Created indexes for ${collectionName}`);
        } else if (collectionName === 'pricingplans') {
          await collection.createIndex({ key: 1 }, { unique: true });
          await collection.createIndex({ status: 1 });
          await collection.createIndex({ sortOrder: 1 });
          console.log(`    ✅ Created indexes for ${collectionName}`);
        } else if (collectionName === 'invoices') {
          await collection.createIndex({ userId: 1 });
          await collection.createIndex({ status: 1 });
          await collection.createIndex({ createdAt: -1 });
          console.log(`    ✅ Created indexes for ${collectionName}`);
        } else if (collectionName === 'paymentmethods') {
          await collection.createIndex({ userId: 1 });
          await collection.createIndex({ isActive: 1 });
          console.log(`    ✅ Created indexes for ${collectionName}`);
        } else if (collectionName === 'subscriptions') {
          await collection.createIndex({ userId: 1 });
          await collection.createIndex({ status: 1 });
          console.log(`    ✅ Created indexes for ${collectionName}`);
        } else if (collectionName === 'aiusagelogs') {
          await collection.createIndex({ userId: 1 });
          await collection.createIndex({ createdAt: -1 });
          console.log(`    ✅ Created indexes for ${collectionName}`);
        }
        
      } catch (error) {
        console.log(`  ❌ Error with ${collectionName}:`, error.message);
      }
    }
    
    // List all collections
    console.log('\n📋 All collections in cvcircle database:');
    const allCollections = await db.listCollections().toArray();
    allCollections.forEach(col => {
      console.log(`  - ${col.name}`);
    });
    
    console.log('\n✅ Admin collections setup completed');
    console.log('\n📝 Next Steps:');
    console.log('1. Update admin APIs to use admin database connection');
    console.log('2. Create admin database connection utility');
    console.log('3. Test admin functionality');
    
  } catch (error) {
    console.error('❌ Error setting up admin collections:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from database');
  }
}

setupAdminCollections();
