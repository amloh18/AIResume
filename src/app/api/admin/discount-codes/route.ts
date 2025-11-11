import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import DiscountCode from '@/models/DiscountCode';

export async function GET(request: NextRequest) {
  try {
    await getConnection();

    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('includeInactive') === 'true';
    const codeFilter = searchParams.get('code');

    // Build query
    const query: any = {};
    if (!includeInactive) {
      query.isActive = true;
    }
    if (codeFilter) {
      query.code = { $regex: codeFilter, $options: 'i' };
    }

    // Fetch discount codes
    const discountCodes = await DiscountCode.find(query)
      .populate('applicablePlans', 'name key')
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json(discountCodes);

  } catch (error: any) {
    console.error('Error fetching discount codes:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch discount codes', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await getConnection();

    const body = await request.json();

    // Create new discount code
    const discountCode = new DiscountCode(body);
    await discountCode.save();

    // Populate relations
    await discountCode.populate('applicablePlans', 'name key');

    return NextResponse.json(
      { success: true, discountCode },
      { status: 201 }
    );

  } catch (error: any) {
    console.error('Error creating discount code:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create discount code', details: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    await getConnection();

    const { codeId, ...updateData } = await request.json();

    if (!codeId) {
      return NextResponse.json(
        { success: false, error: 'Code ID is required' },
        { status: 400 }
      );
    }

    // Update discount code
    const discountCode = await DiscountCode.findByIdAndUpdate(
      codeId,
      updateData,
      { new: true, runValidators: true }
    ).populate('applicablePlans', 'name key');

    if (!discountCode) {
      return NextResponse.json(
        { success: false, error: 'Discount code not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, discountCode });

  } catch (error: any) {
    console.error('Error updating discount code:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update discount code', details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await getConnection();

    const { searchParams } = new URL(request.url);
    const codeId = searchParams.get('id');

    if (!codeId) {
      return NextResponse.json(
        { success: false, error: 'Code ID is required' },
        { status: 400 }
      );
    }

    // Delete discount code
    const result = await DiscountCode.findByIdAndDelete(codeId);

    if (!result) {
      return NextResponse.json(
        { success: false, error: 'Discount code not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Discount code deleted successfully' 
    });

  } catch (error: any) {
    console.error('Error deleting discount code:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete discount code', details: error.message },
      { status: 500 }
    );
  }
}

