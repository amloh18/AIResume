import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/database';
import PricingPlan from '@/models/PricingPlan';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { planKey: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { planKey } = params;
    const updateData = await request.json();

    await connectToDatabase();

    const plan = await PricingPlan.findOneAndUpdate(
      { key: planKey },
      updateData,
      { new: true }
    );

    if (!plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, plan });
  } catch (error) {
    console.error('Error updating plan:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

