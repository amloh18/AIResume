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
  name: String,
  description: String,
  price: Number,
  currency: String,
  billingCycle: String,
  maxCVs: Number,
  maxExports: Number,
  storageLimit: Number,
  features: [String],
  status: String,
  isPopular: Boolean,
  sortOrder: Number
}, { timestamps: true });

const PricingPlan = mongoose.model('PricingPlan', pricingPlanSchema);

// Pricing plans data from the landing page
const pricingPlans = [
  {
    name: 'Free Plan',
    description: 'First-time users, casual job seekers',
    price: 0,
    currency: 'EUR',
    billingCycle: 'one-time',
    maxCVs: 3,
    maxExports: 1,
    storageLimit: 50,
    features: ['3 CVs', '1 Export', 'Basic Templates'],
    status: 'active',
    isPopular: false,
    sortOrder: 1
  },
  {
    name: 'Day Pass',
    description: 'Quick job applications, one-day polishers',
    price: 2.99,
    currency: 'EUR',
    billingCycle: 'one-time',
    maxCVs: 5,
    maxExports: 5,
    storageLimit: 100,
    features: ['5 CVs', '5 Exports', 'AI Assistant', 'Cover Letters'],
    status: 'active',
    isPopular: true,
    sortOrder: 2
  },
  {
    name: 'Monthly Pro',
    description: 'Active job seekers needing all tools',
    price: 19,
    currency: 'EUR',
    billingCycle: 'monthly',
    maxCVs: -1, // Unlimited
    maxExports: -1, // Unlimited
    storageLimit: 500,
    features: ['Unlimited CVs', 'Unlimited Exports', 'AI Assistant', 'Cover Letters', 'Job Tracker', 'Community Access'],
    status: 'active',
    isPopular: false,
    sortOrder: 3
  },
  {
    name: 'Quarterly Pro',
    description: 'Consistent job hunting or portfolio building',
    price: 49,
    currency: 'EUR',
    billingCycle: 'yearly',
    maxCVs: -1, // Unlimited
    maxExports: -1, // Unlimited
    storageLimit: 1000,
    features: ['Unlimited CVs', 'Unlimited Exports', 'AI Assistant', 'Cover Letters', 'Job Tracker', 'Community Access', 'Priority Support'],
    status: 'active',
    isPopular: true,
    sortOrder: 4
  },
  {
    name: 'Annual Pro',
    description: 'Long-term career builders or professionals',
    price: 120,
    currency: 'EUR',
    billingCycle: 'yearly',
    maxCVs: -1, // Unlimited
    maxExports: -1, // Unlimited
    storageLimit: 2000,
    features: ['Unlimited CVs', 'Unlimited Exports', 'AI Assistant', 'Cover Letters', 'Job Tracker', 'Community Access', 'Priority Support', 'Custom Templates'],
    status: 'active',
    isPopular: false,
    sortOrder: 5
  }
];

async function populatePricingPlans() {
  try {
    console.log('🔄 Starting pricing plans population...');

    // Clear existing pricing plans
    await PricingPlan.deleteMany({});
    console.log('🗑️  Cleared existing pricing plans');

    // Insert new pricing plans
    const createdPlans = await PricingPlan.insertMany(pricingPlans);
    console.log(`✅ Successfully created ${createdPlans.length} pricing plans`);

    // Display created plans
    console.log('\n📋 Created Pricing Plans:');
    createdPlans.forEach((plan, index) => {
      console.log(`${index + 1}. ${plan.name} - €${plan.price} (${plan.billingCycle})`);
      console.log(`   Description: ${plan.description}`);
      console.log(`   Features: ${plan.maxCVs === -1 ? 'Unlimited' : plan.maxCVs} CVs, ${plan.maxExports === -1 ? 'Unlimited' : plan.maxExports} exports`);
      console.log(`   Features: ${plan.features.join(', ')}`);
      console.log(`   Status: ${plan.status}`);
      console.log(`   Popular: ${plan.isPopular ? '⭐' : '❌'}`);
      console.log('');
    });

    console.log('🎉 Pricing plans population completed successfully!');
  } catch (error) {
    console.error('❌ Error populating pricing plans:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the script
if (require.main === module) {
  connectDB().then(() => {
    populatePricingPlans();
  });
}

module.exports = { populatePricingPlans };
