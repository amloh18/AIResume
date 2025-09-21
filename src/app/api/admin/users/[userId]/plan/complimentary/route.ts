import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
// Removed - using Clerk now
import { connectToDatabase } from '@/lib/database';
import User from '@/models/User';
import PricingPlan from '@/models/PricingPlan';
import Invoice from '@/models/Invoice';

export async function POST(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = params;
    const { planKey, note = 'Admin complimentary plan' } = await request.json();

    await connectToDatabase();

    // Verify user exists
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify plan exists
    const plan = await PricingPlan.findOne({ key: planKey });
    if (!plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    // Calculate expiry date for Day Pass
    let currentPeriodEnd = undefined;
    if (planKey === 'day_pass') {
      currentPeriodEnd = new Date(Date.now() + (plan.dayPassDuration || 24) * 60 * 60 * 1000);
    }

    // Update user's plan
    const updateData: any = {
      currentPlanKey: planKey,
      'subscription.planKey': planKey,
      'subscription.status': 'active',
      'subscription.provider': 'admin',
      'subscription.interval': planKey === 'day_pass' ? 'one-time' : 
                              planKey === 'pro_monthly' ? 'monthly' :
                              planKey === 'pro_quarterly' ? 'quarterly' :
                              planKey === 'pro_yearly' ? 'yearly' : 'monthly'
    };

    if (currentPeriodEnd) {
      updateData['subscription.currentPeriodEnd'] = currentPeriodEnd;
    }

    await User.findByIdAndUpdate(userId, updateData);

    // Create invoice record
    const invoice = new Invoice({
      userId,
      invoiceNumber: `COMP-${Date.now()}`,
      amount: 0,
      currency: 'EUR',
      status: 'paid',
      planName: plan.name,
      planId: plan._id,
      billingCycle: planKey === 'day_pass' ? 'one-time' : 
                   planKey === 'pro_monthly' ? 'monthly' :
                   planKey === 'pro_quarterly' ? 'quarterly' :
                   planKey === 'pro_yearly' ? 'yearly' : 'monthly',
      paymentMethodType: 'admin',
      paidAt: new Date(),
      description: `Complimentary ${plan.name} - ${note}`,
      metadata: {
        adminId: session.user.id,
        note,
        type: 'complimentary'
      }
    });

    await invoice.save();

    return NextResponse.json({ 
      success: true, 
      message: `Complimentary ${plan.name} applied successfully`,
      planKey,
      invoiceId: invoice._id
    });
  } catch (error) {
    console.error('Error applying complimentary plan:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

