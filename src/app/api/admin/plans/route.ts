import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
// Removed - using Clerk now
import { connectToDatabase } from '@/lib/database';
import { getAdminPricingPlan } from '@/models/admin-models';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const PricingPlan = await getAdminPricingPlan();
    const plans = await PricingPlan.find({})
      .sort({ sortOrder: 1 })
      .lean();

    return NextResponse.json({ plans });
  } catch (error) {
    console.error('Error fetching plans:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const planData = await request.json();
    await connectToDatabase();

    const plan = new PricingPlan(planData);
    await plan.save();

    return NextResponse.json({ success: true, plan });
  } catch (error) {
    console.error('Error creating plan:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

