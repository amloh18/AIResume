import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/database';
import { getAdminPricingPlan } from '@/models/admin-models';

export async function GET(request: NextRequest) {
  try {
    // Check authentication and admin role
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const isActive = searchParams.get('isActive');
    const currency = searchParams.get('currency');

    let query: any = {};
    
    if (isActive !== null) {
      query.isActive = isActive === 'true';
    }
    
    if (currency) {
      query.currency = currency;
    }

    const PricingPlan = await getAdminPricingPlan();
    const plans = await PricingPlan.find(query)
      .sort({ sortOrder: 1, createdAt: -1 })
      .lean();

    return NextResponse.json(plans);
  } catch (error) {
    console.error('Error fetching pricing plans:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pricing plans' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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

    // Create new pricing plan
    const plan = new PricingPlan({
      name,
      description,
      price,
      currency,
      billingCycle,
      features: {
        maxCVs: features?.maxCVs || 3,
        maxExports: features?.maxExports || 1,
        aiAssistant: features?.aiAssistant || false,
        coverLetterGenerator: features?.coverLetterGenerator || false,
        jobTracker: features?.jobTracker || false,
        communityAccess: features?.communityAccess || false,
        prioritySupport: features?.prioritySupport || false,
        customTemplates: features?.customTemplates || false,
        storageLimit: features?.storageLimit || 100
      },
      isActive: isActive !== undefined ? isActive : true,
      isPopular: isPopular || false,
      sortOrder: sortOrder || 0
    });

    await plan.save();

    return NextResponse.json(plan, { status: 201 });
  } catch (error: any) {
    console.error('Error creating pricing plan:', error);
    
    if (error.code === 11000) {
      return NextResponse.json(
        { error: 'A plan with this name already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create pricing plan' },
      { status: 500 }
    );
  }
}
