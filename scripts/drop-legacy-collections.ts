/**
 * Script to drop legacy collections from MongoDB
 * 
 * This script identifies and drops legacy collections that are no longer in use.
 * 
 * Legacy collections identified:
 * - priceregions (migrated to countrypricings)
 * - countrymappings (migrated to countrypricings)
 * 
 * Usage:
 *   npx ts-node scripts/drop-legacy-collections.ts
 * 
 * WARNING: This will permanently delete collections. Make sure you have backups!
 */

import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

// Legacy collections to drop (collection names in MongoDB)
const LEGACY_COLLECTIONS = [
  'priceregions',      // Migrated to countrypricings
  'countrymappings',   // Migrated to countrypricings
];

async function dropLegacyCollections() {
  try {
    console.log('🧹 Starting legacy collection cleanup...\n');
    
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is not set');
    }
    
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to database\n');
    
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not available');
    }
    
    // Get all collections in the database
    const allCollections = await db.listCollections().toArray();
    const collectionNames = allCollections.map(col => col.name);
    
    console.log('📊 Current collections in database:');
    collectionNames.forEach(name => {
      console.log(`   - ${name}`);
    });
    console.log('');
    
    // Identify legacy collections that exist
    const collectionsToDrop: string[] = [];
    const collectionsNotFound: string[] = [];
    
    for (const legacyCollection of LEGACY_COLLECTIONS) {
      if (collectionNames.includes(legacyCollection)) {
        // Check document count
        const count = await db.collection(legacyCollection).countDocuments();
        console.log(`🔍 Found legacy collection: ${legacyCollection} (${count} documents)`);
        collectionsToDrop.push(legacyCollection);
      } else {
        collectionsNotFound.push(legacyCollection);
        console.log(`ℹ️  Legacy collection not found: ${legacyCollection} (may already be dropped)`);
      }
    }
    
    console.log('');
    
    if (collectionsToDrop.length === 0) {
      console.log('✅ No legacy collections found to drop. All clean!');
      return;
    }
    
    // Verify CountryPricing has data (safety check)
    if (collectionsToDrop.some(col => col === 'priceregions' || col === 'countrymappings')) {
      const countryPricingCount = await db.collection('countrypricings').countDocuments();
      console.log(`🔍 Verifying CountryPricing collection: ${countryPricingCount} documents`);
      
      if (countryPricingCount === 0) {
        console.error('\n❌ ERROR: CountryPricing collection is empty!');
        console.error('   Cannot drop legacy collections without migrated data.');
        console.error('   Please run the migration script first:');
        console.error('   npx ts-node scripts/migrate-to-country-pricing.ts');
        throw new Error('CountryPricing collection is empty - migration required');
      }
      
      console.log('✅ CountryPricing collection has data - safe to proceed\n');
    }
    
    // Confirm deletion
    console.log('⚠️  WARNING: This will permanently delete the following collections:');
    for (const collection of collectionsToDrop) {
      const count = await db.collection(collection).countDocuments();
      console.log(`   - ${collection} (${count} documents)`);
    }
    console.log('');
    console.log('   These collections have been migrated to: countrypricings');
    console.log('   The data is safe in the new collection.\n');
    
    // Drop collections
    console.log('🗑️  Dropping legacy collections...\n');
    
    for (const collection of collectionsToDrop) {
      try {
        await db.collection(collection).drop();
        console.log(`   ✅ Dropped collection: ${collection}`);
      } catch (error: any) {
        if (error.codeName === 'NamespaceNotFound') {
          console.log(`   ℹ️  Collection already dropped: ${collection}`);
        } else {
          console.error(`   ❌ Error dropping ${collection}:`, error.message);
          throw error;
        }
      }
    }
    
    // Verify cleanup
    console.log('\n🔍 Verifying cleanup...');
    const remainingCollections = await db.listCollections().toArray();
    const remainingNames = remainingCollections.map(col => col.name);
    
    let allDropped = true;
    for (const collection of collectionsToDrop) {
      if (remainingNames.includes(collection)) {
        console.log(`   ⚠️  Collection still exists: ${collection}`);
        allDropped = false;
      } else {
        console.log(`   ✅ Collection dropped: ${collection}`);
      }
    }
    
    if (allDropped) {
      console.log('\n✅ Cleanup completed successfully!');
      console.log('   All legacy collections have been removed.');
      console.log('   The system now uses countrypricings collection exclusively.');
    } else {
      console.warn('\n⚠️  Warning: Some collections may still exist.');
    }
    
    // Show final collection list
    console.log('\n📊 Remaining collections:');
    const finalCollections = await db.listCollections().toArray();
    finalCollections.forEach(col => {
      console.log(`   - ${col.name}`);
    });
    
  } catch (error) {
    console.error('\n❌ Cleanup failed:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from database');
  }
}

// Run cleanup if this file is executed directly
dropLegacyCollections()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });

export default dropLegacyCollections;

