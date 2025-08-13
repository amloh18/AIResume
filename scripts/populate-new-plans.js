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

// Define the PricingPlan schema (simplified version for the script)
const pricingPlanSchema = new mongoose.Schema({
  key: String,
  name: String,
  description: String,
  price_monthly: Number,
  price_quarterly: Number,
  price_yearly: Number,
  price_one_time: Number,
  currency: String,
  billingCycle: String,
  maxCVs: Number,
  maxExports: Number,
  storageLimit: Number,
  features: [String],
  status: String,
  isPopular: Boolean,
  isBestValue: Boolean,
  sortOrder: Number,
  stripePriceId_monthly: String,
  stripePriceId_quarterly: String,
  stripePriceId_yearly: String,
  stripePriceId_one_time: String,
  razorpayPlanId_monthly: String,
  razorpayPlanId_quarterly: String,
  razorpayPlanId_yearly: String,
  dayPassDuration: Number
}, { timestamps: true });

const PricingPlan = mongoose.model('PricingPlan', pricingPlanSchema);

// New pricing plans data
const pricingPlans = [
  {
    key: 'free',
    name: 'Free',
    description: 'First-time users, casual job seekers',
    price_monthly: 0,
    price_quarterly: 0,
    price_yearly: 0,
    price_one_time: 0,
    currency: 'EUR',
    billingCycle: 'one-time',
    maxCVs: 3,
    maxExports: 1,
    storageLimit: 50,
    features: ['3 CVs', '1 Export', 'Basic Templates', 'Email Support'],
    status: 'active',
    isPopular: false,
    isBestValue: false,
    sortOrder: 1
  },
  {
    key: 'day_pass',
    name: 'Day Pass',
    description: 'Quick job applications, one-day polishers',
    price_monthly: null,
    price_quarterly: null,
    price_yearly: null,
    price_one_time: 2.99,
    currency: 'EUR',
    billingCycle: 'one-time',
    maxCVs: 5,
    maxExports: 5,
    storageLimit: 100,
    features: ['5 CVs', '5 Exports', 'AI Assistant', 'Cover Letters', '24-hour access'],
    status: 'active',
    isPopular: true,
    isBestValue: false,
    sortOrder: 2,
    dayPassDuration: 24
  },
  {
    key: 'pro_monthly',
    name: 'Monthly Pro',
    description: 'Active job seekers needing all tools',
    price_monthly: 19,
    price_quarterly: null,
    price_yearly: null,
    price_one_time: null,
    currency: 'EUR',
    billingCycle: 'monthly',
    maxCVs: -1, // Unlimited
    maxExports: -1, // Unlimited
    storageLimit: 500,
    features: ['Unlimited CVs', 'Unlimited Exports', 'AI Assistant', 'Cover Letters', 'Job Tracker', 'Community Access'],
    status: 'active',
    isPopular: false,
    isBestValue: false,
    sortOrder: 3
  },
  {
    key: 'pro_quarterly',
    name: 'Quarterly Pro',
    description: 'Consistent job hunting or portfolio building',
    price_monthly: null,
    price_quarterly: 49,
    price_yearly: null,
    price_one_time: null,
    currency: 'EUR',
    billingCycle: 'quarterly',
    maxCVs: -1, // Unlimited
    maxExports: -1, // Unlimited
    storageLimit: 1000,
    features: ['Unlimited CVs', 'Unlimited Exports', 'AI Assistant', 'Cover Letters', 'Job Tracker', 'Community Access', 'Priority Support'],
    status: 'active',
    isPopular: true,
    isBestValue: false,
    sortOrder: 4
  },
  {
    key: 'pro_yearly',
    name: 'Yearly Pro',
    description: 'Long-term career builders or professionals',
    price_monthly: null,
    price_quarterly: null,
    price_yearly: 120,
    price_one_time: null,
    currency: 'EUR',
    billingCycle: 'yearly',
    maxCVs: -1, // Unlimited
    maxExports: -1, // Unlimited
    storageLimit: 2000,
    features: ['Unlimited CVs', 'Unlimited Exports', 'AI Assistant', 'Cover Letters', 'Job Tracker', 'Community Access', 'Priority Support', 'Custom Templates'],
    status: 'active',
    isPopular: false,
    isBestValue: true,
    sortOrder: 5
  }
];

async function populateNewPlans() {
  try {
    console.log('🔄 Starting new pricing plans population...');

    // Clear existing pricing plans
    await PricingPlan.deleteMany({});
    console.log('🗑️  Cleared existing pricing plans');

    // Insert new pricing plans
    const createdPlans = await PricingPlan.insertMany(pricingPlans);
    console.log(`✅ Successfully created ${createdPlans.length} pricing plans`);

    // Display created plans
    console.log('\n📋 Created Pricing Plans:');
    createdPlans.forEach((plan, index) => {
      console.log(`${index + 1}. ${plan.name} (${plan.key})`);
      console.log(`   Description: ${plan.description}`);
      
      // Show pricing based on plan type
      if (plan.key === 'free') {
        console.log(`   Price: Free`);
      } else if (plan.key === 'day_pass') {
        console.log(`   Price: €${plan.price_one_time} (one-time)`);
        console.log(`   Duration: ${plan.dayPassDuration} hours`);
      } else if (plan.key === 'pro_monthly') {
        console.log(`   Price: €${plan.price_monthly}/month`);
      } else if (plan.key === 'pro_quarterly') {
        console.log(`   Price: €${plan.price_quarterly}/quarter`);
      } else if (plan.key === 'pro_yearly') {
        console.log(`   Price: €${plan.price_yearly}/year`);
      }
      
      console.log(`   Features: ${plan.maxCVs === -1 ? 'Unlimited' : plan.maxCVs} CVs, ${plan.maxExports === -1 ? 'Unlimited' : plan.maxExports} exports`);
      console.log(`   Features: ${plan.features.join(', ')}`);
      console.log(`   Status: ${plan.status}`);
      console.log(`   Popular: ${plan.isPopular ? '⭐' : '❌'}`);
      console.log(`   Best Value: ${plan.isBestValue ? '🏆' : '❌'}`);
      console.log('');
    });

    console.log('🎉 New pricing plans population completed successfully!');
  } catch (error) {
    console.error('❌ Error populating new pricing plans:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the script
if (require.main === module) {
  connectDB().then(() => {
    populateNewPlans();
  });
}

module.exports = { populateNewPlans };
