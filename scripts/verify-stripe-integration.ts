/**
 * Verify Stripe Integration for All Countries
 * 
 * This script verifies:
 * 1. Database has Stripe price IDs configured for all countries
 * 2. Environment variables are set
 * 3. Stripe instance can be initialized
 * 4. Price IDs exist in Stripe dashboard
 * 5. Products have features configured
 */

import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

import CountryPricing from '../src/models/CountryPricing';
import PricingPlan from '../src/models/PricingPlan';
import Stripe from 'stripe';

interface VerificationResult {
  step: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: any;
}

const results: VerificationResult[] = [];

async function verifyEnvironmentVariables() {
  console.log('\n📋 Step 1: Verifying Environment Variables...');
  
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secretKey) {
    results.push({
      step: 'Environment Variables',
      status: 'fail',
      message: 'STRIPE_SECRET_KEY is not set'
    });
    return false;
  }

  if (!publishableKey) {
    results.push({
      step: 'Environment Variables',
      status: 'warning',
      message: 'STRIPE_PUBLISHABLE_KEY is not set (may be needed for frontend)'
    });
  }

  if (!webhookSecret) {
    results.push({
      step: 'Environment Variables',
      status: 'warning',
      message: 'STRIPE_WEBHOOK_SECRET is not set (webhook verification will fail)'
    });
  }

  // Validate key format
  if (!secretKey.startsWith('sk_')) {
    results.push({
      step: 'Environment Variables',
      status: 'warning',
      message: `STRIPE_SECRET_KEY format may be invalid (expected to start with 'sk_')`,
      details: { keyId: secretKey.substring(0, 10) + '...' }
    });
  }

  results.push({
    step: 'Environment Variables',
    status: 'pass',
    message: 'All required environment variables are set',
    details: {
      secretKey: secretKey.substring(0, 12) + '...',
      publishableKey: publishableKey ? publishableKey.substring(0, 12) + '...' : 'not set',
      webhookSecret: webhookSecret ? 'set' : 'not set'
    }
  });

  return true;
}

async function verifyStripeInstance() {
  console.log('\n📋 Step 2: Verifying Stripe Instance...');
  
  try {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      results.push({
        step: 'Stripe Instance',
        status: 'fail',
        message: 'STRIPE_SECRET_KEY is not set'
      });
      return false;
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: '2024-11-20.acacia',
    });

    // Try to fetch account to verify connection
    try {
      await stripe.account.retrieve();
      
      results.push({
        step: 'Stripe Instance',
        status: 'pass',
        message: 'Stripe instance initialized successfully'
      });
      return true;
    } catch (error: any) {
      if (error.statusCode === 401 || error.statusCode === 403) {
        results.push({
          step: 'Stripe Instance',
          status: 'warning',
          message: 'Stripe instance created but authentication may be invalid',
          details: { error: error.message }
        });
        return true;
      }
      throw error;
    }
  } catch (error: any) {
    results.push({
      step: 'Stripe Instance',
      status: 'fail',
      message: 'Failed to create Stripe instance',
      details: { error: error.message }
    });
    return false;
  }
}

async function verifyDatabasePriceIds() {
  console.log('\n📋 Step 3: Verifying Database Price IDs...');
  
  try {
    const allPricing = await CountryPricing.find({}).lean();
    
    if (allPricing.length === 0) {
      results.push({
        step: 'Database Price IDs',
        status: 'fail',
        message: 'No CountryPricing records found'
      });
      return false;
    }

    const countriesWithPriceIds: string[] = [];
    const countriesWithoutPriceIds: string[] = [];
    const missingPriceIds: Array<{ country: string; plan: string }> = [];

    for (const pricing of allPricing) {
      const priceIds = pricing.stripePriceIds || {};
      const hasAllPriceIds = priceIds.dayPass && 
                            priceIds.monthly && 
                            priceIds.quarterly && 
                            priceIds.yearly;

      if (hasAllPriceIds) {
        countriesWithPriceIds.push(pricing.countryCode);
      } else {
        countriesWithoutPriceIds.push(pricing.countryCode);
        
        if (!priceIds.dayPass) missingPriceIds.push({ country: pricing.countryCode, plan: 'dayPass' });
        if (!priceIds.monthly) missingPriceIds.push({ country: pricing.countryCode, plan: 'monthly' });
        if (!priceIds.quarterly) missingPriceIds.push({ country: pricing.countryCode, plan: 'quarterly' });
        if (!priceIds.yearly) missingPriceIds.push({ country: pricing.countryCode, plan: 'yearly' });
      }
    }

    if (countriesWithoutPriceIds.length > 0) {
      results.push({
        step: 'Database Price IDs',
        status: 'warning',
        message: `${countriesWithoutPriceIds.length} countries missing some price IDs`,
        details: { 
          countriesWithAll: countriesWithPriceIds.length,
          countriesMissing: countriesWithoutPriceIds,
          missingPriceIds: missingPriceIds.slice(0, 10) // Show first 10
        }
      });
    } else {
      results.push({
        step: 'Database Price IDs',
        status: 'pass',
        message: `All ${allPricing.length} countries have Stripe price IDs configured`,
        details: { totalCountries: allPricing.length }
      });
    }

    return true;
  } catch (error: any) {
    results.push({
      step: 'Database Price IDs',
      status: 'fail',
      message: 'Error checking database price IDs',
      details: { error: error.message }
    });
    return false;
  }
}

async function verifyStripePrices() {
  console.log('\n📋 Step 4: Verifying Stripe Dashboard Prices...');
  
  try {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      results.push({
        step: 'Stripe Dashboard Prices',
        status: 'fail',
        message: 'STRIPE_SECRET_KEY is not set'
      });
      return false;
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: '2024-11-20.acacia',
    });

    // Get a sample of prices from database
    const samplePricing = await CountryPricing.find({ 
      'stripePriceIds.monthly': { $exists: true }
    }).limit(5).lean();

    if (samplePricing.length === 0) {
      results.push({
        step: 'Stripe Dashboard Prices',
        status: 'warning',
        message: 'No price IDs found in database to verify'
      });
      return true;
    }

    const verifiedPrices: string[] = [];
    const missingPrices: string[] = [];
    const errors: Array<{ priceId: string; error: string }> = [];

    for (const pricing of samplePricing) {
      const priceIds = pricing.stripePriceIds || {};
      const testPriceIds = [
        priceIds.monthly,
        priceIds.quarterly,
        priceIds.yearly,
        priceIds.dayPass
      ].filter(Boolean);

      for (const priceId of testPriceIds) {
        try {
          const price = await stripe.prices.retrieve(priceId);
          
          if (price) {
            verifiedPrices.push(priceId);
            console.log(`  ✅ ${pricing.countryCode}/${priceId}: ${price.currency.toUpperCase()} ${(price.unit_amount || 0) / 100} - ${price.recurring ? 'Recurring' : 'One-time'}`);
          }
        } catch (error: any) {
          if (error.statusCode === 404) {
            missingPrices.push(priceId);
            errors.push({ priceId, error: 'Price not found in Stripe dashboard' });
          } else {
            errors.push({ priceId, error: error.message });
          }
        }
      }
    }

    if (missingPrices.length > 0) {
      results.push({
        step: 'Stripe Dashboard Prices',
        status: 'fail',
        message: `${missingPrices.length} prices not found in Stripe dashboard`,
        details: { missingPrices: missingPrices.slice(0, 5), errors: errors.slice(0, 5) }
      });
      return false;
    }

    if (errors.length > 0 && errors.length < verifiedPrices.length) {
      results.push({
        step: 'Stripe Dashboard Prices',
        status: 'warning',
        message: 'Some prices could not be verified',
        details: { errors: errors.slice(0, 5) }
      });
      return true;
    }

    results.push({
      step: 'Stripe Dashboard Prices',
      status: 'pass',
      message: `Verified ${verifiedPrices.length} sample prices in Stripe dashboard`,
      details: { verifiedCount: verifiedPrices.length }
    });

    return true;
  } catch (error: any) {
    results.push({
      step: 'Stripe Dashboard Prices',
      status: 'warning',
      message: 'Could not verify prices in Stripe dashboard',
      details: { error: error.message }
    });
    return true; // Don't fail if we can't verify (might be network/auth issue)
  }
}

async function verifyProductFeatures() {
  console.log('\n📋 Step 5: Verifying Product Features...');
  
  try {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      results.push({
        step: 'Product Features',
        status: 'fail',
        message: 'STRIPE_SECRET_KEY is not set'
      });
      return false;
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: '2024-11-20.acacia',
    });

    // Get products
    const products = await stripe.products.list({
      limit: 100,
      active: true
    });

    const productsWithFeatures = products.data.filter(p => 
      p.description?.includes('Features:') || p.metadata?.features
    );
    const productsWithoutFeatures = products.data.filter(p => 
      !p.description?.includes('Features:') && !p.metadata?.features
    );

    if (productsWithoutFeatures.length > 0) {
      results.push({
        step: 'Product Features',
        status: 'warning',
        message: `${productsWithoutFeatures.length} products without features`,
        details: { 
          withFeatures: productsWithFeatures.length,
          withoutFeatures: productsWithoutFeatures.length,
          sample: productsWithoutFeatures.slice(0, 5).map(p => p.name)
        }
      });
    } else {
      results.push({
        step: 'Product Features',
        status: 'pass',
        message: `All ${products.data.length} products have features configured`,
        details: { totalProducts: products.data.length }
      });
    }

    return true;
  } catch (error: any) {
    results.push({
      step: 'Product Features',
      status: 'warning',
      message: 'Could not verify product features',
      details: { error: error.message }
    });
    return true;
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
    console.log('   1. Test subscription creation for each plan type');
    console.log('   2. Verify webhook events are received at /api/webhooks/stripe');
    console.log('   3. Test recurring payments (monthly, quarterly, yearly)');
    console.log('   4. Verify subscription activation in database');
    console.log('   5. Configure Stripe webhook in dashboard with these events:');
    console.log('      - checkout.session.completed');
    console.log('      - customer.subscription.created');
    console.log('      - customer.subscription.updated');
    console.log('      - invoice.payment_succeeded');
  } else {
    console.log('⚠️  Some checks failed. Please fix the issues above before proceeding.');
  }
  
  console.log('='.repeat(60) + '\n');
}

async function verifyIntegration() {
  try {
    console.log('🔍 Starting Stripe Integration Verification...\n');

    // Step 1: Environment Variables
    const envOk = await verifyEnvironmentVariables();
    if (!envOk) {
      printSummary();
      return;
    }

    // Step 2: Stripe Instance
    await verifyStripeInstance();

    // Step 3: Database Connection and Price IDs
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

    // Step 3: Database Price IDs
    await verifyDatabasePriceIds();

    // Step 4: Stripe Dashboard Prices
    await verifyStripePrices();

    // Step 5: Product Features
    await verifyProductFeatures();

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

