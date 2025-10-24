import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
// Removed - using Clerk now
import { connectToDatabase } from '@/lib/database';
import { getAdminPricingPlan } from '@/models/admin-models';
import { Types } from 'mongoose';

export async function POST(
    request: NextRequest,
    { params }: { params: { planId: string } }
) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || session.user?.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { planId } = params;
        const { userId } = await request.json();

        await connectToDatabase();

        const PricingPlan = await getAdminPricingPlan();

        // Find plan by ID or key
        let plan;
        if (Types.ObjectId.isValid(planId)) {
            plan = await PricingPlan.findById(planId);
        } else {
            plan = await PricingPlan.findOne({ key: planId });
        }

        if (!plan) {
            return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
        }

        // Generate checkout URL using plan key
        const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
        const checkoutUrl = userId
            ? `${baseUrl}/checkout?plan=${plan.key}&user=${userId}&admin=true`
            : `${baseUrl}/checkout?plan=${plan.key}&admin=true`;

        return NextResponse.json({
            success: true,
            checkoutUrl,
            planKey: plan.key,
            planName: plan.name
        });
    } catch (error) {
        console.error('Error generating checkout link:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}