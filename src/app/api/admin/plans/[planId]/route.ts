import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
// Removed - using Clerk now
import { connectToDatabase } from '@/lib/database';
import PricingPlan from '@/models/PricingPlan';
import { Types } from 'mongoose';

export async function GET(
  request: NextRequest,
  { params }: { params: { planId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { planId } = params;

    await connectToDatabase();

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

    return NextResponse.json(plan);
  } catch (error) {
    console.error('Error fetching plan:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { planId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { planId } = params;
    const updateData = await request.json();

    await connectToDatabase();

    // Validate required fields
    if (!updateData.name || !updateData.description) {
      return NextResponse.json({ error: 'Name and description are required' }, { status: 400 });
    }

    // Validate limits
    if (updateData.maxCVs < -1 || updateData.maxExports < -1 || updateData.storageLimit < 0) {
      return NextResponse.json({ error: 'Invalid limit values' }, { status: 400 });
    }

    // Validate pricing based on plan type
    if (updateData.key === 'day_pass') {
      if (updateData.price_one_time < 0) {
        return NextResponse.json({ error: 'Day pass price must be non-negative' }, { status: 400 });
      }
    } else if (updateData.key.startsWith('pro_')) {
      if (updateData.price_monthly < 0 || updateData.price_quarterly < 0 || updateData.price_yearly < 0) {
        return NextResponse.json({ error: 'Pro plan prices must be non-negative' }, { status: 400 });
      }
    }

    // Validate features
    if (!Array.isArray(updateData.features) || updateData.features.length === 0) {
      return NextResponse.json({ error: 'At least one feature is required' }, { status: 400 });
    }

    // Update the plan by ID or key
    let updatedPlan;
    if (Types.ObjectId.isValid(planId)) {
      updatedPlan = await PricingPlan.findByIdAndUpdate(
        planId,
        {
          ...updateData,
          updatedAt: new Date()
        },
        { new: true, runValidators: true }
      );
    } else {
      updatedPlan = await PricingPlan.findOneAndUpdate(
        { key: planId },
        {
          ...updateData,
          updatedAt: new Date()
        },
        { new: true, runValidators: true }
      );
    }

    if (!updatedPlan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      plan: updatedPlan,
      message: 'Plan updated successfully'
    });
  } catch (error) {
    console.error('Error updating plan:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { planId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { planId } = params;
    const updateData = await request.json();

    await connectToDatabase();

    // Update the plan by ID or key
    let updatedPlan;
    if (Types.ObjectId.isValid(planId)) {
      updatedPlan = await PricingPlan.findByIdAndUpdate(
        planId,
        updateData,
        { new: true, runValidators: true }
      );
    } else {
      updatedPlan = await PricingPlan.findOneAndUpdate(
        { key: planId },
        updateData,
        { new: true, runValidators: true }
      );
    }

    if (!updatedPlan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      plan: updatedPlan,
      message: 'Plan updated successfully'
    });
  } catch (error) {
    console.error('Error updating plan:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { planId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { planId } = params;

    await connectToDatabase();

    // Delete the plan by ID or key
    let deletedPlan;
    if (Types.ObjectId.isValid(planId)) {
      deletedPlan = await PricingPlan.findByIdAndDelete(planId);
    } else {
      deletedPlan = await PricingPlan.findOneAndDelete({ key: planId });
    }

    if (!deletedPlan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Plan deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting plan:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
