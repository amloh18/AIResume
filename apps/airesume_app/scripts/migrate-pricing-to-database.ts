/**
 * Migration script to populate PriceRegions and CountryMappings collections
 * from the existing REGIONAL_PRICING constant
 */

import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

// Import models after environment is loaded
import PriceRegion from '../src/models/PriceRegion';
import CountryMapping from '../src/models/CountryMapping';

// Helper to extract numeric value from price string
function extractNumericPrice(priceString: string): number {
  if (!priceString) return 0;
  let cleaned = priceString.replace(/[^\d.,]/g, '');
  cleaned = cleaned.replace(/,/g, '');
  return parseFloat(cleaned) || 0;
}

// EU countries list
const EU_COUNTRIES = [
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
  'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
  'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE'
];

async function migratePricingToDatabase() {
  try {
    console.log('🔄 Starting pricing migration to database...');
    
    // Connect directly to MongoDB
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is not set');
    }
    
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to database');

    // Step 1: Create PriceRegions
    console.log('\n📝 Creating PriceRegions...');
    
    const priceRegions = [
      {
        regionId: 'GBP_DEFAULT',
        isDefault: true,
        currency: 'GBP',
        currencySymbol: '£',
        plans: {
          dayPass: 1.99,
          monthly: 9.99,
          quarterly: 24.99,
          yearly: 89.99,
        },
      },
      {
        regionId: 'USD_1',
        isDefault: false,
        currency: 'USD',
        currencySymbol: '$',
        plans: {
          dayPass: 2.99,
          monthly: 12.99,
          quarterly: 34.99,
          yearly: 119.99,
        },
      },
      {
        regionId: 'CAD_AUD_1',
        isDefault: false,
        currency: 'CAD',
        currencySymbol: '$',
        plans: {
          dayPass: 3.49,
          monthly: 14.99,
          quarterly: 39.99,
          yearly: 149.99,
        },
      },
      {
        regionId: 'EUR_1',
        isDefault: false,
        currency: 'EUR',
        currencySymbol: '€',
        plans: {
          dayPass: 2.49,
          monthly: 11.99,
          quarterly: 29.99,
          yearly: 109.99,
        },
      },
      {
        regionId: 'PLN_1',
        isDefault: false,
        currency: 'PLN',
        currencySymbol: 'zł',
        plans: {
          dayPass: 7.99,
          monthly: 39.99,
          quarterly: 99.99,
          yearly: 359.99,
        },
      },
      {
        regionId: 'INR_1',
        isDefault: false,
        currency: 'INR',
        currencySymbol: '₹',
        plans: {
          dayPass: 49,
          monthly: 199,
          quarterly: 549,
          yearly: 1999,
        },
      },
      {
        regionId: 'PKR_1',
        isDefault: false,
        currency: 'PKR',
        currencySymbol: '₨',
        plans: {
          dayPass: 99,
          monthly: 449,
          quarterly: 1199,
          yearly: 3999,
        },
      },
    ];

    // Upsert PriceRegions
    for (const region of priceRegions) {
      await PriceRegion.findOneAndUpdate(
        { regionId: region.regionId },
        region,
        { upsert: true, new: true }
      );
      console.log(`  ✅ Created/Updated PriceRegion: ${region.regionId} (${region.currency})`);
    }

    // Step 2: Create CountryMappings
    console.log('\n📝 Creating CountryMappings...');

    // Remove PL from EU countries since it has its own PLN pricing
    const euCountriesWithoutPL = EU_COUNTRIES.filter(code => code !== 'PL');
    
    const countryMappings = [
      // GBP
      { countryCode: 'GB', regionId: 'GBP_DEFAULT' },
      
      // USD
      { countryCode: 'US', regionId: 'USD_1' },
      
      // CAD/AUD (shared)
      { countryCode: 'CA', regionId: 'CAD_AUD_1' },
      { countryCode: 'AU', regionId: 'CAD_AUD_1' },
      
      // EUR (all EU countries except PL which has its own pricing)
      ...euCountriesWithoutPL.map(code => ({ countryCode: code, regionId: 'EUR_1' })),
      
      // PLN (Poland has its own pricing)
      { countryCode: 'PL', regionId: 'PLN_1' },
      
      // INR
      { countryCode: 'IN', regionId: 'INR_1' },
      
      // PKR
      { countryCode: 'PK', regionId: 'PKR_1' },
    ];

    // Upsert CountryMappings
    for (const mapping of countryMappings) {
      await CountryMapping.findOneAndUpdate(
        { countryCode: mapping.countryCode },
        mapping,
        { upsert: true, new: true }
      );
      console.log(`  ✅ Created/Updated CountryMapping: ${mapping.countryCode} → ${mapping.regionId}`);
    }

    // Step 3: Verify both collections have data
    console.log('\n🔍 Verifying data in both collections...');
    
    const priceRegionsCount = await PriceRegion.countDocuments();
    const countryMappingsCount = await CountryMapping.countDocuments();
    const defaultRegionCount = await PriceRegion.countDocuments({ isDefault: true });
    
    console.log(`   - PriceRegions collection: ${priceRegionsCount} documents`);
    console.log(`   - CountryMappings collection: ${countryMappingsCount} documents`);
    console.log(`   - Default regions: ${defaultRegionCount}`);
    
    // Verify we have the expected counts
    const expectedPriceRegions = priceRegions.length;
    const expectedCountryMappings = countryMappings.length;
    
    if (priceRegionsCount < expectedPriceRegions) {
      console.warn(`   ⚠️  Warning: Expected ${expectedPriceRegions} PriceRegions, found ${priceRegionsCount}`);
    }
    
    if (countryMappingsCount < expectedCountryMappings) {
      console.warn(`   ⚠️  Warning: Expected ${expectedCountryMappings} CountryMappings, found ${countryMappingsCount}`);
    }
    
    if (defaultRegionCount !== 1) {
      console.warn(`   ⚠️  Warning: Expected 1 default region, found ${defaultRegionCount}`);
    }
    
    // Verify all price regions exist
    console.log('\n📋 Verifying PriceRegions...');
    for (const region of priceRegions) {
      const exists = await PriceRegion.findOne({ regionId: region.regionId });
      if (exists) {
        console.log(`   ✅ ${region.regionId} exists`);
      } else {
        console.error(`   ❌ ${region.regionId} MISSING!`);
      }
    }
    
    // Verify all country mappings exist
    console.log('\n📋 Verifying CountryMappings...');
    const missingMappings: string[] = [];
    for (const mapping of countryMappings) {
      const exists = await CountryMapping.findOne({ countryCode: mapping.countryCode });
      if (exists) {
        // Verify the regionId matches
        if (exists.regionId === mapping.regionId) {
          console.log(`   ✅ ${mapping.countryCode} → ${mapping.regionId}`);
        } else {
          console.warn(`   ⚠️  ${mapping.countryCode} has wrong regionId: ${exists.regionId} (expected ${mapping.regionId})`);
        }
      } else {
        console.error(`   ❌ ${mapping.countryCode} MISSING!`);
        missingMappings.push(mapping.countryCode);
      }
    }
    
    // Final summary
    console.log('\n📊 Migration Summary:');
    console.log(`   ✅ PriceRegions: ${priceRegionsCount}/${expectedPriceRegions}`);
    console.log(`   ✅ CountryMappings: ${countryMappingsCount}/${expectedCountryMappings}`);
    console.log(`   ✅ Default Region: ${defaultRegionCount === 1 ? 'Set correctly' : 'ERROR - Multiple or no default!'}`);
    
    if (missingMappings.length > 0) {
      console.error(`\n   ❌ Missing CountryMappings: ${missingMappings.join(', ')}`);
      throw new Error(`Migration incomplete: ${missingMappings.length} country mappings missing`);
    }
    
    if (priceRegionsCount < expectedPriceRegions || countryMappingsCount < expectedCountryMappings) {
      console.warn('\n   ⚠️  Some data may be missing. Please review the warnings above.');
    } else {
      console.log('\n✅ Migration completed successfully!');
      console.log('   Both collections are fully populated.');
    }

    // Close database connection
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    // Close connection on error
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
    throw error;
  }
}

// Run migration if called directly
if (require.main === module) {
  migratePricingToDatabase()
    .then(() => {
      console.log('\n🎉 Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Migration script failed:', error);
      process.exit(1);
    });
}

export default migratePricingToDatabase;

