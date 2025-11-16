/**
 * Seed Pricing Plans with CountryPricing References
 * 
 * This script:
 * 1. Creates PricingPlans (without fixed prices)
 * 2. Creates/updates default CountryPricing (GB)
 * 3. Links PricingPlans to CountryPricing via defaultCountryPricingId
 * 
 * All prices and currency should come from CountryPricing collection
 */

import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

// Import models directly (avoid server-only imports)
import PricingPlan from '../src/models/PricingPlan';
import CountryPricing from '../src/models/CountryPricing';

// Default country pricing (GBP - UK)
const DEFAULT_COUNTRY_CODE = 'GB';
const DEFAULT_CURRENCY = 'GBP';
const DEFAULT_CURRENCY_SYMBOL = '£';

// Pricing plans data (without prices - prices come from CountryPricing)
const pricingPlansData = [
  {
    key: 'free',
    name: 'Free',
    description: 'Perfect for getting started with basic CV creation',
    billingCycle: 'one-time', // Free plan uses one-time (but price is 0)
    status: 'active',
    features: [
      '3 CVs',
      'Basic templates',
      'PDF export',
      'Email support'
    ],
    notIncludedFeatures: [
      'Cover letters',
      'Job tracking',
      'ATS optimization',
      'Priority support'
    ],
    isPopular: false,
    isBestValue: false,
    displayOnLanding: true,
    targetAudience: 'all',
    credits: {
      cvCredits: 3,
      exportCredits: 3,
      atsCheckCredits: 0,
      jobCredits: 1,
      resetSchedule: 'monthly'
    },
    storageLimit: 100,
    sortOrder: 1
  },
  {
    key: 'day_pass',
    name: 'Day Pass',
    description: 'One-day access to all premium features',
    billingCycle: 'one-time',
    status: 'active',
    features: [
      'Unlimited CVs for 24 hours',
      'All premium templates',
      'Cover letter generator',
      'Job tracking',
      'ATS optimization'
    ],
    notIncludedFeatures: [
      'Priority support',
      'Advanced analytics'
    ],
    isPopular: false,
    isBestValue: false,
    displayOnLanding: true,
    targetAudience: 'all',
    credits: {
      cvCredits: 5, // 5 CVs for day pass
      exportCredits: 5,
      atsCheckCredits: 5,
      jobCredits: 5,
      resetSchedule: 'one-time' // No reset for day pass
    },
    storageLimit: 1000,
    dayPassDuration: 24,
    durationInDays: 1,
    durationType: 'hour',
    sortOrder: 2
  },
  {
    key: 'pro_monthly',
    name: 'Professional Monthly',
    description: 'Full access to all features with monthly billing',
    billingCycle: 'monthly',
    status: 'active',
    features: [
      'Unlimited CVs',
      'All premium templates',
      'Cover letter generator',
      'Job tracking & management',
      'ATS optimization',
      'Priority support',
      'Advanced analytics'
    ],
    notIncludedFeatures: [],
    isPopular: true,
    isBestValue: false,
    displayOnLanding: true,
    targetAudience: 'all',
    credits: {
      cvCredits: -1, // Unlimited
      exportCredits: -1, // Unlimited
      atsCheckCredits: -1, // Unlimited
      jobCredits: -1, // Unlimited
      resetSchedule: 'monthly'
    },
    storageLimit: 5000,
    durationInDays: 30,
    durationType: 'day',
    sortOrder: 3
  },
  {
    key: 'pro_quarterly',
    name: 'Professional Quarterly',
    description: 'Full access to all features with quarterly billing',
    billingCycle: 'quarterly',
    status: 'active',
    features: [
      'Unlimited CVs',
      'All premium templates',
      'Cover letter generator',
      'Job tracking & management',
      'ATS optimization',
      'Priority support',
      'Advanced analytics'
    ],
    notIncludedFeatures: [],
    isPopular: false,
    isBestValue: true,
    displayOnLanding: true,
    targetAudience: 'all',
    credits: {
      cvCredits: -1, // Unlimited
      exportCredits: -1, // Unlimited
      atsCheckCredits: -1, // Unlimited
      jobCredits: -1, // Unlimited
      resetSchedule: 'quarterly'
    },
    storageLimit: 5000,
    durationInDays: 90,
    durationType: 'day',
    sortOrder: 4
  },
  {
    key: 'pro_yearly',
    name: 'Professional Yearly',
    description: 'Full access to all features with yearly billing',
    billingCycle: 'yearly',
    status: 'active',
    features: [
      'Unlimited CVs',
      'All premium templates',
      'Cover letter generator',
      'Job tracking & management',
      'ATS optimization',
      'Priority support',
      'Advanced analytics'
    ],
    notIncludedFeatures: [],
    isPopular: false,
    isBestValue: false,
    displayOnLanding: true,
    targetAudience: 'all',
    credits: {
      cvCredits: -1, // Unlimited
      exportCredits: -1, // Unlimited
      atsCheckCredits: -1, // Unlimited
      jobCredits: -1, // Unlimited
      resetSchedule: 'yearly'
    },
    storageLimit: 10000,
    durationInDays: 365,
    durationType: 'day',
    sortOrder: 5
  }
];

// Default country pricing prices (GBP)
const defaultCountryPricingPrices = {
  free: 0,
  dayPass: 1.99,
  monthly: 9.99,
  quarterly: 24.99,
  yearly: 89.99
};

async function seedPricingPlansWithCountryPricing() {
  try {
    console.log('🔄 Seeding pricing plans with CountryPricing references...');
    
    // Connect directly to MongoDB
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is not set');
    }
    
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to database');
    
    // Step 1: Create or update PricingPlans (without prices)
    console.log('\n📝 Step 1: Creating/Updating PricingPlans...');
    const planMap: Record<string, mongoose.Types.ObjectId> = {};
    
    for (const planData of pricingPlansData) {
      const existingPlan = await PricingPlan.findOne({ key: planData.key });
      
      if (existingPlan) {
        // Update existing plan (keep existing defaultCountryPricingId if set)
        await PricingPlan.findOneAndUpdate(
          { key: planData.key },
          { 
            ...planData,
            // Only update defaultCountryPricingId if it doesn't exist
            ...(existingPlan.defaultCountryPricingId ? {} : {})
          }
        );
        planMap[planData.key] = existingPlan._id;
        console.log(`  🔄 Updated plan: ${planData.name} (${planData.key})`);
      } else {
        // Create new plan
        const newPlan = await PricingPlan.create(planData);
        planMap[planData.key] = newPlan._id;
        console.log(`  ✅ Created plan: ${planData.name} (${planData.key})`);
      }
    }
    
    // Step 2: Create or update default CountryPricing (GB)
    console.log('\n📝 Step 2: Creating/Updating default CountryPricing (GB)...');
    
    const defaultCountryPricing = await CountryPricing.findOneAndUpdate(
      { countryCode: DEFAULT_COUNTRY_CODE },
      {
        countryCode: DEFAULT_COUNTRY_CODE,
        countryName: 'United Kingdom',
        currency: DEFAULT_CURRENCY,
        currencySymbol: DEFAULT_CURRENCY_SYMBOL,
        regionId: 'GBP_DEFAULT',
        planPrices: {
          free: {
            price: defaultCountryPricingPrices.free,
            planId: planMap['free']
          },
          dayPass: {
            price: defaultCountryPricingPrices.dayPass,
            planId: planMap['day_pass']
          },
          monthly: {
            price: defaultCountryPricingPrices.monthly,
            planId: planMap['pro_monthly']
          },
          quarterly: {
            price: defaultCountryPricingPrices.quarterly,
            planId: planMap['pro_quarterly']
          },
          yearly: {
            price: defaultCountryPricingPrices.yearly,
            planId: planMap['pro_yearly']
          }
        }
      },
      { upsert: true, new: true }
    ) as any;
    
    if (!defaultCountryPricing) {
      throw new Error('Failed to create default CountryPricing');
    }
    
    console.log(`  ✅ Default CountryPricing (${DEFAULT_COUNTRY_CODE}): ${defaultCountryPricing._id}`);
    
    // Step 3: Update PricingPlans to reference default CountryPricing
    console.log('\n📝 Step 3: Updating PricingPlans with CountryPricing references...');
    
    for (const [planKey, planId] of Object.entries(planMap)) {
      await PricingPlan.findByIdAndUpdate(planId, {
        defaultCountryPricingId: defaultCountryPricing._id
      });
      console.log(`  ✅ Updated ${planKey} with defaultCountryPricingId: ${defaultCountryPricing._id}`);
    }
    
    // Step 4: Verify
    console.log('\n🔍 Verifying setup...');
    const plans = await PricingPlan.find({}).lean();
    
    // Import CountryPricing service for manual fetching
    const { getCountryPricingById } = await import('../src/lib/services/countryPricingService');
    
    for (const plan of plans) {
      const planDefaultPricingId = (plan as any).defaultCountryPricingId;
      console.log(`  ${plan.key}:`);
      console.log(`    - defaultCountryPricingId: ${planDefaultPricingId}`);
      
      // Fetch CountryPricing manually by ObjectId
      if (planDefaultPricingId) {
        const countryPricing = await getCountryPricingById(planDefaultPricingId);
        if (countryPricing) {
          console.log(`    - Currency: ${countryPricing.currency} ${countryPricing.currencySymbol}`);
          const planPriceKey = plan.key === 'free' ? 'free' :
                             plan.key === 'day_pass' ? 'dayPass' :
                             plan.key === 'pro_monthly' ? 'monthly' :
                             plan.key === 'pro_quarterly' ? 'quarterly' : 'yearly';
          const price = countryPricing.planPrices[planPriceKey]?.price || 'N/A';
          console.log(`    - Price: ${countryPricing.currencySymbol}${price}`);
        } else {
          console.log(`    - ⚠️  CountryPricing not found for ID: ${planDefaultPricingId}`);
        }
      }
      // Show credits
      if (plan.credits) {
        console.log(`    - Credits: CV=${plan.credits.cvCredits === -1 ? 'Unlimited' : plan.credits.cvCredits}, Export=${plan.credits.exportCredits === -1 ? 'Unlimited' : plan.credits.exportCredits}, ATS=${plan.credits.atsCheckCredits === -1 ? 'Unlimited' : plan.credits.atsCheckCredits}, Job=${plan.credits.jobCredits === -1 ? 'Unlimited' : plan.credits.jobCredits}`);
        console.log(`    - Reset Schedule: ${plan.credits.resetSchedule}`);
      }
    }
    
    console.log('\n✅ Seeding completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`   - Created/Updated ${pricingPlansData.length} PricingPlans`);
    console.log(`   - Created/Updated default CountryPricing (${DEFAULT_COUNTRY_CODE})`);
    console.log(`   - All plans now reference CountryPricing for prices and currency`);
  } catch (error) {
    console.error('❌ Error seeding pricing plans:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from database');
  }
}

seedPricingPlansWithCountryPricing();

