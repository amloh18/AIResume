// @ts-nocheck pre-existing type escape — removal tracked as R14 in docs/application-automation/fix-tasks.md
import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import PricingPlan from '@/models/PricingPlan';

export async function POST(request: NextRequest) {
  try {
    await getConnection();

    const { planKey } = await request.json();

    if (!planKey) {
      return NextResponse.json(
        { success: false, error: 'Plan key is required' },
        { status: 400 }
      );
    }

    // Find the plan by key
    const plan = await PricingPlan.findOne({ key: planKey }).lean();

    if (!plan) {
      return NextResponse.json(
        { success: false, error: 'Plan not found' },
        { status: 404 }
      );
    }

    // Generate checkout link - this is a simplified version
    // In production, you might want to create a Stripe checkout session
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const checkoutUrl = `${baseUrl}/checkout?plan=${planKey}`;

    return NextResponse.json({ 
      success: true, 
      checkoutUrl,
      plan: {
        key: plan.key,
        name: plan.name
      }
    });

  } catch (error: any) {
    console.error('Error generating checkout link:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate checkout link', details: error.message },
      { status: 500 }
    );
  }
}

