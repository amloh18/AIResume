import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/database';
import { getAdminPricingPlan } from '@/models/admin-models';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const currency = searchParams.get('currency');
    const includeInactive = searchParams.get('includeInactive') === 'true';

    let query: any = {};
    
    if (!includeInactive) {
      query.status = 'active';
    }
    
    if (currency) {
      query.currency = currency;
    }

    const PricingPlan = await getAdminPricingPlan();
    const plans = await PricingPlan.find(query)
      .sort({ sortOrder: 1, price: 1 })
      .lean();

    return NextResponse.json(plans.map(plan => ({
      ...plan,
      maxCVs: plan.maxCVs === -1 ? 'Unlimited' : plan.maxCVs,
      maxExports: plan.maxExports === -1 ? 'Unlimited' : plan.maxExports,
      // Add computed fields for backward compatibility
      price: plan.price_monthly || plan.price_one_time || 0,
      billingCycle: plan.billingCycle
    })));
  } catch (error) {
    console.error('Error fetching pricing plans:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch pricing plans' 
      },
      { status: 500 }
    );
  }
}
