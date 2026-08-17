import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import PricingPlan from '@/models/PricingPlan';
import { requireAdmin } from '@/lib/middleware/admin-auth';

/**
 * POST /api/admin/pricing-plans/rename-yearly-to-lifetime
 * 
 * One-time migration to rename pro_yearly to pro_lifetime in the database.
 */

export async function POST(request: NextRequest) {
    try {
        await requireAdmin(request);
        await getConnection();

        // Find and update the pro_yearly plan to pro_lifetime
        const result = await PricingPlan.findOneAndUpdate(
            { key: 'pro_yearly' },
            {
                $set: {
                    key: 'pro_lifetime',
                    name: 'Lifetime',
                    description: 'One-time payment for lifetime access',
                    features: [
                        'All Professional features forever',
                        'Priority support',
                        'Early access to new features'
                    ],
                    notIncludedFeatures: [],
                    billingCycle: 'one-time',
                    isBestValue: true
                }
            },
            { new: true }
        );

        if (result) {
            return NextResponse.json({
                success: true,
                message: 'Successfully renamed pro_yearly to pro_lifetime',
                plan: {
                    key: result.key,
                    name: result.name,
                    description: result.description
                }
            });
        } else {
            // Check if pro_lifetime already exists
            const existingLifetime = await PricingPlan.findOne({ key: 'pro_lifetime' });
            if (existingLifetime) {
                return NextResponse.json({
                    success: true,
                    message: 'pro_lifetime already exists in database',
                    plan: {
                        key: existingLifetime.key,
                        name: existingLifetime.name
                    }
                });
            }

            return NextResponse.json({
                success: false,
                message: 'Neither pro_yearly nor pro_lifetime found in database. Using fallback plans.'
            });
        }

    } catch (error: any) {
        console.error('Error renaming plan:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to rename plan', details: error.message },
            { status: 500 }
        );
    }
}
