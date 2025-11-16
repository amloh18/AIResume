/**
 * Migration Script: Full Payment System Integration
 * 
 * This script migrates existing data to support the new payment system:
 * 1. Adds gateway_customer_id to existing PaymentMethod records (if available)
 * 2. Adds subtotal and tax_amount to existing Invoice records
 * 3. Creates InvoiceItem records from existing Invoice data
 * 4. Creates Transaction records from existing Invoice records (if possible)
 * 5. Creates UserBillingProfile records from user data
 * 6. Seeds initial TaxRate data for common countries
 * 7. Creates SubscriptionDiscount records for existing subscriptions with discounts
 */

import mongoose from 'mongoose';
import { getConnection } from '../src/lib/database/connection-manager';
import User from '../src/models/User';
import PaymentMethod from '../src/models/PaymentMethod';
import Invoice from '../src/models/Invoice';
import InvoiceItem from '../src/models/InvoiceItem';
import Transaction from '../src/models/Transaction';
import UserBillingProfile from '../src/models/UserBillingProfile';
import TaxRate from '../src/models/TaxRate';
import Subscription from '../src/models/Subscription';
import SubscriptionDiscount from '../src/models/SubscriptionDiscount';

async function migratePaymentSystem() {
  try {
    console.log('🚀 Starting payment system migration...');
    
    await getConnection();
    console.log('✅ Database connected');

    // 1. Migrate PaymentMethod records - add gateway_customer_id if available from user subscription
    console.log('\n📝 Step 1: Migrating PaymentMethod records...');
    const paymentMethods = await PaymentMethod.find({});
    let paymentMethodsUpdated = 0;
    
    for (const pm of paymentMethods) {
      const user = await User.findById(pm.userId);
      if (user?.subscription?.providerCustomerId) {
        if (!pm.gatewayCustomerId) {
          pm.gatewayCustomerId = user.subscription.providerCustomerId;
          await pm.save();
          paymentMethodsUpdated++;
        }
      }
    }
    console.log(`✅ Updated ${paymentMethodsUpdated} payment methods with gateway customer IDs`);

    // 2. Migrate Invoice records - add subtotal and tax_amount
    console.log('\n📝 Step 2: Migrating Invoice records...');
    const invoices = await Invoice.find({});
    let invoicesUpdated = 0;
    let invoiceItemsCreated = 0;
    
    for (const invoice of invoices) {
      let needsUpdate = false;
      
      // Add subtotal if missing (default to amount)
      if (invoice.subtotal === undefined || invoice.subtotal === null) {
        invoice.subtotal = invoice.amount;
        needsUpdate = true;
      }
      
      // Add tax_amount if missing (default to 0)
      if (invoice.taxAmount === undefined || invoice.taxAmount === null) {
        invoice.taxAmount = 0;
        needsUpdate = true;
      }
      
      // Add invoiceDate if missing
      if (!invoice.invoiceDate) {
        invoice.invoiceDate = invoice.createdAt;
        needsUpdate = true;
      }
      
      if (needsUpdate) {
        await invoice.save();
        invoicesUpdated++;
      }
      
      // Create InvoiceItem if it doesn't exist
      const existingItems = await InvoiceItem.find({ invoiceId: invoice._id });
      if (existingItems.length === 0) {
        await InvoiceItem.create({
          invoiceId: invoice._id,
          description: invoice.description || `${invoice.planName} - ${invoice.billingCycle}`,
          quantity: 1,
          unitPrice: invoice.subtotal || invoice.amount,
          amount: invoice.subtotal || invoice.amount,
          type: 'subscription'
        });
        invoiceItemsCreated++;
      }
    }
    console.log(`✅ Updated ${invoicesUpdated} invoices with subtotal/tax fields`);
    console.log(`✅ Created ${invoiceItemsCreated} invoice items`);

    // 3. Create Transaction records from existing Invoice records
    console.log('\n📝 Step 3: Creating Transaction records from invoices...');
    let transactionsCreated = 0;
    
    for (const invoice of invoices) {
      if (invoice.status === 'paid' && invoice.metadata) {
        // Check if transaction already exists
        const gatewayRef = invoice.metadata.stripePaymentIntentId || 
                          invoice.metadata.stripeInvoiceId || 
                          invoice.metadata.stripeSessionId ||
                          invoice.metadata.razorpayPaymentId ||
                          invoice.metadata.razorpayInvoiceId ||
                          invoice.metadata.razorpayOrderId;
        
        if (gatewayRef) {
          const existingTransaction = await Transaction.findOne({
            gatewayReferenceId: gatewayRef
          });
          
          if (!existingTransaction) {
            await Transaction.create({
              invoiceId: invoice._id,
              paymentMethodId: invoice.paymentMethodId,
              amount: invoice.amount,
              status: invoice.status === 'paid' ? 'success' : 'pending',
              gatewayReferenceId: gatewayRef,
              gateway: invoice.metadata.stripePaymentIntentId || invoice.metadata.stripeInvoiceId || invoice.metadata.stripeSessionId ? 'stripe' : 'razorpay',
              metadata: invoice.metadata
            });
            transactionsCreated++;
          }
        }
      }
    }
    console.log(`✅ Created ${transactionsCreated} transaction records`);

    // 4. Create UserBillingProfile records from user data
    console.log('\n📝 Step 4: Creating UserBillingProfile records...');
    const users = await User.find({});
    let profilesCreated = 0;
    
    for (const user of users) {
      const existingProfile = await UserBillingProfile.findOne({ userId: user._id });
      
      if (!existingProfile) {
        // Determine billing country and currency from user data
        const countryCode = user.ip_location?.match(/\(([A-Z]{2})\)/)?.[1] || 
                           user.region?.split(' ').pop()?.toUpperCase() || 
                           'US';
        
        // Map country to currency
        const currencyMap: Record<string, string> = {
          'US': 'USD',
          'GB': 'GBP',
          'IN': 'INR',
          'CA': 'CAD',
          'AU': 'AUD',
          'EU': 'EUR',
        };
        
        const currency = currencyMap[countryCode] || 'USD';
        
        await UserBillingProfile.create({
          userId: user._id,
          billingCountryCode: countryCode,
          billingCurrency: currency
        });
        profilesCreated++;
      }
    }
    console.log(`✅ Created ${profilesCreated} user billing profiles`);

    // 5. Seed initial TaxRate data for common countries
    console.log('\n📝 Step 5: Seeding TaxRate data...');
    const taxRates = [
      { countryCode: 'US', taxType: 'Sales Tax', rate: 0, description: 'Sales tax varies by state' },
      { countryCode: 'GB', taxType: 'VAT', rate: 20, description: 'UK VAT' },
      { countryCode: 'IN', taxType: 'GST', rate: 18, description: 'India GST' },
      { countryCode: 'CA', taxType: 'GST/HST', rate: 5, description: 'Canada GST (varies by province)' },
      { countryCode: 'AU', taxType: 'GST', rate: 10, description: 'Australia GST' },
      { countryCode: 'DE', taxType: 'VAT', rate: 19, description: 'Germany VAT' },
      { countryCode: 'FR', taxType: 'VAT', rate: 20, description: 'France VAT' },
      { countryCode: 'IT', taxType: 'VAT', rate: 22, description: 'Italy VAT' },
      { countryCode: 'ES', taxType: 'VAT', rate: 21, description: 'Spain VAT' },
      { countryCode: 'NL', taxType: 'VAT', rate: 21, description: 'Netherlands VAT' },
    ];
    
    let taxRatesCreated = 0;
    for (const taxRateData of taxRates) {
      const existing = await TaxRate.findOne({
        countryCode: taxRateData.countryCode,
        isActive: true
      });
      
      if (!existing) {
        await TaxRate.create({
          ...taxRateData,
          effectiveFrom: new Date(),
          isActive: true
        });
        taxRatesCreated++;
      }
    }
    console.log(`✅ Created ${taxRatesCreated} tax rate records`);

    // 6. Create SubscriptionDiscount records for existing subscriptions with discounts
    console.log('\n📝 Step 6: Creating SubscriptionDiscount records...');
    const subscriptions = await Subscription.find({
      discountCodeId: { $exists: true, $ne: null }
    });
    let discountsCreated = 0;
    
    for (const subscription of subscriptions) {
      const existing = await SubscriptionDiscount.findOne({
        subscriptionId: subscription._id
      });
      
      if (!existing && subscription.discountCodeId) {
        await SubscriptionDiscount.create({
          subscriptionId: subscription._id,
          discountId: subscription.discountCodeId,
          discountAmount: subscription.discountAmount || 0,
          discountType: 'fixed', // Default to fixed, can be updated manually
          appliedAt: subscription.createdAt
        });
        discountsCreated++;
      }
    }
    console.log(`✅ Created ${discountsCreated} subscription discount records`);

    console.log('\n✅ Migration completed successfully!');
    console.log('\nSummary:');
    console.log(`- Payment Methods updated: ${paymentMethodsUpdated}`);
    console.log(`- Invoices updated: ${invoicesUpdated}`);
    console.log(`- Invoice Items created: ${invoiceItemsCreated}`);
    console.log(`- Transactions created: ${transactionsCreated}`);
    console.log(`- User Billing Profiles created: ${profilesCreated}`);
    console.log(`- Tax Rates created: ${taxRatesCreated}`);
    console.log(`- Subscription Discounts created: ${discountsCreated}`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
}

// Run migration if called directly
if (require.main === module) {
  migratePaymentSystem()
    .then(() => {
      console.log('✅ Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration script failed:', error);
      process.exit(1);
    });
}

export default migratePaymentSystem;

