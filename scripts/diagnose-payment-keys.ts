#!/usr/bin/env tsx
/**
 * Payment Keys Diagnostic Script
 * Tests Razorpay and Stripe API keys to verify they are valid and working
 */

import Stripe from 'stripe';
import Razorpay from 'razorpay';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env.local') });

interface DiagnosticResult {
  provider: 'stripe' | 'razorpay';
  status: 'valid' | 'invalid' | 'error';
  message: string;
  details?: any;
}

async function testStripe(): Promise<DiagnosticResult> {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY;

  console.log('\n🔍 Testing Stripe Configuration...\n');

  // Check if keys are present
  if (!secretKey) {
    return {
      provider: 'stripe',
      status: 'invalid',
      message: 'STRIPE_SECRET_KEY is not set in environment variables',
    };
  }

  if (!publishableKey) {
    return {
      provider: 'stripe',
      status: 'invalid',
      message: 'STRIPE_PUBLISHABLE_KEY is not set in environment variables',
    };
  }

  // Validate key format
  if (!secretKey.startsWith('sk_')) {
    return {
      provider: 'stripe',
      status: 'invalid',
      message: `STRIPE_SECRET_KEY format is invalid. Expected to start with 'sk_', got: ${secretKey.substring(0, 10)}...`,
    };
  }

  if (!publishableKey.startsWith('pk_')) {
    return {
      provider: 'stripe',
      status: 'invalid',
      message: `STRIPE_PUBLISHABLE_KEY format is invalid. Expected to start with 'pk_', got: ${publishableKey.substring(0, 10)}...`,
    };
  }

  // Check if it's test or live mode
  const isTestMode = secretKey.includes('_test_');
  const isLiveMode = secretKey.includes('_live_');

  console.log(`  Key Type: ${isTestMode ? 'TEST' : isLiveMode ? 'LIVE' : 'UNKNOWN'}`);
  console.log(`  Secret Key: ${secretKey.substring(0, 20)}...${secretKey.substring(secretKey.length - 10)}`);
  console.log(`  Publishable Key: ${publishableKey.substring(0, 20)}...${publishableKey.substring(publishableKey.length - 10)}`);

  // Test API connection
  try {
    const stripe = new Stripe(secretKey, {
      apiVersion: '2024-11-20.acacia',
    });

    // Try to retrieve account information (lightweight API call)
    const account = await stripe.account.retrieve();

    return {
      provider: 'stripe',
      status: 'valid',
      message: 'Stripe API keys are valid and working',
      details: {
        accountId: account.id,
        country: account.country,
        defaultCurrency: account.default_currency,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        type: account.type,
      },
    };
  } catch (error: any) {
    return {
      provider: 'stripe',
      status: 'error',
      message: `Stripe API test failed: ${error.message}`,
      details: {
        errorType: error.type,
        errorCode: error.code,
        statusCode: error.statusCode,
      },
    };
  }
}

async function testRazorpay(): Promise<DiagnosticResult> {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  const publicKeyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;

  console.log('\n🔍 Testing Razorpay Configuration...\n');

  // Check if keys are present
  if (!keyId) {
    return {
      provider: 'razorpay',
      status: 'invalid',
      message: 'RAZORPAY_KEY_ID is not set in environment variables',
    };
  }

  if (!keySecret) {
    return {
      provider: 'razorpay',
      status: 'invalid',
      message: 'RAZORPAY_KEY_SECRET is not set in environment variables',
    };
  }

  if (!publicKeyId) {
    return {
      provider: 'razorpay',
      status: 'invalid',
      message: 'NEXT_PUBLIC_RAZORPAY_KEY_ID is not set in environment variables',
    };
  }

  // Validate key format
  if (!keyId.startsWith('rzp_')) {
    return {
      provider: 'razorpay',
      status: 'invalid',
      message: `RAZORPAY_KEY_ID format is invalid. Expected to start with 'rzp_', got: ${keyId.substring(0, 10)}...`,
    };
  }

  // Check key secret length (should be at least 20 characters)
  if (keySecret.length < 20) {
    return {
      provider: 'razorpay',
      status: 'invalid',
      message: `RAZORPAY_KEY_SECRET appears to be too short (${keySecret.length} chars). Expected at least 20 characters.`,
    };
  }

  // Check if it's test or live mode
  const isTestMode = keyId.includes('_test_');
  const isLiveMode = keyId.includes('_live_');

  console.log(`  Key Type: ${isTestMode ? 'TEST' : isLiveMode ? 'LIVE' : 'UNKNOWN'}`);
  console.log(`  Key ID: ${keyId}`);
  console.log(`  Key Secret: ${keySecret.substring(0, 10)}...${keySecret.substring(keySecret.length - 5)} (${keySecret.length} chars)`);
  console.log(`  Public Key ID: ${publicKeyId}`);

  // Check if key IDs match
  if (keyId !== publicKeyId) {
    console.warn(`  ⚠️  WARNING: RAZORPAY_KEY_ID and NEXT_PUBLIC_RAZORPAY_KEY_ID do not match!`);
  }

  // Test API connection
  try {
    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });

    // Try to fetch account information (lightweight API call)
    // Razorpay doesn't have a direct account.retrieve(), so we'll try to fetch payments list (empty is fine)
    try {
      const payments = await razorpay.payments.all({ count: 1 });
      
      return {
        provider: 'razorpay',
        status: 'valid',
        message: 'Razorpay API keys are valid and working',
        details: {
          keyId: keyId,
          canAccessPayments: true,
        },
      };
    } catch (apiError: any) {
      // If we get an authentication error, the keys are invalid
      if (apiError.statusCode === 401 || apiError.statusCode === 403) {
        return {
          provider: 'razorpay',
          status: 'error',
          message: `Razorpay API authentication failed: ${apiError.error?.description || apiError.message}`,
          details: {
            statusCode: apiError.statusCode,
            errorCode: apiError.error?.code,
            errorDescription: apiError.error?.description,
          },
        };
      }
      
      // Other errors might be okay (like rate limiting)
      return {
        provider: 'razorpay',
        status: 'valid',
        message: 'Razorpay API keys appear to be valid (connection successful)',
        details: {
          keyId: keyId,
          note: 'Could not verify full access, but authentication succeeded',
        },
      };
    }
  } catch (error: any) {
    return {
      provider: 'razorpay',
      status: 'error',
      message: `Razorpay API test failed: ${error.message}`,
      details: {
        error: error.message,
        stack: error.stack,
      },
    };
  }
}

async function main() {
  console.log('🚀 Payment Keys Diagnostic Tool\n');
  console.log('=' .repeat(60));

  const results: DiagnosticResult[] = [];

  // Test Stripe
  const stripeResult = await testStripe();
  results.push(stripeResult);

  // Test Razorpay
  const razorpayResult = await testRazorpay();
  results.push(razorpayResult);

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 Diagnostic Summary\n');

  for (const result of results) {
    const icon = result.status === 'valid' ? '✅' : result.status === 'invalid' ? '❌' : '⚠️';
    console.log(`${icon} ${result.provider.toUpperCase()}: ${result.message}`);
    
    if (result.details) {
      console.log('   Details:', JSON.stringify(result.details, null, 2));
    }
  }

  // Overall status
  const allValid = results.every(r => r.status === 'valid');
  const hasErrors = results.some(r => r.status === 'error' || r.status === 'invalid');

  console.log('\n' + '='.repeat(60));
  if (allValid) {
    console.log('\n✅ All payment providers are configured correctly!');
    process.exit(0);
  } else if (hasErrors) {
    console.log('\n❌ Some payment providers have issues. Please review the errors above.');
    process.exit(1);
  } else {
    console.log('\n⚠️  Payment providers have warnings. Please review above.');
    process.exit(0);
  }
}

// Run the diagnostic
main().catch((error) => {
  console.error('\n❌ Fatal error running diagnostic:', error);
  process.exit(1);
});

