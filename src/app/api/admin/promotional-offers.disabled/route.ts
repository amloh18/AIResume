import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/database';
import PromotionalOffer from '@/models/PromotionalOffer';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const offers = await PromotionalOffer.find()
      .populate('applicablePlans', 'name key')
      .populate('promotionalPricing.planId', 'name key')
      .sort({ priority: -1, createdAt: -1 });

    return NextResponse.json(offers);
  } catch (error) {
    console.error('Error fetching promotional offers:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
    const now = new Date();

    if (validUntilDate <= validFromDate) {
      return NextResponse.json(
        { error: 'Valid until date must be after valid from date' },
        { status: 400 }
      );
    }

    // Create new promotional offer
    const offer = new PromotionalOffer({
      title,
      description,
      targetAudience,
      applicableToNewSignups: applicableToNewSignups || false,
      applicableToFreeUsers: applicableToFreeUsers || false,
      applicableToExistingUsers: applicableToExistingUsers || false,
      validFrom: validFromDate,
      validUntil: validUntilDate,
      isActive: isActive !== false,
      priority: priority || 1,
      applicablePlans,
      promotionalPricing: promotionalPricing || [],
      bannerText: bannerText || '',
      bannerColor: bannerColor || '#10b981',
      createdBy: session.user.id
    });

    await offer.save();

    return NextResponse.json({
      success: true,
      offer: await PromotionalOffer.findById(offer._id)
        .populate('applicablePlans', 'name key')
        .populate('promotionalPricing.planId', 'name key')
    });
  } catch (error) {
    console.error('Error creating promotional offer:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
