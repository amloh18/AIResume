const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

// Connect to MongoDB
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

// Define schemas inline (simplified versions for the script)
const userSchema = new mongoose.Schema({
  email: String,
  firstName: String,
  lastName: String
}, { timestamps: true });

const paymentMethodSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  type: String,
  provider: String,
  last4: String,
  brand: String,
  expiryMonth: Number,
  expiryYear: Number,
  isDefault: Boolean,
  isActive: Boolean,
  email: String,
  accountName: String
}, { timestamps: true });

const invoiceSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  invoiceNumber: String,
  amount: Number,
  currency: String,
  status: String,
  planName: String,
  planId: { type: mongoose.Schema.Types.ObjectId, ref: 'PricingPlan' },
  billingCycle: String,
  paymentMethodType: String,
  paymentMethodLast4: String,
  paidAt: Date,
  dueDate: Date,
  description: String
}, { timestamps: true });

const pricingPlanSchema = new mongoose.Schema({
  name: String,
  price: Number,
  currency: String,
  billingCycle: String
}, { timestamps: true });

const User = mongoose.model('User', userSchema);
const PaymentMethod = mongoose.model('PaymentMethod', paymentMethodSchema);
const Invoice = mongoose.model('Invoice', invoiceSchema);
const PricingPlan = mongoose.model('PricingPlan', pricingPlanSchema);

async function populateBillingData() {
  try {
    console.log('🔄 Starting billing data population...');

    // Find a user to associate with
    const user = await User.findOne({});
    if (!user) {
      console.log('❌ No user found. Please create a user first.');
      return;
    }

    // Find a pricing plan
    const pricingPlan = await PricingPlan.findOne({});
    if (!pricingPlan) {
      console.log('❌ No pricing plan found. Please run populate-pricing-plans.js first.');
      return;
    }

    console.log(`👤 Using user: ${user.email}`);
    console.log(`📋 Using plan: ${pricingPlan.name}`);

    // Clear existing payment methods and invoices for this user
    await PaymentMethod.deleteMany({ userId: user._id });
    await Invoice.deleteMany({ userId: user._id });
    console.log('🗑️  Cleared existing billing data');

    // Create sample payment methods
    const paymentMethods = [
      {
        userId: user._id,
        type: 'credit_card',
        provider: 'visa',
        last4: '8806',
        brand: 'Visa',
        expiryMonth: 3,
        expiryYear: 2027,
        isDefault: true,
        isActive: true
      },
      {
        userId: user._id,
        type: 'credit_card',
        provider: 'mastercard',
        last4: '3319',
        brand: 'Mastercard',
        expiryMonth: 8,
        expiryYear: 2029,
        isDefault: false,
        isActive: true
      },
      {
        userId: user._id,
        type: 'paypal',
        provider: 'paypal',
        isDefault: false,
        isActive: true,
        email: 'ryan.almeida@email.com',
        accountName: 'PayPal Account'
      }
    ];

    const createdPaymentMethods = await PaymentMethod.insertMany(paymentMethods);
    console.log(`✅ Created ${createdPaymentMethods.length} payment methods`);

    // Create sample invoices
    const invoices = [];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    const currentYear = new Date().getFullYear();

    for (let i = 0; i < 6; i++) {
      const month = months[i];
      const year = currentYear;
      const date = new Date(year, i, 1);
      
      invoices.push({
        userId: user._id,
        invoiceNumber: `INV-${year}${String(i + 1).padStart(2, '0')}01-${String(i + 1).padStart(3, '0')}`,
        amount: 10.00,
        currency: 'USD',
        status: 'paid',
        planName: 'Personal Plan',
        planId: pricingPlan._id,
        billingCycle: 'monthly',
        paymentMethodType: i % 2 === 0 ? 'visa' : 'mastercard',
        paymentMethodLast4: i % 2 === 0 ? '8806' : '3319',
        paidAt: date,
        dueDate: date,
        description: `Personal Plan - ${month} ${year}`
      });
    }

    const createdInvoices = await Invoice.insertMany(invoices);
    console.log(`✅ Created ${createdInvoices.length} invoices`);

    // Display created data
    console.log('\n📋 Created Payment Methods:');
    createdPaymentMethods.forEach((method, index) => {
      if (method.type === 'credit_card') {
        console.log(`${index + 1}. ${method.brand} ending ${method.last4} (Expires ${method.expiryMonth}/${method.expiryYear})`);
      } else {
        console.log(`${index + 1}. PayPal - ${method.email}`);
      }
    });

    console.log('\n📋 Created Invoices:');
    createdInvoices.forEach((invoice, index) => {
      console.log(`${index + 1}. ${invoice.planName} - ${invoice.description}`);
      console.log(`   Amount: ${invoice.currency} $${invoice.amount.toFixed(2)}`);
      console.log(`   Status: ${invoice.status}`);
      console.log(`   Payment: ${invoice.paymentMethodType} *** ${invoice.paymentMethodLast4}`);
      console.log('');
    });

    console.log('🎉 Billing data population completed successfully!');
  } catch (error) {
    console.error('❌ Error populating billing data:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the script
if (require.main === module) {
  connectDB().then(() => {
    populateBillingData();
  });
}

module.exports = { populateBillingData };
