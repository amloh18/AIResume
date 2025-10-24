import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
// Removed - using Clerk now
import connectDB from '@/lib/database';
import { getAdminDiscountCode } from '@/models/admin-models';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication and admin role
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { id } = await params;
    const DiscountCode = await getAdminDiscountCode();
    const discountCode = await DiscountCode.findById(id)
      .populate('applicablePlans', 'name price currency')
      .populate('createdBy', 'firstName lastName email')
      .lean();
    
    if (!discountCode) {
      return NextResponse.json({ error: 'Discount code not found' }, { status: 404 });
    }

    return NextResponse.json(discountCode);
  } catch (error) {
    console.error('Error fetching discount code:', error);
    return NextResponse.json(
      { error: 'Failed to fetch discount code' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication and admin role
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { id } = await params;
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

    const DiscountCode = await getAdminDiscountCode();
    const discountCode = await DiscountCode.findById(id);
    
    if (!discountCode) {
      return NextResponse.json({ error: 'Discount code not found' }, { status: 404 });
    }

    // Update discount code
    discountCode.code = code.toUpperCase();
    discountCode.description = description;
    discountCode.discountType = discountType;
    discountCode.discountValue = discountValue;
    discountCode.currency = currency;
    discountCode.maxUses = maxUses;
    discountCode.validFrom = validFromDate;
    discountCode.validUntil = validUntilDate;
    discountCode.applicablePlans = applicablePlans || [];
    discountCode.minimumOrderValue = minimumOrderValue;
    discountCode.isActive = isActive !== undefined ? isActive : true;

    await discountCode.save();

    // Populate the response
    await discountCode.populate('applicablePlans', 'name price currency');
    await discountCode.populate('createdBy', 'firstName lastName email');

    return NextResponse.json(discountCode);
  } catch (error: any) {
    console.error('Error updating discount code:', error);
    
    if (error.code === 11000) {
      return NextResponse.json(
        { error: 'A discount code with this code already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update discount code' },
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

    const DiscountCode = await getAdminDiscountCode();
    const discountCode = await DiscountCode.findById(id);
    
    if (!discountCode) {
      return NextResponse.json({ error: 'Discount code not found' }, { status: 404 });
    }

    // Check if discount code has been used
    if (discountCode.usedCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete discount code that has been used' },
        { status: 400 }
      );
    }

    await DiscountCode.findByIdAndDelete(id);

    return NextResponse.json({ message: 'Discount code deleted successfully' });
  } catch (error) {
    console.error('Error deleting discount code:', error);
    return NextResponse.json(
      { error: 'Failed to delete discount code' },
      { status: 500 }
    );
  }
}
