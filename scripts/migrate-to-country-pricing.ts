/**
 * Migration script to populate CountryPricing collection
 * from PriceRegion and CountryMapping collections
 * 
 * This creates one CountryPricing record per country with all 5 plan prices
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
import { getAdminPricingPlan } from '../src/models/admin-models';
import { COUNTRY_NAMES } from '../src/lib/config/adminConstants';

async function migrateToCountryPricing() {
  try {
    console.log('🔄 Starting CountryPricing migration...');
    
    // Connect directly to MongoDB
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is not set');
    }
    
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to database');

    // Step 1: Get all PriceRegions
    console.log('\n📝 Fetching PriceRegions...');
    const priceRegions = await PriceRegion.find({});
    console.log(`   Found ${priceRegions.length} price regions`);

    // Step 2: Get all CountryMappings
    console.log('\n📝 Fetching CountryMappings...');
    const countryMappings = await CountryMapping.find({});
    console.log(`   Found ${countryMappings.length} country mappings`);

    // Step 3: Get all PricingPlans to get their IDs
    console.log('\n📝 Fetching PricingPlans...');
    const PricingPlan = await getAdminPricingPlan();
    const plans = await PricingPlan.find({ status: 'active' });
    console.log(`   Found ${plans.length} pricing plans`);

    // Create a map of plan keys to plan IDs
    const planMap: Record<string, mongoose.Types.ObjectId> = {};
    for (const plan of plans) {
      planMap[plan.key] = plan._id;
    }

    console.log('\n📋 Plan mapping:');
    Object.entries(planMap).forEach(([key, id]) => {
      console.log(`   ${key}: ${id}`);
    });

    // Verify we have all required plans
    const requiredPlans = ['free', 'day_pass', 'pro_monthly', 'pro_quarterly', 'pro_yearly'];
    const missingPlans = requiredPlans.filter(key => !planMap[key]);
    if (missingPlans.length > 0) {
      throw new Error(`Missing required plans: ${missingPlans.join(', ')}`);
    }

    // Step 4: Create CountryPricing records
    console.log('\n📝 Creating CountryPricing records...');
    let created = 0;
    let updated = 0;
    let errors = 0;

    for (const mapping of countryMappings) {
      try {
        // Find the PriceRegion for this country
        const priceRegion = priceRegions.find(pr => pr.regionId === mapping.regionId);
        
        if (!priceRegion) {
          console.warn(`   ⚠️  PriceRegion not found for regionId: ${mapping.regionId} (country: ${mapping.countryCode})`);
          errors++;
          continue;
        }

        // Get country name from COUNTRY_NAMES
        const countryName = COUNTRY_NAMES[mapping.countryCode] || mapping.countryCode;

        // Get existing stripePriceId and razorpayPlanId from plans if available
        // We'll try to get them from the plan's regionalPricing or default fields
        const stripePriceIds: any = {};
        const razorpayPlanIds: any = {};

        // Try to get provider IDs from plans
        const dayPassPlan = plans.find((p: any) => p.key === 'day_pass');
        const monthlyPlan = plans.find((p: any) => p.key === 'pro_monthly');
        const quarterlyPlan = plans.find((p: any) => p.key === 'pro_quarterly');
        const yearlyPlan = plans.find((p: any) => p.key === 'pro_yearly');

        if (dayPassPlan) {
          stripePriceIds.dayPass = dayPassPlan.stripePriceId_one_time;
          razorpayPlanIds.dayPass = dayPassPlan.razorpayPlanId_monthly; // Use monthly as fallback
        }
        if (monthlyPlan) {
          stripePriceIds.monthly = monthlyPlan.stripePriceId_monthly;
          razorpayPlanIds.monthly = monthlyPlan.razorpayPlanId_monthly;
        }
        if (quarterlyPlan) {
          stripePriceIds.quarterly = quarterlyPlan.stripePriceId_quarterly;
          razorpayPlanIds.quarterly = quarterlyPlan.razorpayPlanId_quarterly;
        }
        if (yearlyPlan) {
          stripePriceIds.yearly = yearlyPlan.stripePriceId_yearly;
          razorpayPlanIds.yearly = yearlyPlan.razorpayPlanId_yearly;
        }

        // Create CountryPricing document
        const countryPricingData = {
          countryCode: mapping.countryCode,
          countryName: countryName,
          currency: priceRegion.currency,
          currencySymbol: priceRegion.currencySymbol,
          regionId: priceRegion.regionId,
          planPrices: {
            free: {
              price: 0, // Free plan is always 0
              planId: planMap['free']
            },
            dayPass: {
              price: priceRegion.plans.dayPass,
              planId: planMap['day_pass']
            },
            monthly: {
              price: priceRegion.plans.monthly,
              planId: planMap['pro_monthly']
            },
            quarterly: {
              price: priceRegion.plans.quarterly,
              planId: planMap['pro_quarterly']
            },
            yearly: {
              price: priceRegion.plans.yearly,
              planId: planMap['pro_yearly']
            }
          },
          stripePriceIds: Object.keys(stripePriceIds).length > 0 ? stripePriceIds : undefined,
          razorpayPlanIds: Object.keys(razorpayPlanIds).length > 0 ? razorpayPlanIds : undefined
        };

        // Upsert the CountryPricing record
        const result = await CountryPricing.findOneAndUpdate(
          { countryCode: mapping.countryCode },
          countryPricingData,
          { upsert: true, new: true }
        );

        if (result.isNew) {
          created++;
          console.log(`   ✅ Created: ${mapping.countryCode} (${countryName}) - ${priceRegion.currency} ${priceRegion.plans.monthly}`);
        } else {
          updated++;
          console.log(`   🔄 Updated: ${mapping.countryCode} (${countryName}) - ${priceRegion.currency} ${priceRegion.plans.monthly}`);
        }
      } catch (error) {
        console.error(`   ❌ Error processing ${mapping.countryCode}:`, error);
        errors++;
      }
    }

    // Step 5: Summary
    console.log('\n📊 Migration Summary:');
    console.log(`   ✅ Created: ${created} records`);
    console.log(`   🔄 Updated: ${updated} records`);
    console.log(`   ❌ Errors: ${errors} records`);

    // Step 6: Verify
    console.log('\n🔍 Verifying CountryPricing collection...');
    const totalCountryPricing = await CountryPricing.countDocuments();
    console.log(`   Total CountryPricing records: ${totalCountryPricing}`);

    if (totalCountryPricing === countryMappings.length) {
      console.log('   ✅ All countries have pricing records');
    } else {
      console.warn(`   ⚠️  Expected ${countryMappings.length} records, found ${totalCountryPricing}`);
    }

    // Sample a few records to verify structure
    console.log('\n📋 Sample CountryPricing records:');
    const samples = await CountryPricing.find({}).limit(3);
    for (const sample of samples) {
      console.log(`   ${sample.countryCode} (${sample.countryName}):`);
      console.log(`     Currency: ${sample.currency} ${sample.currencySymbol}`);
      console.log(`     Prices: Free=${sample.planPrices.free.price}, DayPass=${sample.planPrices.dayPass.price}, Monthly=${sample.planPrices.monthly.price}, Quarterly=${sample.planPrices.quarterly.price}, Yearly=${sample.planPrices.yearly.price}`);
    }

    console.log('\n✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from database');
  }
}

// Run migration
if (require.main === module) {
  migrateToCountryPricing()
    .then(() => {
      console.log('✅ Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration script failed:', error);
      process.exit(1);
    });
}

export default migrateToCountryPricing;

