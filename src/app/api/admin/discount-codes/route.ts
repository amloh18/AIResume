import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
// Removed - using Clerk now
import connectDB from '@/lib/database';
import { getAdminDiscountCode, getAdminPricingPlan } from '@/models/admin-models';

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

    const DiscountCode = await getAdminDiscountCode();
    const discountCodes = await DiscountCode.find(query)
      .populate('applicablePlans', 'name price currency')
      .populate('createdBy', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json(discountCodes);
  } catch (error) {
    console.error('Error fetching discount codes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch discount codes' },
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
      code,
      description,
      discountType,
      discountValue,
      currency,
      maxUses,
      validFrom,
      validUntil,
      applicablePlans,
      minimumOrderValue,
      isActive
    } = body;

    // Validate required fields
    if (!code || !description || !discountType || discountValue === undefined || !currency || !maxUses || !validUntil) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate discount value
    if (discountType === 'percentage' && (discountValue < 0 || discountValue > 100)) {
      return NextResponse.json(
        { error: 'Percentage discount must be between 0 and 100' },
        { status: 400 }
      );
    }

    if (discountType === 'fixed' && discountValue < 0) {
      return NextResponse.json(
        { error: 'Fixed discount cannot be negative' },
        { status: 400 }
      );
    }

    // Validate dates
    const now = new Date();
    const validFromDate = validFrom ? new Date(validFrom) : now;
    const validUntilDate = new Date(validUntil);

    if (validUntilDate <= validFromDate) {
      return NextResponse.json(
        { error: 'Valid until date must be after valid from date' },
        { status: 400 }
      );
    }

    // Create new discount code
    const DiscountCode = await getAdminDiscountCode();
    const discountCode = new DiscountCode({
      code: code.toUpperCase(),
      description,
      discountType,
      discountValue,
      currency,
      maxUses,
      validFrom: validFromDate,
      validUntil: validUntilDate,
      applicablePlans: applicablePlans || [],
      minimumOrderValue,
      isActive: isActive !== undefined ? isActive : true,
      createdBy: session.user?.id
    });

    await discountCode.save();

    // Populate the response
    await discountCode.populate('applicablePlans', 'name price currency');
    await discountCode.populate('createdBy', 'firstName lastName email');

    return NextResponse.json(discountCode, { status: 201 });
  } catch (error: any) {
    console.error('Error creating discount code:', error);
    
    if (error.code === 11000) {
      return NextResponse.json(
        { error: 'A discount code with this code already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create discount code' },
      { status: 500 }
    );
  }
}
