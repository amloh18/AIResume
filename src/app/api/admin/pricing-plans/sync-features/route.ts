import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import PricingPlan from '@/models/PricingPlan';
import { requireAdmin } from '@/lib/middleware/admin-auth';

/**
 * POST /api/admin/pricing-plans/sync-features
 * 
 * Syncs pricing plan features from the latest specification.
 * This updates features and descriptions while preserving prices.
 */

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

export async function POST(request: NextRequest) {
    try {
        await requireAdmin(request);
        await getConnection();

        const results: { key: string; status: string }[] = [];

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
                results.push({ key: planUpdate.key, status: 'updated' });
            } else {
                results.push({ key: planUpdate.key, status: 'not_found (using fallback)' });
            }
        }

        return NextResponse.json({
            success: true,
            message: 'Pricing plan features synced successfully',
            results
        });

    } catch (error: any) {
        console.error('Error syncing plan features:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to sync plan features', details: error.message },
            { status: 500 }
        );
    }
}
