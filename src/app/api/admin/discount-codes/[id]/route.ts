import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import DiscountCode from '@/models/DiscountCode';

interface RouteParams {
  params: {
    id: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await getConnection();

    const discountCode = await DiscountCode.findById(params.id)
      .populate('applicablePlans', 'name key')
      .lean();

    if (!discountCode) {
      return NextResponse.json(
        { success: false, error: 'Discount code not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, discountCode });

  } catch (error: any) {
    console.error('Error fetching discount code:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch discount code', details: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    await getConnection();

    const updateData = await request.json();

    const discountCode = await DiscountCode.findByIdAndUpdate(
      params.id,
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

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    await getConnection();

    const result = await DiscountCode.findByIdAndDelete(params.id);

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

