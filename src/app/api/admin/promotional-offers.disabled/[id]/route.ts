import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/database';
import PromotionalOffer from '@/models/PromotionalOffer';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await connectDB();

    const offer = await PromotionalOffer.findById(id)
      .populate('applicablePlans', 'name key')
      .populate('promotionalPricing.planId', 'name key');

    if (!offer) {
      return NextResponse.json({ error: 'Promotional offer not found' }, { status: 404 });
    }

    return NextResponse.json(offer);
  } catch (error) {
    console.error('Error fetching promotional offer:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await connectDB();

    const body = await request.json();
    const {
      title,
      description,
      targetAudience,
      applicableToNewSignups,
      applicableToFreeUsers,
      applicableToExistingUsers,
      validFrom,
      validUntil,
      isActive,
      priority,
      applicablePlans,
      promotionalPricing,
      bannerText,
      bannerColor
    } = body;

    // Validate required fields
    if (!title || !description || !targetAudience || !validFrom || !validUntil) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate dates
    const validFromDate = new Date(validFrom);
    const validUntilDate = new Date(validUntil);

    if (validUntilDate <= validFromDate) {
      return NextResponse.json(
        { error: 'Valid until date must be after valid from date' },
        { status: 400 }
      );
    }

    const offer = await PromotionalOffer.findById(id);
    if (!offer) {
      return NextResponse.json({ error: 'Promotional offer not found' }, { status: 404 });
    }

    // Update offer
    offer.title = title;
    offer.description = description;
    offer.targetAudience = targetAudience;
    offer.applicableToNewSignups = applicableToNewSignups || false;
    offer.applicableToFreeUsers = applicableToFreeUsers || false;
    offer.applicableToExistingUsers = applicableToExistingUsers || false;
    offer.validFrom = validFromDate;
    offer.validUntil = validUntilDate;
    offer.isActive = isActive !== false;
    offer.priority = priority || 1;
    offer.applicablePlans = applicablePlans || [];
    offer.promotionalPricing = promotionalPricing || [];
    offer.bannerText = bannerText || '';
    offer.bannerColor = bannerColor || '#10b981';

    await offer.save();

    return NextResponse.json({
      success: true,
      offer: await PromotionalOffer.findById(offer._id)
        .populate('applicablePlans', 'name key')
        .populate('promotionalPricing.planId', 'name key')
    });
  } catch (error) {
    console.error('Error updating promotional offer:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await connectDB();

    const offer = await PromotionalOffer.findById(id);
    if (!offer) {
      return NextResponse.json({ error: 'Promotional offer not found' }, { status: 404 });
    }

    await PromotionalOffer.findByIdAndDelete(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting promotional offer:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
