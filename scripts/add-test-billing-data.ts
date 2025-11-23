/**
 * Add Test Billing Data
 * 
 * Adds sample payment methods and invoices for a test user
 */

import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

import User from '../src/models/User';
import PaymentMethod from '../src/models/PaymentMethod';
import Invoice from '../src/models/Invoice';
import InvoiceItem from '../src/models/InvoiceItem';
import PricingPlan from '../src/models/PricingPlan';

async function addTestBillingData() {
  try {
    console.log('🚀 Adding test billing data...\n');

    // Connect to database
    console.log('🔌 Connecting to database...');
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is not set');
    }

    await mongoose.connect(mongoUri);
    console.log('✅ Database connected\n');

    // Find user
    const email = 'amlohsl@icloud.com';
    console.log(`📋 Looking for user: ${email}...`);
    const user = await User.findOne({ email });
    
    if (!user) {
      console.error(`❌ User not found: ${email}`);
      console.log('   Please ensure the user exists in the database.');
      process.exit(1);
    }

    console.log(`✅ Found user: ${user.firstName} ${user.lastName} (${user._id})\n`);

    const userId = user._id;

    // Check if payment methods already exist
    const existingPaymentMethods = await PaymentMethod.find({ userId });
    console.log(`📊 Existing payment methods: ${existingPaymentMethods.length}`);

    // Add payment methods if they don't exist
    if (existingPaymentMethods.length === 0) {
      console.log('\n💳 Adding payment methods...');

      const paymentMethods = [
        {
          userId,
          type: 'credit_card',
          provider: 'stripe', // Payment gateway
          last4: '4242',
          brand: 'visa', // Card brand
          expiryMonth: 12,
          expiryYear: 2025,
          isDefault: true,
          isActive: true,
          gatewayCustomerId: `cus_test_${Date.now()}`,
          createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 days ago
        },
        {
          userId,
          type: 'credit_card',
          provider: 'stripe', // Payment gateway
          last4: '5555',
          brand: 'mastercard', // Card brand
          expiryMonth: 6,
          expiryYear: 2026,
          isDefault: false,
          isActive: true,
          gatewayCustomerId: `cus_test_${Date.now() + 1}`,
          createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000) // 15 days ago
        },
        {
          userId,
          type: 'credit_card',
          provider: 'stripe', // Payment gateway (using stripe as provider, but can note Razorpay in metadata)
          last4: '1111',
          brand: 'visa', // Card brand
          expiryMonth: 9,
          expiryYear: 2025,
          isDefault: false,
          isActive: true,
          gatewayCustomerId: `cust_razorpay_${Date.now() + 2}`, // Note: Razorpay customer ID
          createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 days ago
        }
      ];

      const createdPaymentMethods = await PaymentMethod.insertMany(paymentMethods);
      console.log(`✅ Created ${createdPaymentMethods.length} payment methods:`);
      createdPaymentMethods.forEach((pm, idx) => {
        const gateway = pm.gatewayCustomerId?.includes('razorpay') ? 'Razorpay' : pm.provider.toUpperCase();
        console.log(`   ${idx + 1}. ${pm.brand.toUpperCase()} •••• ${pm.last4} (${gateway})${pm.isDefault ? ' [Default]' : ''}`);
      });
    } else {
      console.log('⚠️  Payment methods already exist, skipping...');
    }

    // Get payment methods for invoice creation
    const paymentMethods = await PaymentMethod.find({ userId, isActive: true });
    if (paymentMethods.length === 0) {
      console.error('❌ No payment methods found. Cannot create invoices.');
      process.exit(1);
    }

    const defaultPaymentMethod = paymentMethods.find(pm => pm.isDefault) || paymentMethods[0];

    // Check if invoices already exist
    const existingInvoices = await Invoice.find({ userId });
    console.log(`\n📊 Existing invoices: ${existingInvoices.length}`);

    if (existingInvoices.length === 0) {
      console.log('\n📄 Creating invoices...');

      // Get pricing plans for invoice details
      const monthlyPlan = await PricingPlan.findOne({ key: 'pro_monthly' });
      const quarterlyPlan = await PricingPlan.findOne({ key: 'pro_quarterly' });
      const yearlyPlan = await PricingPlan.findOne({ key: 'pro_yearly' });
      const dayPassPlan = await PricingPlan.findOne({ key: 'day_pass' });

      const invoices = [
        // Monthly subscription invoice (most recent)
        {
          userId,
          invoiceNumber: `INV-${Date.now()}-001`,
          subtotal: 12.99,
          taxAmount: 0,
          amount: 12.99,
          currency: 'USD',
          status: 'paid',
          planName: monthlyPlan?.name || 'Professional Monthly',
          planId: monthlyPlan?._id,
          billingCycle: 'monthly',
          paymentMethodId: defaultPaymentMethod._id,
          paymentMethodType: defaultPaymentMethod.brand || 'visa',
          paymentMethodLast4: defaultPaymentMethod.last4,
          paidAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
          invoiceDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          description: 'Monthly subscription - Professional Plan',
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          metadata: {
            stripeInvoiceId: `in_test_${Date.now()}`,
            stripeSubscriptionId: `sub_test_${Date.now()}`
          }
        },
        // Quarterly subscription invoice
        {
          userId,
          invoiceNumber: `INV-${Date.now() - 1000000}-002`,
          subtotal: 34.99,
          taxAmount: 0,
          amount: 34.99,
          currency: 'USD',
          status: 'paid',
          planName: quarterlyPlan?.name || 'Professional Quarterly',
          planId: quarterlyPlan?._id,
          billingCycle: 'quarterly',
          paymentMethodId: defaultPaymentMethod._id,
          paymentMethodType: defaultPaymentMethod.brand || 'visa',
          paymentMethodLast4: defaultPaymentMethod.last4,
          paidAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
          invoiceDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          dueDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          description: 'Quarterly subscription - Professional Plan',
          createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          metadata: {
            stripeInvoiceId: `in_test_${Date.now() - 1000000}`,
            stripeSubscriptionId: `sub_test_${Date.now() - 1000000}`
          }
        },
        // Yearly subscription invoice
        {
          userId,
          invoiceNumber: `INV-${Date.now() - 2000000}-003`,
          subtotal: 119.99,
          taxAmount: 0,
          amount: 119.99,
          currency: 'USD',
          status: 'paid',
          planName: yearlyPlan?.name || 'Professional Yearly',
          planId: yearlyPlan?._id,
          billingCycle: 'yearly',
          paymentMethodId: defaultPaymentMethod._id,
          paymentMethodType: defaultPaymentMethod.brand || 'visa',
          paymentMethodLast4: defaultPaymentMethod.last4,
          paidAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // 60 days ago
          invoiceDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
          dueDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
          description: 'Yearly subscription - Professional Plan',
          createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
          metadata: {
            stripeInvoiceId: `in_test_${Date.now() - 2000000}`,
            stripeSubscriptionId: `sub_test_${Date.now() - 2000000}`
          }
        },
        // Day Pass invoice
        {
          userId,
          invoiceNumber: `INV-${Date.now() - 3000000}-004`,
          subtotal: 2.99,
          taxAmount: 0,
          amount: 2.99,
          currency: 'USD',
          status: 'paid',
          planName: dayPassPlan?.name || 'Day Pass',
          planId: dayPassPlan?._id,
          billingCycle: 'one-time',
          paymentMethodId: paymentMethods[1]?._id || defaultPaymentMethod._id,
          paymentMethodType: paymentMethods[1]?.brand || defaultPaymentMethod.brand || 'visa',
          paymentMethodLast4: paymentMethods[1]?.last4 || defaultPaymentMethod.last4,
          paidAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // 90 days ago
          invoiceDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
          dueDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
          description: 'Day Pass - 24 hour access',
          createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
          metadata: {
            stripePaymentIntentId: `pi_test_${Date.now() - 3000000}`
          }
        },
        // Pending invoice (for testing)
        {
          userId,
          invoiceNumber: `INV-${Date.now() + 1000000}-005`,
          subtotal: 12.99,
          taxAmount: 0,
          amount: 12.99,
          currency: 'USD',
          status: 'pending',
          planName: monthlyPlan?.name || 'Professional Monthly',
          planId: monthlyPlan?._id,
          billingCycle: 'monthly',
          paymentMethodId: defaultPaymentMethod._id,
          paymentMethodType: defaultPaymentMethod.brand || 'visa',
          paymentMethodLast4: defaultPaymentMethod.last4,
          paidAt: null,
          invoiceDate: new Date(),
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
          description: 'Monthly subscription renewal - Professional Plan',
          createdAt: new Date(),
          metadata: {
            stripeInvoiceId: `in_test_${Date.now() + 1000000}`,
            stripeSubscriptionId: `sub_test_${Date.now()}`
          }
        }
      ];

      const createdInvoices = await Invoice.insertMany(invoices);
      console.log(`✅ Created ${createdInvoices.length} invoices`);

      // Create invoice items for each invoice
      console.log('\n📋 Creating invoice items...');
      const invoiceItems = [];

      for (const invoice of createdInvoices) {
        // Main subscription item
        invoiceItems.push({
          invoiceId: invoice._id,
          description: invoice.description,
          quantity: 1,
          unitPrice: invoice.subtotal,
          amount: invoice.subtotal,
          type: invoice.billingCycle === 'one-time' ? 'other' : 'subscription',
          createdAt: invoice.createdAt
        });

        // Add tax item if applicable
        if (invoice.taxAmount > 0) {
          invoiceItems.push({
            invoiceId: invoice._id,
            description: 'Tax',
            quantity: 1,
            unitPrice: invoice.taxAmount,
            amount: invoice.taxAmount,
            type: 'tax',
            createdAt: invoice.createdAt
          });
        }
      }

      await InvoiceItem.insertMany(invoiceItems);
      console.log(`✅ Created ${invoiceItems.length} invoice items`);

      // Display summary
      console.log('\n📊 Invoice Summary:');
      createdInvoices.forEach((inv, idx) => {
        const pm = paymentMethods.find(p => p._id.toString() === inv.paymentMethodId?.toString());
        console.log(`\n   ${idx + 1}. ${inv.planName} - ${inv.billingCycle}`);
        console.log(`      Invoice #: ${inv.invoiceNumber}`);
        console.log(`      Amount: ${inv.currency} ${inv.amount.toFixed(2)}`);
        console.log(`      Status: ${inv.status.toUpperCase()}`);
        console.log(`      Payment: ${inv.paymentMethodType?.toUpperCase()} •••• ${pm?.last4 || inv.paymentMethodLast4}`);
        console.log(`      Date: ${inv.invoiceDate.toLocaleDateString()}`);
      });
    } else {
      console.log('⚠️  Invoices already exist, skipping...');
    }

    console.log('\n✅ Test billing data added successfully!');
    console.log('\n📝 Summary:');
    console.log(`   User: ${email}`);
    console.log(`   Payment Methods: ${paymentMethods.length}`);
    const allInvoices = await Invoice.find({ userId });
    console.log(`   Invoices: ${allInvoices.length}`);
    console.log(`   - Paid: ${allInvoices.filter(i => i.status === 'paid').length}`);
    console.log(`   - Pending: ${allInvoices.filter(i => i.status === 'pending').length}`);
    console.log(`   - Failed: ${allInvoices.filter(i => i.status === 'failed').length}`);

    await mongoose.disconnect();
    console.log('\n🔌 Database disconnected');
    console.log('✨ Done!\n');

  } catch (error) {
    console.error('❌ Error adding test billing data:', error);
    if (error instanceof Error) {
      console.error('   Error message:', error.message);
      console.error('   Stack trace:', error.stack);
    }
    process.exit(1);
  }
}

// Run the script
addTestBillingData()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });

