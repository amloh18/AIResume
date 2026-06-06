import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

async function fixUserIndex() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('❌ MONGODB_URI environment variable is not set in .env.local');
    process.exit(1);
  }

  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to database');

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection object is undefined');
    }

    const collection = db.collection('users');

    console.log('🔍 Listing existing indexes on users collection...');
    const indexes = await collection.indexes();
    console.log('Current indexes:', JSON.stringify(indexes, null, 2));

    const hasRestrictiveIndex = indexes.some(idx => idx.name === 'authProviderId_1');

    if (hasRestrictiveIndex) {
      console.log('🗑️ Dropping restrictive unique index authProviderId_1...');
      await collection.dropIndex('authProviderId_1');
      console.log('✅ Index authProviderId_1 dropped successfully');
    } else {
      console.log('ℹ️ Index authProviderId_1 was not found on the collection');
    }

    console.log('🏗️ Creating new sparse unique index for authProviderId...');
    await collection.createIndex({ authProviderId: 1 }, { unique: true, sparse: true, name: 'authProviderId_1' });
    console.log('✅ New sparse unique index authProviderId_1 created successfully');

    // Also let's check compound index
    const hasCompoundIndex = indexes.some(idx => idx.name === 'authProvider_1_authProviderId_1');
    if (!hasCompoundIndex) {
      console.log('🏗️ Creating compound index { authProvider: 1, authProviderId: 1 }...');
      await collection.createIndex({ authProvider: 1, authProviderId: 1 }, { name: 'authProvider_1_authProviderId_1' });
      console.log('✅ Compound index created successfully');
    }

    console.log('🔍 Listing updated indexes...');
    const updatedIndexes = await collection.indexes();
    console.log('Updated indexes:', JSON.stringify(updatedIndexes, null, 2));

  } catch (error) {
    console.error('❌ Error during index migration:', error);
  } finally {
    await mongoose.disconnect();
    console.log('ℹ️ Disconnected from MongoDB');
  }
}

fixUserIndex();
