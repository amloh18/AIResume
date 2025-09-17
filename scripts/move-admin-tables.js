// Script to move admin tables from cvcircle to admin database
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function moveAdminTables() {
  try {
    console.log('🚀 Moving Admin Tables to Admin Database...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Get source database (cvcircle)
    const sourceDb = mongoose.connection.db;
    console.log('📊 Source database:', sourceDb.databaseName);
    
    // Create admin database connection
    const adminDbUri = process.env.MONGODB_URI.includes('/cvcircle')
      ? process.env.MONGODB_URI.replace('/cvcircle', '/cvcircle_admin')
      : process.env.MONGODB_URI + '/cvcircle_admin';
    const adminClient = new mongoose.mongo.MongoClient(adminDbUri);
    await adminClient.connect();
    const adminDb = adminClient.db('cvcircle_admin');
    console.log('📊 Target database: cvcircle_admin');
    
    // Admin collections to move
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
    
    console.log('\n🔧 Moving admin collections...');
    
    for (const collectionName of adminCollections) {
      try {
        console.log(`\n📦 Processing ${collectionName}...`);
        
        // Check if collection exists in source
        const sourceCollections = await sourceDb.listCollections({ name: collectionName }).toArray();
        if (sourceCollections.length === 0) {
          console.log(`  ⚠️  Collection ${collectionName} not found in source database`);
          continue;
        }
        
        // Get source collection
        const sourceCollection = sourceDb.collection(collectionName);
        const count = await sourceCollection.countDocuments();
        
        if (count === 0) {
          console.log(`  ℹ️  Collection ${collectionName} is empty, creating empty collection in admin database`);
          await adminDb.createCollection(collectionName);
          continue;
        }
        
        console.log(`  📊 Found ${count} documents in ${collectionName}`);
        
        // Get all documents from source
        const documents = await sourceCollection.find({}).toArray();
        
        // Insert documents into admin database
        if (documents.length > 0) {
          await adminDb.collection(collectionName).insertMany(documents);
          console.log(`  ✅ Moved ${documents.length} documents to admin database`);
        }
        
        // Copy indexes
        const indexes = await sourceCollection.indexes();
        const adminCollection = adminDb.collection(collectionName);
        
        for (const index of indexes) {
          if (index.name !== '_id_') { // Skip default _id index
            try {
              await adminCollection.createIndex(index.key, {
                unique: index.unique || false,
                expireAfterSeconds: index.expireAfterSeconds || undefined
              });
              console.log(`  ✅ Created index: ${index.name}`);
            } catch (indexError) {
              if (indexError.code === 85) {
                console.log(`  ℹ️  Index ${index.name} already exists`);
              } else {
                console.log(`  ⚠️  Index creation warning: ${indexError.message}`);
              }
            }
          }
        }
        
        // Verify the move
        const adminCount = await adminCollection.countDocuments();
        console.log(`  ✅ Verification: ${adminCount} documents in admin database`);
        
      } catch (error) {
        console.log(`  ❌ Error moving ${collectionName}:`, error.message);
      }
    }
    
    // List collections in both databases
    console.log('\n📋 Collections in cvcircle database (after move):');
    const cvcircleCollections = await sourceDb.listCollections().toArray();
    cvcircleCollections.forEach(col => {
      console.log(`  - ${col.name}`);
    });
    
    console.log('\n📋 Collections in admin database:');
    const adminCollectionsList = await adminDb.listCollections().toArray();
    adminCollectionsList.forEach(col => {
      console.log(`  - ${col.name}`);
    });
    
    await adminClient.close();
    
    console.log('\n✅ Admin tables migration completed');
    console.log('\n📝 Next Steps:');
    console.log('1. Update admin APIs to use admin database');
    console.log('2. Update database connection logic');
    console.log('3. Test admin functionality');
    
  } catch (error) {
    console.error('❌ Error moving admin tables:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from database');
  }
}

moveAdminTables();
