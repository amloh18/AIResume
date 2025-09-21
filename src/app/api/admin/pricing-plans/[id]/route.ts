import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/database';
import { getAdminPricingPlan, getAdminSubscription } from '@/models/admin-models';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication and admin role
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const PricingPlan = await getAdminPricingPlan();
    const plan = await PricingPlan.findById(params.id).lean();
    
    if (!plan) {
      return NextResponse.json({ error: 'Pricing plan not found' }, { status: 404 });
    }

    return NextResponse.json(plan);
  } catch (error) {
    console.error('Error fetching pricing plan:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pricing plan' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication and admin role
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const {
      name,
      description,
      price,
      currency,
      billingCycle,
      features,
      isActive,
      isPopular,
      sortOrder
    } = body;

    // Validate required fields
    if (!name || !description || price === undefined || !currency || !billingCycle) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const PricingPlan = await getAdminPricingPlan();
    const plan = await PricingPlan.findById(params.id);
    
    if (!plan) {
      return NextResponse.json({ error: 'Pricing plan not found' }, { status: 404 });
    }

    // Update plan
    plan.name = name;
    plan.description = description;
    plan.price = price;
    plan.currency = currency;
    plan.billingCycle = billingCycle;
    plan.features = {
      maxCVs: features?.maxCVs || 3,
      maxExports: features?.maxExports || 1,
      aiAssistant: features?.aiAssistant || false,
      coverLetterGenerator: features?.coverLetterGenerator || false,
      jobTracker: features?.jobTracker || false,
      communityAccess: features?.communityAccess || false,
      prioritySupport: features?.prioritySupport || false,
      customTemplates: features?.customTemplates || false,
      storageLimit: features?.storageLimit || 100
    };
    plan.isActive = isActive !== undefined ? isActive : true;
    plan.isPopular = isPopular || false;
    plan.sortOrder = sortOrder || 0;

    await plan.save();

    return NextResponse.json(plan);
  } catch (error: any) {
    console.error('Error updating pricing plan:', error);
    
    if (error.code === 11000) {
      return NextResponse.json(
        { error: 'A plan with this name already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update pricing plan' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication and admin role
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const PricingPlan = await getAdminPricingPlan();
    const plan = await PricingPlan.findById(params.id);
    
    if (!plan) {
      return NextResponse.json({ error: 'Pricing plan not found' }, { status: 404 });
    }

    // Check if plan is being used by any active subscriptions
    const Subscription = await getAdminSubscription();
    const activeSubscriptions = await Subscription.countDocuments({
      planId: params.id,
      status: 'active'
    });

    if (activeSubscriptions > 0) {
      return NextResponse.json(
        { error: 'Cannot delete plan with active subscriptions' },
        { status: 400 }
      );
    }

    await PricingPlan.findByIdAndDelete(params.id);

    return NextResponse.json({ message: 'Pricing plan deleted successfully' });
  } catch (error) {
    console.error('Error deleting pricing plan:', error);
    return NextResponse.json(
      { error: 'Failed to delete pricing plan' },
      { status: 500 }
    );
  }
}
