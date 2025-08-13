import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/database';
import PricingPlan from '@/models/PricingPlan';

export async function POST(
  request: NextRequest,
  { params }: { params: { planKey: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { planKey } = params;
    const { userId } = await request.json();

    await connectToDatabase();

    // Verify plan exists
    const plan = await PricingPlan.findOne({ key: planKey });
    if (!plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    // Generate checkout URL
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const checkoutUrl = userId 
      ? `${baseUrl}/checkout?plan=${planKey}&user=${userId}&admin=true`
      : `${baseUrl}/checkout?plan=${planKey}&admin=true`;

    return NextResponse.json({ 
      success: true, 
      checkoutUrl,
      planKey,
      planName: plan.name
    });
  } catch (error) {
    console.error('Error generating checkout link:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

