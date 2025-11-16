/**
 * Cleanup script to delete legacy pricing collections
 * 
 * This removes all data from PriceRegion and CountryMapping collections
 * since we've migrated to the normalized CountryPricing collection
 */

import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

// Import models after environment is loaded
import PriceRegion from '../src/models/PriceRegion';
import CountryMapping from '../src/models/CountryMapping';
import CountryPricing from '../src/models/CountryPricing';

async function cleanupLegacyCollections() {
  try {
    console.log('🧹 Starting cleanup of legacy pricing collections...');
    
    // Connect directly to MongoDB
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is not set');
    }
    
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to database');

    // Step 1: Verify CountryPricing has data
    console.log('\n🔍 Verifying CountryPricing collection...');
    const countryPricingCount = await CountryPricing.countDocuments();
    console.log(`   Found ${countryPricingCount} CountryPricing records`);
    
    if (countryPricingCount === 0) {
      console.error('❌ ERROR: CountryPricing collection is empty!');
      console.error('   Please run the migration script first: npx ts-node scripts/migrate-to-country-pricing.ts');
      throw new Error('CountryPricing collection is empty - migration required');
    }

    // Step 2: Count legacy collections
    console.log('\n📊 Counting legacy collections...');
    const priceRegionCount = await PriceRegion.countDocuments();
    const countryMappingCount = await CountryMapping.countDocuments();
    
    console.log(`   PriceRegion documents: ${priceRegionCount}`);
    console.log(`   CountryMapping documents: ${countryMappingCount}`);

    if (priceRegionCount === 0 && countryMappingCount === 0) {
      console.log('\n✅ Legacy collections are already empty. Nothing to clean up.');
      return;
    }

    // Step 3: Confirm deletion
    console.log('\n⚠️  WARNING: This will delete all data from:');
    console.log(`   - PriceRegion collection (${priceRegionCount} documents)`);
    console.log(`   - CountryMapping collection (${countryMappingCount} documents)`);
    console.log('\n   The data has been migrated to CountryPricing collection.');
    console.log('   Models will remain for backward compatibility.');

    // Step 4: Delete PriceRegion documents
    if (priceRegionCount > 0) {
      console.log('\n🗑️  Deleting PriceRegion documents...');
      const deleteResult = await PriceRegion.deleteMany({});
      console.log(`   ✅ Deleted ${deleteResult.deletedCount} PriceRegion documents`);
    }

    // Step 5: Delete CountryMapping documents
    if (countryMappingCount > 0) {
      console.log('\n🗑️  Deleting CountryMapping documents...');
      const deleteResult = await CountryMapping.deleteMany({});
      console.log(`   ✅ Deleted ${deleteResult.deletedCount} CountryMapping documents`);
    }

    // Step 6: Verify cleanup
    console.log('\n🔍 Verifying cleanup...');
    const remainingPriceRegions = await PriceRegion.countDocuments();
    const remainingCountryMappings = await CountryMapping.countDocuments();
    
    console.log(`   Remaining PriceRegion documents: ${remainingPriceRegions}`);
    console.log(`   Remaining CountryMapping documents: ${remainingCountryMappings}`);

    if (remainingPriceRegions === 0 && remainingCountryMappings === 0) {
      console.log('\n✅ Cleanup completed successfully!');
      console.log('   All legacy pricing data has been removed.');
      console.log('   The system now uses CountryPricing collection exclusively.');
    } else {
      console.warn('\n⚠️  Warning: Some documents may still exist.');
    }

  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from database');
  }
}

// Run cleanup
if (require.main === module) {
  cleanupLegacyCollections()
    .then(() => {
      console.log('✅ Cleanup script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Cleanup script failed:', error);
      process.exit(1);
    });
}

export default cleanupLegacyCollections;

