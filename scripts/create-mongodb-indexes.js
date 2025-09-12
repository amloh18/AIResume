const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

// MongoDB connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Create indexes for User collection
const createUserIndexes = async () => {
  try {
    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');
    
    console.log('🔍 Creating indexes for users collection...');
    
    // Create unique index on firebaseUid
    await usersCollection.createIndex(
      { firebaseUid: 1 }, 
      { 
        unique: true, 
        sparse: true,
        name: 'firebaseUid_unique_sparse'
      }
    );
    console.log('✅ Created unique sparse index on firebaseUid');
    
    // Create unique index on email
    await usersCollection.createIndex(
      { email: 1 }, 
      { 
        unique: true,
        name: 'email_unique'
      }
    );
    console.log('✅ Created unique index on email');
    
    // Create unique sparse index on username
    await usersCollection.createIndex(
      { username: 1 }, 
      { 
        unique: true, 
        sparse: true,
        name: 'username_unique_sparse'
      }
    );
    console.log('✅ Created unique sparse index on username');
    
    // Create index on subscription status
    await usersCollection.createIndex(
      { 'subscription.status': 1 },
      { name: 'subscription_status' }
    );
    console.log('✅ Created index on subscription.status');
    
    console.log('🎉 All indexes created successfully!');
    
  } catch (error) {
    console.error('❌ Error creating indexes:', error);
    throw error;
  }
};

// List existing indexes
const listIndexes = async () => {
  try {
    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');
    
    console.log('📋 Current indexes on users collection:');
    const indexes = await usersCollection.indexes();
    indexes.forEach(index => {
      console.log(`  - ${index.name}: ${JSON.stringify(index.key)}`);
    });
    
  } catch (error) {
    console.error('❌ Error listing indexes:', error);
  }
};

// Main function
const main = async () => {
  try {
    await connectDB();
    await listIndexes();
    await createUserIndexes();
    await listIndexes();
  } catch (error) {
    console.error('❌ Script failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
    process.exit(0);
  }
};

// Run the script
main();
