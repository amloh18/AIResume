/**
 * Verification script to check that both PriceRegions and CountryMappings collections have data
 */

import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

// Import models after environment is loaded
import PriceRegion from '../src/models/PriceRegion';
import CountryMapping from '../src/models/CountryMapping';

async function verifyPricingData() {
  try {
    console.log('🔍 Verifying pricing data in database...\n');
    
    // Connect directly to MongoDB
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is not set');
    }
    
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to database\n');

    // Check PriceRegions collection
    console.log('📊 PriceRegions Collection:');
    const priceRegionsCount = await PriceRegion.countDocuments();
    const priceRegions = await PriceRegion.find({}).sort({ currency: 1, regionId: 1 });
    const defaultRegion = await PriceRegion.findOne({ isDefault: true });
    
    console.log(`   Total documents: ${priceRegionsCount}`);
    console.log(`   Default region: ${defaultRegion ? defaultRegion.regionId : 'NOT SET'}`);
    
    if (priceRegionsCount === 0) {
      console.error('   ❌ ERROR: PriceRegions collection is EMPTY!');
      console.error('   Run the migration script: npx ts-node scripts/migrate-pricing-to-database.ts');
      return false;
    }
    
    console.log('\n   Regions:');
    priceRegions.forEach(region => {
      console.log(`   - ${region.regionId} (${region.currency} ${region.currencySymbol})`);
      console.log(`     Day Pass: ${region.currencySymbol}${region.plans.dayPass}`);
      console.log(`     Monthly: ${region.currencySymbol}${region.plans.monthly}`);
      console.log(`     Quarterly: ${region.currencySymbol}${region.plans.quarterly}`);
      console.log(`     Yearly: ${region.currencySymbol}${region.plans.yearly}`);
      console.log(`     Default: ${region.isDefault ? 'Yes' : 'No'}`);
      console.log('');
    });
    
    // Check CountryMappings collection
    console.log('📊 CountryMappings Collection:');
    const countryMappingsCount = await CountryMapping.countDocuments();
    const countryMappings = await CountryMapping.find({}).sort({ countryCode: 1 });
    
    console.log(`   Total documents: ${countryMappingsCount}`);
    
    if (countryMappingsCount === 0) {
      console.error('   ❌ ERROR: CountryMappings collection is EMPTY!');
      console.error('   Run the migration script: npx ts-node scripts/migrate-pricing-to-database.ts');
      return false;
    }
    
    // Group by regionId to show which countries share pricing
    const regionGroups = new Map<string, string[]>();
    countryMappings.forEach(mapping => {
      if (!regionGroups.has(mapping.regionId)) {
        regionGroups.set(mapping.regionId, []);
      }
      regionGroups.get(mapping.regionId)!.push(mapping.countryCode);
    });
    
    console.log('\n   Mappings by Region:');
    const regionEntries = Array.from(regionGroups.entries());
    for (const [regionId, countries] of regionEntries) {
      const region = await PriceRegion.findOne({ regionId });
      const currency = region ? `${region.currency} ${region.currencySymbol}` : 'Unknown';
      console.log(`   - ${regionId} (${currency}): ${countries.length} countries`);
      console.log(`     Countries: ${countries.join(', ')}`);
    }
    
    // Verify all mappings point to valid regions
    console.log('\n🔍 Verifying data integrity...');
    let hasErrors = false;
    
    for (const mapping of countryMappings) {
      const region = await PriceRegion.findOne({ regionId: mapping.regionId });
      if (!region) {
        console.error(`   ❌ CountryMapping ${mapping.countryCode} points to invalid regionId: ${mapping.regionId}`);
        hasErrors = true;
      }
    }
    
    if (!hasErrors) {
      console.log('   ✅ All country mappings point to valid regions');
    }
    
    // Check for default region
    if (!defaultRegion) {
      console.error('   ❌ ERROR: No default region set!');
      hasErrors = true;
    } else if (defaultRegion.isDefault) {
      console.log(`   ✅ Default region set: ${defaultRegion.regionId}`);
    }
    
    // Summary
    console.log('\n📋 Summary:');
    console.log(`   ✅ PriceRegions: ${priceRegionsCount} documents`);
    console.log(`   ✅ CountryMappings: ${countryMappingsCount} documents`);
    console.log(`   ✅ Default Region: ${defaultRegion ? defaultRegion.regionId : 'MISSING'}`);
    
    if (hasErrors) {
      console.log('\n❌ Verification found errors. Please fix them.');
      return false;
    } else {
      console.log('\n✅ All checks passed! Both collections have data.');
      
      // Close database connection
      await mongoose.connection.close();
      console.log('\n🔌 Database connection closed');
      
      return true;
    }
    
  } catch (error) {
    console.error('❌ Verification failed:', error);
    // Close connection on error
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
    return false;
  }
}

// Run verification if called directly
if (require.main === module) {
  verifyPricingData()
    .then((success) => {
      if (success) {
        console.log('\n🎉 Verification completed successfully');
        process.exit(0);
      } else {
        console.log('\n💥 Verification found issues');
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('\n💥 Verification script failed:', error);
      process.exit(1);
    });
}

export default verifyPricingData;

