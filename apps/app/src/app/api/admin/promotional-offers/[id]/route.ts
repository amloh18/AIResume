import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import PromotionalOffer from '@/models/PromotionalOffer';
import { requireAdmin } from '@/lib/middleware/admin-auth';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(request);
    const { id } = await params;
    await getConnection();

    const offer = await PromotionalOffer.findById(id)
      .populate('applicablePlans', 'name key')
      .populate('promotionalPricing.planId', 'name key')
      .lean();

    if (!offer) {
      return NextResponse.json(
        { success: false, error: 'Promotional offer not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, offer });

  } catch (error: any) {
    console.error('Error fetching promotional offer:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch promotional offer', details: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(request);
    const { id } = await params;
    await getConnection();

    const updateData = await request.json();

    const offer = await PromotionalOffer.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    )
      .populate('applicablePlans', 'name key')
      .populate('promotionalPricing.planId', 'name key');

    if (!offer) {
      return NextResponse.json(
        { success: false, error: 'Promotional offer not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, offer });

  } catch (error: any) {
    console.error('Error updating promotional offer:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update promotional offer', details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(request);
    const { id } = await params;
    await getConnection();

    const result = await PromotionalOffer.findByIdAndDelete(id);

    if (!result) {
      return NextResponse.json(
        { success: false, error: 'Promotional offer not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Promotional offer deleted successfully' 
    });

  } catch (error: any) {
    console.error('Error deleting promotional offer:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete promotional offer', details: error.message },
      { status: 500 }
    );
  }
}

