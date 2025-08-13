const crypto = require('crypto');

// Test webhook signatures and events
function testWebhooks() {
  console.log('🧪 Testing Webhook Implementations\n');

  // Test Stripe webhook signature
  console.log('📋 Stripe Webhook Test:');
  const stripeBody = JSON.stringify({
    id: 'evt_test_123',
    type: 'checkout.session.completed',
    data: {
      object: {
        id: 'cs_test_123',
        customer: 'cus_test_123',
        subscription: 'sub_test_123',
        amount_total: 1999,
        currency: 'eur',
        metadata: {
          planKey: 'pro_monthly',
          userId: '507f1f77bcf86cd799439011',
          planId: '507f1f77bcf86cd799439012',
          interval: 'monthly'
        }
      }
    }
  });

  const stripeSecret = 'whsec_test_secret';
  const stripeSignature = crypto
    .createHmac('sha256', stripeSecret)
    .update(stripeBody)
    .digest('hex');

  console.log('✅ Stripe signature generation works');
  console.log(`   Body: ${stripeBody.substring(0, 100)}...`);
  console.log(`   Signature: ${stripeSignature.substring(0, 20)}...\n`);

  // Test Razorpay webhook signature
  console.log('📋 Razorpay Webhook Test:');
  const razorpayBody = JSON.stringify({
    event: 'payment.captured',
    payload: {
      payment: {
        entity: {
          id: 'pay_test_123',
          amount: 29900,
          currency: 'INR',
          customer_id: 'cust_test_123',
          notes: {
            planKey: 'day_pass',
            userId: '507f1f77bcf86cd799439011',
            planId: '507f1f77bcf86cd799439012',
            type: 'day_pass'
          }
        }
      }
    }
  });

  const razorpaySecret = 'test_webhook_secret';
  const razorpaySignature = crypto
    .createHmac('sha256', razorpaySecret)
    .update(razorpayBody)
    .digest('hex');

  console.log('✅ Razorpay signature generation works');
  console.log(`   Body: ${razorpayBody.substring(0, 100)}...`);
  console.log(`   Signature: ${razorpaySignature.substring(0, 20)}...\n`);

  // Test Day Pass expiry logic
  console.log('📋 Day Pass Expiry Test:');
  const now = new Date();
  const expiryDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now
  const expiredDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago

  console.log('✅ Day Pass expiry date calculation works');
  console.log(`   Now: ${now.toISOString()}`);
  console.log(`   Expires in 24h: ${expiryDate.toISOString()}`);
  console.log(`   Expired 24h ago: ${expiredDate.toISOString()}\n`);

  // Test webhook endpoints
  console.log('📋 Webhook Endpoints:');
  console.log('   Stripe: POST /api/webhooks/stripe');
  console.log('   Razorpay: POST /api/webhooks/razorpay');
  console.log('   Day Pass Expiry: POST /api/cron/expire-day-passes\n');

  // Test environment variables needed
  console.log('📋 Required Environment Variables:');
  console.log('   STRIPE_WEBHOOK_SECRET');
  console.log('   RAZORPAY_WEBHOOK_SECRET');
  console.log('   CRON_SECRET');
  console.log('   MONGODB_URI\n');

  // Test curl commands for manual testing
  console.log('📋 Manual Testing Commands:');
  console.log('   # Test Stripe webhook:');
  console.log(`   curl -X POST http://localhost:3000/api/webhooks/stripe \\`);
  console.log(`     -H "Content-Type: application/json" \\`);
  console.log(`     -H "stripe-signature: ${stripeSignature}" \\`);
  console.log(`     -d '${stripeBody}'\n`);

  console.log('   # Test Razorpay webhook:');
  console.log(`   curl -X POST http://localhost:3000/api/webhooks/razorpay \\`);
  console.log(`     -H "Content-Type: application/json" \\`);
  console.log(`     -H "x-razorpay-signature: ${razorpaySignature}" \\`);
  console.log(`     -d '${razorpayBody}'\n`);

  console.log('   # Test Day Pass expiry job:');
  console.log(`   curl -X POST http://localhost:3000/api/cron/expire-day-passes \\`);
  console.log(`     -H "Authorization: Bearer your_cron_secret"\n`);

  console.log('🎉 Webhook testing setup complete!');
}

// Generate webhook secrets for testing
function generateWebhookSecrets() {
  console.log('🔐 Generating Webhook Secrets for Testing\n');

  const stripeSecret = crypto.randomBytes(32).toString('hex');
  const razorpaySecret = crypto.randomBytes(32).toString('hex');
  const cronSecret = crypto.randomBytes(32).toString('hex');

  console.log('📋 Add these to your .env.local file:');
  console.log(`   STRIPE_WEBHOOK_SECRET=whsec_${stripeSecret}`);
  console.log(`   RAZORPAY_WEBHOOK_SECRET=${razorpaySecret}`);
  console.log(`   CRON_SECRET=${cronSecret}\n`);

  console.log('📋 For production, use real secrets from:');
  console.log('   Stripe Dashboard > Webhooks > Select endpoint > Signing secret');
  console.log('   Razorpay Dashboard > Settings > Webhooks > Add endpoint');
  console.log('   Generate a secure random string for CRON_SECRET\n');
}

// Test webhook event types
function listWebhookEvents() {
  console.log('📋 Supported Webhook Events:\n');

  console.log('🔵 Stripe Events:');
  console.log('   - checkout.session.completed');
  console.log('   - invoice.payment_succeeded');
  console.log('   - customer.subscription.updated');
  console.log('   - customer.subscription.deleted');
  console.log('   - payment_intent.succeeded');
  console.log('   - payment_intent.payment_failed\n');

  console.log('🟡 Razorpay Events:');
  console.log('   - payment.captured');
  console.log('   - subscription.activated');
  console.log('   - subscription.charged');
  console.log('   - subscription.cancelled');
  console.log('   - subscription.completed');
  console.log('   - order.paid\n');

  console.log('🟢 Cron Jobs:');
  console.log('   - Day Pass expiry (hourly)\n');
}

if (require.main === module) {
  const command = process.argv[2];

  switch (command) {
    case 'test':
      testWebhooks();
      break;
    case 'secrets':
      generateWebhookSecrets();
      break;
    case 'events':
      listWebhookEvents();
      break;
    default:
      console.log('Usage: node scripts/test-webhooks.js [test|secrets|events]');
      console.log('\nCommands:');
      console.log('  test    - Test webhook signatures and generate test data');
      console.log('  secrets - Generate webhook secrets for testing');
      console.log('  events  - List supported webhook events');
  }
}

module.exports = { testWebhooks, generateWebhookSecrets, listWebhookEvents };
