// Script to create admin database and collections with proper permissions
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function createAdminDatabase() {
  try {
    console.log('🚀 Creating Admin Database and Collections...');
    
    // Connect to MongoDB using the same connection but specify admin database
    const adminUri = process.env.MONGODB_URI.replace('/cvcircle', '/admin');
    await mongoose.connect(adminUri);
    console.log('✅ Connected to admin database');
    
    const db = mongoose.connection.db;
    console.log('📊 Database:', db.databaseName);
    
    // Create admin collections
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
    
    console.log('\n🔧 Creating admin collections...');
    
    for (const collectionName of adminCollections) {
      try {
        // Check if collection exists
        const collections = await db.listCollections({ name: collectionName }).toArray();
        
        if (collections.length === 0) {
          // Create collection
          await db.createCollection(collectionName);
          console.log(`  ✅ Created ${collectionName} collection`);
        } else {
          console.log(`  ℹ️  ${collectionName} collection already exists`);
        }
        
        // Create basic indexes
        const collection = db.collection(collectionName);
        
        // Create common indexes based on collection type
        if (collectionName === 'templates') {
          await collection.createIndex({ name: 1 }, { unique: true });
          await collection.createIndex({ isActive: 1 });
          await collection.createIndex({ category: 1 });
        } else if (collectionName === 'discountcodes') {
          await collection.createIndex({ code: 1 }, { unique: true });
          await collection.createIndex({ isActive: 1 });
          await collection.createIndex({ validUntil: 1 });
        } else if (collectionName === 'newsletters') {
          await collection.createIndex({ email: 1 }, { unique: true });
          await collection.createIndex({ isActive: 1 });
        } else if (collectionName === 'testimonials') {
          await collection.createIndex({ isActive: 1 });
          await collection.createIndex({ starRating: 1 });
        } else if (collectionName === 'pricingplans') {
          await collection.createIndex({ key: 1 }, { unique: true });
          await collection.createIndex({ status: 1 });
          await collection.createIndex({ sortOrder: 1 });
        } else if (collectionName === 'invoices') {
          await collection.createIndex({ userId: 1 });
          await collection.createIndex({ status: 1 });
          await collection.createIndex({ createdAt: -1 });
        } else if (collectionName === 'paymentmethods') {
          await collection.createIndex({ userId: 1 });
          await collection.createIndex({ isActive: 1 });
        } else if (collectionName === 'subscriptions') {
          await collection.createIndex({ userId: 1 });
          await collection.createIndex({ status: 1 });
        } else if (collectionName === 'aiusagelogs') {
          await collection.createIndex({ userId: 1 });
          await collection.createIndex({ createdAt: -1 });
        }
        
        console.log(`  ✅ Created indexes for ${collectionName}`);
        
      } catch (error) {
        console.log(`  ❌ Error with ${collectionName}:`, error.message);
      }
    }
    
    // List all collections in admin database
    console.log('\n📋 Collections in admin database:');
    const allCollections = await db.listCollections().toArray();
    allCollections.forEach(col => {
      console.log(`  - ${col.name}`);
    });
    
    console.log('\n✅ Admin database setup completed');
    
  } catch (error) {
    console.error('❌ Error creating admin database:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from database');
  }
}

createAdminDatabase();
