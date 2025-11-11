import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import PricingPlan from '@/models/PricingPlan';

interface RouteParams {
  params: {
    id: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await getConnection();

    const plan = await PricingPlan.findById(params.id).lean();

    if (!plan) {
      return NextResponse.json(
        { success: false, error: 'Plan not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, plan });

  } catch (error: any) {
    console.error('Error fetching plan:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch plan', details: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    await getConnection();

    const updateData = await request.json();

    // Update plan
    const plan = await PricingPlan.findByIdAndUpdate(
      params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!plan) {
      return NextResponse.json(
        { success: false, error: 'Plan not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, plan });

  } catch (error: any) {
    console.error('Error updating plan:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update plan', details: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    await getConnection();

    const updateData = await request.json();

    // Update plan with PATCH (partial update)
    const plan = await PricingPlan.findByIdAndUpdate(
      params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!plan) {
      return NextResponse.json(
        { success: false, error: 'Plan not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, plan });

  } catch (error: any) {
    console.error('Error patching plan:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to patch plan', details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    await getConnection();

    // Prevent deletion of essential plans
    const plan = await PricingPlan.findById(params.id);
    if (!plan) {
      return NextResponse.json(
        { success: false, error: 'Plan not found' },
        { status: 404 }
      );
    }

    if (plan.key === 'free') {
      return NextResponse.json(
        { success: false, error: 'Cannot delete free plan' },
        { status: 400 }
      );
    }

    // Delete plan
    await PricingPlan.findByIdAndDelete(params.id);

    return NextResponse.json({ 
      success: true, 
      message: 'Plan deleted successfully' 
    });

  } catch (error: any) {
    console.error('Error deleting plan:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete plan', details: error.message },
      { status: 500 }
    );
  }
}

