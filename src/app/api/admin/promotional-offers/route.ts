import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import PromotionalOffer from '@/models/PromotionalOffer';

export async function GET(request: NextRequest) {
  try {
    await getConnection();

    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('includeInactive') === 'true';

    // Build query
    const query: any = {};
    if (!includeInactive) {
      query.isActive = true;
    }

    // Fetch promotional offers
    const offers = await PromotionalOffer.find(query).lean()
      .populate('applicablePlans', 'name key')
      .populate('promotionalPricing.planId', 'name key')
      .sort({ priority: -1, createdAt: -1 })
      .lean();

    return NextResponse.json(offers);

  } catch (error: any) {
    console.error('Error fetching promotional offers:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch promotional offers', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await getConnection();

    const body = await request.json();

    // Create new promotional offer
    const offer = new PromotionalOffer(body);
    await offer.save();

    // Populate relations
    await offer.populate('applicablePlans', 'name key');
    await offer.populate('promotionalPricing.planId', 'name key');

    return NextResponse.json(
      { success: true, offer },
      { status: 201 }
    );

  } catch (error: any) {
    console.error('Error creating promotional offer:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create promotional offer', details: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    await getConnection();

    const { offerId, ...updateData } = await request.json();

    if (!offerId) {
      return NextResponse.json(
        { success: false, error: 'Offer ID is required' },
        { status: 400 }
      );
    }

    // Update promotional offer
    const offer = await PromotionalOffer.findByIdAndUpdate(
      offerId,
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

export async function DELETE(request: NextRequest) {
  try {
    await getConnection();

    const { searchParams } = new URL(request.url);
    const offerId = searchParams.get('id');

    if (!offerId) {
      return NextResponse.json(
        { success: false, error: 'Offer ID is required' },
        { status: 400 }
      );
    }

    // Delete promotional offer
    const result = await PromotionalOffer.findByIdAndDelete(offerId);

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

