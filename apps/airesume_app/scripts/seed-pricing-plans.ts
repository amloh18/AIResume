import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

import PricingPlan from '../src/models/PricingPlan';

const DEFAULT_PLANS = [
  {
    key: 'starter_monthly',
    name: 'Starter Monthly',
    description: 'Essential tools for resume creation and editing',
    billingCycle: 'monthly',
    price_monthly: 0,
    price: 0,
    sortOrder: 1,
    status: 'active',
    displayOnLanding: true,
    targetAudience: 'all',
    storageLimit: 100,
    features: [
      'Access to ALL templates and snippets',
      'Unlimited CV & Cover Letter Edits',
      'Real-time ATS Scoring & Editor',
      'AI Cover Letter Generator',
      'PDF & DOCX Downloads',
      'Mori AI chat',
      '10 Auto Job Applications (includes CV generation & Journeys)',
    ],
    notIncludedFeatures: [
      'LinkedIn Enhancer',
      'AI Interview Coach Mock Simulator',
      'Unlimited Auto Applications',
    ],
    credits: {
      jobCredits: 10,
      resetSchedule: 'monthly',
    },
    isPopular: false,
    isBestValue: false,
  },
  {
    key: 'starter_yearly',
    name: 'Starter Yearly',
    description: 'Annual plan for ongoing resume improvements',
    billingCycle: 'yearly',
    price_yearly: 19.99,
    price: 19.99,
    sortOrder: 2,
    status: 'active',
    displayOnLanding: true,
    targetAudience: 'all',
    storageLimit: 250,
    features: [
      'Access to ALL templates and snippets',
      'Unlimited CV & Cover Letter Edits',
      'Real-time ATS Scoring & Editor',
      'AI Cover Letter Generator',
      'PDF & DOCX Downloads',
      'Mori AI chat',
    ],
    notIncludedFeatures: [
      'LinkedIn Enhancer',
      'AI Interview Coach Mock Simulator',
      'Unlimited Auto Applications',
    ],
    credits: {
      jobCredits: 50,
      resetSchedule: 'yearly',
    },
    isPopular: false,
    isBestValue: false,
  },
  {
    key: 'focused_monthly',
    name: 'Focused Monthly',
    description: 'Complete suite for active job hunters and interview prep',
    billingCycle: 'monthly',
    price_monthly: 9.99,
    price: 9.99,
    sortOrder: 3,
    status: 'active',
    displayOnLanding: true,
    targetAudience: 'all',
    storageLimit: 500,
    features: [
      'Unlimited CV & Cover Letter Edits',
      'Real-time ATS Scoring & Editor',
      'AI Cover Letter Generator',
      'LinkedIn Enhancer',
      'AI Interview Coach Mock Simulator',
      'Application Tracker (Full Kanban access)',
      'All features unlimited',
    ],
    notIncludedFeatures: [],
    credits: {
      jobCredits: -1,
      resetSchedule: 'monthly',
    },
    isPopular: false,
    isBestValue: false,
  },
  {
    key: 'focused_yearly',
    name: 'Focused Yearly',
    description: 'Ultimate package with priority features for high-growth careers',
    billingCycle: 'yearly',
    price_yearly: 79.99,
    price: 79.99,
    sortOrder: 4,
    status: 'active',
    displayOnLanding: true,
    targetAudience: 'all',
    storageLimit: 1000,
    features: [
      'Unlimited CV & Cover Letter Edits',
      'Real-time ATS Scoring & Editor',
      'AI Cover Letter Generator',
      'LinkedIn Enhancer',
      'AI Interview Coach Mock Simulator',
      'Application Tracker (Full Kanban access)',
      'All features unlimited',
    ],
    notIncludedFeatures: [],
    credits: {
      jobCredits: -1,
      resetSchedule: 'yearly',
    },
    isPopular: true,
    isBestValue: true,
  },
];

async function seedPricingPlans() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('❌ MONGODB_URI not found in environment');
    process.exit(1);
  }

  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected.');

    for (const planData of DEFAULT_PLANS) {
      const existing = await PricingPlan.findOne({ key: planData.key });
      if (existing) {
        console.log(`ℹ️ Plan ${planData.key} already exists. Updating...`);
        await PricingPlan.updateOne({ key: planData.key }, { $set: planData });
      } else {
        console.log(`✨ Creating plan ${planData.key}...`);
        await PricingPlan.create(planData);
      }
    }

    console.log('🎉 Successfully seeded default pricing plans!');
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to seed pricing plans:', error);
    process.exit(1);
  }
}

seedPricingPlans();
