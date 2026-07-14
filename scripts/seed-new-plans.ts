import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

import PricingPlan from '../src/models/PricingPlan';

const newPlans = [
  {
    key: 'starter_monthly',
    name: 'Starter Monthly',
    description: 'Basic CV creation for job applications',
    billingCycle: 'monthly',
    status: 'active',
    isPopular: false,
    isBestValue: false,
    sortOrder: 1,
    displayOnLanding: true,
    targetAudience: 'all',
    storageLimit: 100,
    credits: {
      cvCredits: 1,
      exportCredits: 1,
      atsCheckCredits: 0,
      jobCredits: 3,
      resetSchedule: 'monthly'
    },
    features: [
      'Access to ALL templates and snippets',
      'Basic AI Writing (Grammar & rephrasing)',
      'Limited Free AI Credits'
    ],
    notIncludedFeatures: [
      'Unlimited CV & Cover Letter Edits',
      'Real-time ATS Scoring & Editor',
      'AI Cover Letter Generator',
      'LinkedIn Enhancer',
      'Interview Coach Simulator',
      'Application Tracker'
    ],
    regionalPricing: [
      { region: 'US', currency: 'USD', billingCycle: 'monthly', price: 0, displayPrice: 'Free', polarPriceId: '' },
      { region: 'GB', currency: 'GBP', billingCycle: 'monthly', price: 0, displayPrice: 'Free', polarPriceId: '' },
      { region: 'IN', currency: 'INR', billingCycle: 'monthly', price: 0, displayPrice: 'Free', polarPriceId: '' }
    ]
  },
  {
    key: 'starter_yearly',
    name: 'Starter Yearly',
    description: 'Unlimited CV & Cover letter editing with live ATS checks',
    billingCycle: 'yearly',
    status: 'active',
    isPopular: false,
    isBestValue: false,
    sortOrder: 2,
    displayOnLanding: true,
    targetAudience: 'all',
    storageLimit: 1000,
    // Standard price fields
    price_yearly: 39.99,
    // Promotional discount fields
    promotionalPrice_yearly: 19.99,
    promotionValidFrom: new Date('2026-01-01'),
    promotionValidUntil: new Date('2036-12-31'),
    promotionDescription: 'Limited time offer - 50% Off!',
    credits: {
      cvCredits: -1,
      exportCredits: -1,
      atsCheckCredits: -1,
      jobCredits: 0,
      resetSchedule: 'yearly'
    },
    features: [
      'Access to ALL templates and snippets',
      'Unlimited CV & Cover Letter Edits',
      'Real-time ATS Scoring & Editor',
      'AI Cover Letter Generator',
      'PDF & DOCX Downloads'
    ],
    notIncludedFeatures: [
      'LinkedIn Enhancer',
      'Interview Coach Simulator',
      'Application Tracker',
      'Auto Job Application Bot'
    ],
    regionalPricing: [
      { region: 'US', currency: 'USD', billingCycle: 'yearly', price: 39.99, displayPrice: '$39.99', polarPriceId: 'price_starter_yearly_us' },
      { region: 'GB', currency: 'GBP', billingCycle: 'yearly', price: 34.99, displayPrice: '£34.99', polarPriceId: 'price_starter_yearly_gb' },
      { region: 'IN', currency: 'INR', billingCycle: 'yearly', price: 1499, displayPrice: '₹1499', polarPriceId: 'price_starter_yearly_in' }
    ]
  },
  {
    key: 'focused_monthly',
    name: 'Focused Monthly',
    description: 'Complete career toolkit with job tracking and AI interview prep',
    billingCycle: 'monthly',
    status: 'active',
    isPopular: false,
    isBestValue: false,
    sortOrder: 3,
    displayOnLanding: true,
    targetAudience: 'all',
    storageLimit: 5000,
    price_monthly: 9.99,
    credits: {
      cvCredits: -1,
      exportCredits: -1,
      atsCheckCredits: -1,
      jobCredits: -1,
      resetSchedule: 'monthly'
    },
    features: [
      'Unlimited CV & Cover Letter Edits',
      'Real-time ATS Scoring & Editor',
      'AI Cover Letter Generator',
      'LinkedIn Enhancer',
      'AI Interview Coach Mock Simulator',
      'Application Tracker (Full Kanban access)',
      'Access to ALL templates and snippets'
    ],
    notIncludedFeatures: [
      'Auto Job Application Bot'
    ],
    regionalPricing: [
      { region: 'US', currency: 'USD', billingCycle: 'monthly', price: 9.99, displayPrice: '$9.99', polarPriceId: 'price_focused_monthly_us' },
      { region: 'GB', currency: 'GBP', billingCycle: 'monthly', price: 8.99, displayPrice: '£8.99', polarPriceId: 'price_focused_monthly_gb' },
      { region: 'IN', currency: 'INR', billingCycle: 'monthly', price: 399, displayPrice: '₹399', polarPriceId: 'price_focused_monthly_in' }
    ]
  },
  {
    key: 'focused_yearly',
    name: 'Focused Yearly',
    description: 'Full career package with significant yearly savings',
    billingCycle: 'yearly',
    status: 'active',
    isPopular: true,
    isBestValue: false,
    sortOrder: 4,
    displayOnLanding: true,
    targetAudience: 'all',
    storageLimit: 5000,
    price_yearly: 79.99,
    credits: {
      cvCredits: -1,
      exportCredits: -1,
      atsCheckCredits: -1,
      jobCredits: -1,
      resetSchedule: 'yearly'
    },
    features: [
      'Unlimited CV & Cover Letter Edits',
      'Real-time ATS Scoring & Editor',
      'AI Cover Letter Generator',
      'LinkedIn Enhancer',
      'AI Interview Coach Mock Simulator',
      'Application Tracker (Full Kanban access)',
      'Access to ALL templates and snippets',
      'Priority Customer Support'
    ],
    notIncludedFeatures: [
      'Auto Job Application Bot'
    ],
    regionalPricing: [
      { region: 'US', currency: 'USD', billingCycle: 'yearly', price: 79.99, displayPrice: '$79.99', polarPriceId: 'price_focused_yearly_us' },
      { region: 'GB', currency: 'GBP', billingCycle: 'yearly', price: 69.99, displayPrice: '£69.99', polarPriceId: 'price_focused_yearly_gb' },
      { region: 'IN', currency: 'INR', billingCycle: 'yearly', price: 2999, displayPrice: '₹2999', polarPriceId: 'price_focused_yearly_in' }
    ]
  },
  {
    key: 'smart_quarterly',
    name: 'Smart Quarterly',
    description: 'All Focused features plus Auto Job Application Bot',
    billingCycle: 'quarterly',
    status: 'active',
    isPopular: false,
    isBestValue: false,
    sortOrder: 5,
    displayOnLanding: true,
    targetAudience: 'all',
    storageLimit: 10000,
    price_quarterly: 59.99,
    credits: {
      cvCredits: -1,
      exportCredits: -1,
      atsCheckCredits: -1,
      jobCredits: -1,
      resetSchedule: 'quarterly'
    },
    features: [
      'Auto Job Application Bot',
      'Unlimited CV & Cover Letter Edits',
      'Real-time ATS Scoring & Editor',
      'AI Cover Letter Generator',
      'LinkedIn Enhancer',
      'AI Interview Coach Mock Simulator',
      'Application Tracker (Full Kanban access)',
      'VIP 24/7 Support'
    ],
    notIncludedFeatures: [],
    regionalPricing: [
      { region: 'US', currency: 'USD', billingCycle: 'quarterly', price: 59.99, displayPrice: '$59.99', polarPriceId: 'price_smart_quarterly_us' },
      { region: 'GB', currency: 'GBP', billingCycle: 'quarterly', price: 49.99, displayPrice: '£49.99', polarPriceId: 'price_smart_quarterly_gb' },
      { region: 'IN', currency: 'INR', billingCycle: 'quarterly', price: 2499, displayPrice: '₹2499', polarPriceId: 'price_smart_quarterly_in' }
    ]
  },
  {
    key: 'smart_yearly',
    name: 'Smart Yearly',
    description: 'The ultimate automated career package for absolute success',
    billingCycle: 'yearly',
    status: 'active',
    isPopular: false,
    isBestValue: true,
    sortOrder: 6,
    displayOnLanding: true,
    targetAudience: 'all',
    storageLimit: 10000,
    price_yearly: 199.00,
    credits: {
      cvCredits: -1,
      exportCredits: -1,
      atsCheckCredits: -1,
      jobCredits: -1,
      resetSchedule: 'yearly'
    },
    features: [
      'Auto Job Application Bot',
      'Unlimited CV & Cover Letter Edits',
      'Real-time ATS Scoring & Editor',
      'AI Cover Letter Generator',
      'LinkedIn Enhancer',
      'AI Interview Coach Mock Simulator',
      'Application Tracker (Full Kanban access)',
      'VIP 24/7 Support'
    ],
    notIncludedFeatures: [],
    regionalPricing: [
      { region: 'US', currency: 'USD', billingCycle: 'yearly', price: 199.00, displayPrice: '$199.00', polarPriceId: 'price_smart_yearly_us' },
      { region: 'GB', currency: 'GBP', billingCycle: 'yearly', price: 169.00, displayPrice: '£169.00', polarPriceId: 'price_smart_yearly_gb' },
      { region: 'IN', currency: 'INR', billingCycle: 'yearly', price: 7999, displayPrice: '₹7999', polarPriceId: 'price_smart_yearly_in' }
    ]
  }
];

async function seed() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI is not set in environment.');
    }
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected.');

    console.log('🧹 Cleaning up plans with typos...');
    await PricingPlan.deleteMany({ key: { $in: ['starter_yealry', 'smart_quaterly'] } });

    for (const plan of newPlans) {
      console.log(`  Updating/Inserting plan: ${plan.name} (${plan.key})...`);
      await PricingPlan.findOneAndUpdate(
        { key: plan.key },
        plan,
        { upsert: true, new: true }
      );
    }

    console.log('🔄 Deactivating old pricing plans...');
    const oldKeys = ['free', 'day_pass', 'pro_monthly', 'pro_quarterly', 'pro_yearly', 'pro_lifetime'];
    const deactivateResult = await PricingPlan.updateMany(
      { key: { $in: oldKeys } },
      { $set: { status: 'inactive', displayOnLanding: false } }
    );
    console.log(`✅ Deactivated ${deactivateResult.modifiedCount} old plans.`);

    console.log('✅ Seeding complete.');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected.');
  }
}

seed();
