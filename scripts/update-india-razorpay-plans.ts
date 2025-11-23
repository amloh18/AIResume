/**
 * Update India CountryPricing with Razorpay Plan IDs
 * 
 * This script updates the India (IN) CountryPricing record with the Razorpay
 * subscription plan IDs that have been configured in the Razorpay dashboard.
 * 
 * Plan IDs:
 * - Day Pass: plan_RivdpnkPFipjzk (₹49.00 - Every Week)
 * - Professional Monthly: plan_Rivf5wNg9v4nsx (₹199.00 - Every Month)
 * - Professional Quarterly: plan_RivgCvVqHGbAyD (₹549.00 - Once in 3 Months)
 * - Professional Yearly: plan_Rivh0SUqKUEWOB (₹1,999.00 - Every Year)
 */

import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

// Import models
import CountryPricing from '../src/models/CountryPricing';

// Razorpay Plan IDs from Razorpay Dashboard
const RAZORPAY_PLAN_IDS = {
  dayPass: 'plan_RivdpnkPFipjzk',      // Day Pass - ₹49.00
  monthly: 'plan_Rivf5wNg9v4nsx',      // Professional Monthly - ₹199.00
  quarterly: 'plan_RivgCvVqHGbAyD',    // Professional Quarterly - ₹549.00
  yearly: 'plan_Rivh0SUqKUEWOB'        // Professional Yearly - ₹1,999.00
};

async function updateIndiaRazorpayPlans() {
  try {
    console.log('🔌 Connecting to database...');
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is not set');
    }
    
    await mongoose.connect(mongoUri);
    console.log('✅ Database connected');

    // Find India CountryPricing record
    console.log('\n📋 Looking for India (IN) CountryPricing record...');
    const indiaPricing = await CountryPricing.findOne({ countryCode: 'IN' });

    if (!indiaPricing) {
      console.error('❌ India (IN) CountryPricing record not found!');
      console.error('   Please create the India CountryPricing record first using the admin API or seed script.');
      process.exit(1);
    }

    console.log('✅ Found India CountryPricing record');
    console.log(`   Country: ${indiaPricing.countryName}`);
    console.log(`   Currency: ${indiaPricing.currency} ${indiaPricing.currencySymbol}`);
    console.log(`   Current Razorpay Plan IDs:`, indiaPricing.razorpayPlanIds || 'None');

    // Update razorpayPlanIds
    console.log('\n🔄 Updating Razorpay Plan IDs...');
    const updatedPricing = await CountryPricing.findOneAndUpdate(
      { countryCode: 'IN' },
      {
        $set: {
          razorpayPlanIds: {
            dayPass: RAZORPAY_PLAN_IDS.dayPass,
            monthly: RAZORPAY_PLAN_IDS.monthly,
            quarterly: RAZORPAY_PLAN_IDS.quarterly,
            yearly: RAZORPAY_PLAN_IDS.yearly
          }
        }
      },
      { new: true }
    );

    if (!updatedPricing) {
      console.error('❌ Failed to update India CountryPricing');
      process.exit(1);
    }

    console.log('✅ Successfully updated India CountryPricing with Razorpay Plan IDs:');
    console.log('\n📦 Updated Plan IDs:');
    console.log(`   Day Pass:        ${updatedPricing.razorpayPlanIds?.dayPass}`);
    console.log(`   Monthly:         ${updatedPricing.razorpayPlanIds?.monthly}`);
    console.log(`   Quarterly:       ${updatedPricing.razorpayPlanIds?.quarterly}`);
    console.log(`   Yearly:          ${updatedPricing.razorpayPlanIds?.yearly}`);

    // Verify the update
    console.log('\n🔍 Verifying update...');
    const verified = await CountryPricing.findOne({ countryCode: 'IN' });
    
    if (verified?.razorpayPlanIds?.dayPass === RAZORPAY_PLAN_IDS.dayPass &&
        verified?.razorpayPlanIds?.monthly === RAZORPAY_PLAN_IDS.monthly &&
        verified?.razorpayPlanIds?.quarterly === RAZORPAY_PLAN_IDS.quarterly &&
        verified?.razorpayPlanIds?.yearly === RAZORPAY_PLAN_IDS.yearly) {
      console.log('✅ Verification successful - All plan IDs match!');
    } else {
      console.error('❌ Verification failed - Plan IDs do not match!');
      console.error('   Expected:', RAZORPAY_PLAN_IDS);
      console.error('   Actual:', verified?.razorpayPlanIds);
      process.exit(1);
    }

    console.log('\n🎉 India Razorpay Plan IDs update completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('   1. Verify Razorpay webhook is configured at: /api/webhooks/razorpay');
    console.log('   2. Test subscription creation for each plan');
    console.log('   3. Verify webhook events are being received correctly');

  } catch (error) {
    console.error('❌ Error updating India Razorpay plans:', error);
    if (error instanceof Error) {
      console.error('   Error message:', error.message);
      console.error('   Stack trace:', error.stack);
    }
    process.exit(1);
  } finally {
    console.log('\n🔌 Closing database connection...');
    await mongoose.disconnect();
    console.log('✅ Database connection closed');
  }
}

// Run the script
updateIndiaRazorpayPlans()
  .then(() => {
    console.log('\n✨ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error);
    process.exit(1);
  });

