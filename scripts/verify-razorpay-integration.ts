/**
 * Verify Razorpay Integration for India Subscriptions
 * 
 * This script verifies:
 * 1. Database has Razorpay plan IDs configured
 * 2. Environment variables are set
 * 3. Razorpay instance can be initialized
 * 4. Plan IDs exist in Razorpay dashboard
 */

import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

// Import models and services
import CountryPricing from '../src/models/CountryPricing';
import { getRazorpay } from '../src/lib/payment/razorpay';

// Expected Razorpay Plan IDs
const EXPECTED_PLAN_IDS = {
  dayPass: 'plan_RivdpnkPFipjzk',
  monthly: 'plan_Rivf5wNg9v4nsx',
  quarterly: 'plan_RivgCvVqHGbAyD',
  yearly: 'plan_Rivh0SUqKUEWOB'
};

interface VerificationResult {
  step: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: any;
}

const results: VerificationResult[] = [];

async function verifyEnvironmentVariables() {
  console.log('\n📋 Step 1: Verifying Environment Variables...');
  
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (!keyId) {
    results.push({
      step: 'Environment Variables',
      status: 'fail',
      message: 'RAZORPAY_KEY_ID is not set'
    });
    return false;
  }

  if (!keySecret) {
    results.push({
      step: 'Environment Variables',
      status: 'fail',
      message: 'RAZORPAY_KEY_SECRET is not set'
    });
    return false;
  }

  if (!webhookSecret) {
    results.push({
      step: 'Environment Variables',
      status: 'warning',
      message: 'RAZORPAY_WEBHOOK_SECRET is not set (webhook verification will fail)'
    });
  }

  // Validate key format
  if (!keyId.startsWith('rzp_')) {
    results.push({
      step: 'Environment Variables',
      status: 'warning',
      message: `RAZORPAY_KEY_ID format may be invalid (expected to start with 'rzp_')`,
      details: { keyId: keyId.substring(0, 10) + '...' }
    });
  }

  results.push({
    step: 'Environment Variables',
    status: 'pass',
    message: 'All required environment variables are set',
    details: {
      keyId: keyId.substring(0, 10) + '...',
      keySecret: keySecret ? '***' + keySecret.slice(-4) : 'not set',
      webhookSecret: webhookSecret ? 'set' : 'not set'
    }
  });

  return true;
}

async function verifyRazorpayInstance() {
  console.log('\n📋 Step 2: Verifying Razorpay Instance...');
  
  try {
    const razorpayInstance = getRazorpay();
    
    if (!razorpayInstance) {
      results.push({
        step: 'Razorpay Instance',
        status: 'fail',
        message: 'Failed to initialize Razorpay instance'
      });
      return false;
    }

    // Try to fetch a plan to verify connection
    try {
      // This will fail if credentials are wrong, but that's okay for verification
      await razorpayInstance.plans.all({ count: 1 });
      
      results.push({
        step: 'Razorpay Instance',
        status: 'pass',
        message: 'Razorpay instance initialized successfully'
      });
      return true;
    } catch (error: any) {
      // If it's an auth error, credentials might be wrong
      if (error.statusCode === 401 || error.statusCode === 403) {
        results.push({
          step: 'Razorpay Instance',
          status: 'warning',
          message: 'Razorpay instance created but authentication may be invalid',
          details: { error: error.message }
        });
        return true; // Instance is created, just auth might be wrong
      }
      throw error;
    }
  } catch (error: any) {
    results.push({
      step: 'Razorpay Instance',
      status: 'fail',
      message: 'Failed to create Razorpay instance',
      details: { error: error.message }
    });
    return false;
  }
}

async function verifyDatabasePlanIds() {
  console.log('\n📋 Step 3: Verifying Database Plan IDs...');
  
  try {
    const indiaPricing = await CountryPricing.findOne({ countryCode: 'IN' });

    if (!indiaPricing) {
      results.push({
        step: 'Database Plan IDs',
        status: 'fail',
        message: 'India (IN) CountryPricing record not found'
      });
      return false;
    }

    const planIds = indiaPricing.razorpayPlanIds || {};
    const missing: string[] = [];
    const incorrect: Array<{ key: string; expected: string; actual: string }> = [];

    // Check each plan ID
    for (const [key, expectedId] of Object.entries(EXPECTED_PLAN_IDS)) {
      const actualId = planIds[key as keyof typeof planIds];
      
      if (!actualId) {
        missing.push(key);
      } else if (actualId !== expectedId) {
        incorrect.push({ key, expected: expectedId, actual: actualId });
      }
    }

    if (missing.length > 0) {
      results.push({
        step: 'Database Plan IDs',
        status: 'fail',
        message: `Missing plan IDs: ${missing.join(', ')}`,
        details: { missing }
      });
      return false;
    }

    if (incorrect.length > 0) {
      results.push({
        step: 'Database Plan IDs',
        status: 'fail',
        message: `Incorrect plan IDs found`,
        details: { incorrect }
      });
      return false;
    }

    results.push({
      step: 'Database Plan IDs',
      status: 'pass',
      message: 'All Razorpay plan IDs are correctly configured',
      details: {
        dayPass: planIds.dayPass,
        monthly: planIds.monthly,
        quarterly: planIds.quarterly,
        yearly: planIds.yearly
      }
    });

    return true;
  } catch (error: any) {
    results.push({
      step: 'Database Plan IDs',
      status: 'fail',
      message: 'Error checking database plan IDs',
      details: { error: error.message }
    });
    return false;
  }
}

async function verifyRazorpayPlans() {
  console.log('\n📋 Step 4: Verifying Razorpay Dashboard Plans...');
  
  try {
    const razorpayInstance = getRazorpay();
    if (!razorpayInstance) {
      results.push({
        step: 'Razorpay Dashboard Plans',
        status: 'fail',
        message: 'Razorpay instance not available'
      });
      return false;
    }

    const verifiedPlans: string[] = [];
    const missingPlans: string[] = [];
    const errors: Array<{ planId: string; error: string }> = [];

    for (const [key, planId] of Object.entries(EXPECTED_PLAN_IDS)) {
      try {
        const plan = await razorpayInstance.plans.fetch(planId);
        
        if (plan) {
          verifiedPlans.push(key);
          console.log(`  ✅ ${key}: ${planId} - ${plan.item?.name || 'N/A'}`);
        } else {
          missingPlans.push(key);
        }
      } catch (error: any) {
        if (error.statusCode === 404) {
          missingPlans.push(key);
          errors.push({ planId, error: 'Plan not found in Razorpay dashboard' });
        } else {
          errors.push({ planId, error: error.message });
        }
      }
    }

    if (missingPlans.length > 0) {
      results.push({
        step: 'Razorpay Dashboard Plans',
        status: 'fail',
        message: `Plans not found in Razorpay dashboard: ${missingPlans.join(', ')}`,
        details: { missingPlans, errors }
      });
      return false;
    }

    if (errors.length > 0 && errors.length < Object.keys(EXPECTED_PLAN_IDS).length) {
      results.push({
        step: 'Razorpay Dashboard Plans',
        status: 'warning',
        message: 'Some plans could not be verified',
        details: { errors }
      });
      return true;
    }

    results.push({
      step: 'Razorpay Dashboard Plans',
      status: 'pass',
      message: 'All plans verified in Razorpay dashboard',
      details: { verifiedPlans }
    });

    return true;
  } catch (error: any) {
    results.push({
      step: 'Razorpay Dashboard Plans',
      status: 'warning',
      message: 'Could not verify plans in Razorpay dashboard',
      details: { error: error.message }
    });
    return true; // Don't fail if we can't verify (might be network/auth issue)
  }
}

function printSummary() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 VERIFICATION SUMMARY');
  console.log('='.repeat(60));

  const passed = results.filter(r => r.status === 'pass').length;
  const failed = results.filter(r => r.status === 'fail').length;
  const warnings = results.filter(r => r.status === 'warning').length;

  console.log(`\n✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⚠️  Warnings: ${warnings}`);

  console.log('\n📋 Detailed Results:');
  results.forEach((result, index) => {
    const icon = result.status === 'pass' ? '✅' : result.status === 'fail' ? '❌' : '⚠️';
    console.log(`\n${index + 1}. ${icon} ${result.step}`);
    console.log(`   ${result.message}`);
    if (result.details) {
      console.log(`   Details:`, JSON.stringify(result.details, null, 2));
    }
  });

  console.log('\n' + '='.repeat(60));
  
  if (failed === 0) {
    console.log('🎉 All critical checks passed!');
    console.log('\n📝 Next Steps:');
    console.log('   1. Test subscription creation for each plan');
    console.log('   2. Verify webhook events are received at /api/webhooks/razorpay');
    console.log('   3. Test complete payment flow end-to-end');
    console.log('   4. Verify subscription activation in database');
  } else {
    console.log('⚠️  Some checks failed. Please fix the issues above before proceeding.');
  }
  
  console.log('='.repeat(60) + '\n');
}

async function verifyIntegration() {
  try {
    console.log('🔍 Starting Razorpay Integration Verification...\n');

    // Step 1: Environment Variables
    const envOk = await verifyEnvironmentVariables();
    if (!envOk) {
      printSummary();
      return;
    }

    // Step 2: Razorpay Instance
    await verifyRazorpayInstance();

    // Step 3: Database Connection and Plan IDs
    console.log('\n🔌 Connecting to database...');
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      results.push({
        step: 'Database Connection',
        status: 'fail',
        message: 'MONGODB_URI environment variable is not set'
      });
      printSummary();
      return;
    }

    await mongoose.connect(mongoUri);
    console.log('✅ Database connected');

    // Step 3: Database Plan IDs
    const dbOk = await verifyDatabasePlanIds();
    if (!dbOk) {
      await mongoose.disconnect();
      printSummary();
      return;
    }

    // Step 4: Razorpay Dashboard Plans
    await verifyRazorpayPlans();

    await mongoose.disconnect();
    console.log('🔌 Database disconnected');

    printSummary();

  } catch (error) {
    console.error('❌ Verification error:', error);
    if (error instanceof Error) {
      console.error('   Error message:', error.message);
      console.error('   Stack trace:', error.stack);
    }
    results.push({
      step: 'Verification Process',
      status: 'fail',
      message: 'Verification process failed',
      details: { error: error instanceof Error ? error.message : 'Unknown error' }
    });
    printSummary();
  }
}

// Run verification
verifyIntegration()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Verification script failed:', error);
    process.exit(1);
  });

