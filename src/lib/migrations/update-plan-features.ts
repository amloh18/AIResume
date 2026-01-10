/**
 * Migration Script: Update Pricing Plan Features
 * 
 * Run with: npx ts-node --project tsconfig.json src/lib/migrations/update-plan-features.ts
 * Or: node -r ts-node/register src/lib/migrations/update-plan-features.ts
 * 
 * This script updates the features and descriptions for all pricing plans in the database.
 * Prices are preserved - only features and descriptions are updated.
 */

import { connectToDatabase } from '../database';
import PricingPlan from '../../models/PricingPlan';

const updatedPlans = [
    {
        key: 'free',
        description: 'Get started with your first professional CV',
        features: [
            'Create your first CV',
            'Access to basic templates',
            'Basic spelling & grammar check',
            'PDF download'
        ],
        notIncludedFeatures: [
            'DOCX export',
            'Cover Letter generator',
            'Interview Coach'
        ]
    },
    {
        key: 'day_pass',
        description: '24-hour unlimited access to premium tools',
        features: [
            'Unlimited CV creation',
            'All premium templates',
            'PDF & DOCX export',
            'Manual Cover Letter editor',
            'Deep ATS optimization',
            'Standard support'
        ],
        notIncludedFeatures: [
            'Interview Coach',
            'Job Application Tracker',
            'Advanced analytics'
        ]
    },
    {
        key: 'pro_monthly',
        description: 'Complete career toolkit with monthly flexibility',
        features: [
            'Unlimited CV creation',
            'All premium templates',
            'AI-powered Cover Letter generator',
            'Job Application Tracker',
            'Deep ATS optimization',
            'Chrome Extension for job saving',
            'Interview Coach with AI feedback',
            'Advanced career analytics',
            'Standard support'
        ],
        notIncludedFeatures: []
    },
    {
        key: 'pro_quarterly',
        description: 'Best value with priority support included',
        features: [
            'Everything in Monthly plan',
            'Priority support'
        ],
        notIncludedFeatures: []
    },
    {
        key: 'pro_lifetime',
        description: 'One-time payment for lifetime access',
        features: [
            'All Professional features forever',
            'Priority support',
            'Early access to new features'
        ],
        notIncludedFeatures: []
    }
];

async function updatePlanFeatures() {
    try {
        console.log('Connecting to database...');
        await connectToDatabase();

        console.log('Updating pricing plans...');

        for (const planUpdate of updatedPlans) {
            const result = await PricingPlan.findOneAndUpdate(
                { key: planUpdate.key },
                {
                    $set: {
                        description: planUpdate.description,
                        features: planUpdate.features,
                        notIncludedFeatures: planUpdate.notIncludedFeatures
                    }
                },
                { new: true }
            );

            if (result) {
                console.log(`✅ Updated: ${planUpdate.key} - "${planUpdate.description}"`);
            } else {
                console.log(`⚠️  Plan not found in database: ${planUpdate.key} (will use fallback)`);
            }
        }

        console.log('\n✅ Database update complete!');
        console.log('Note: If plans were not found, the application will use the updated fallback code.');

    } catch (error) {
        console.error('❌ Error updating plans:', error);
        process.exit(1);
    }

    process.exit(0);
}

// Run the migration
updatePlanFeatures();
