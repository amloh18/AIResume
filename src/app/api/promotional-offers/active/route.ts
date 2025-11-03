import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import PromotionalOffer from '@/models/PromotionalOffer';

export async function GET(request: NextRequest) {
  try {
    await getConnection();

    const { searchParams } = new URL(request.url);
    const userType = searchParams.get('userType') || 'all';
    const targetAudience = searchParams.get('targetAudience') || 'all';

    // Build query based on user type and target audience
    const query: any = {
      isActive: true,
      validFrom: { $lte: new Date() },
      validUntil: { $gte: new Date() }
    };

    // Filter by target audience
    if (targetAudience !== 'all') {
      query.targetAudience = targetAudience;
    }

    const offers = await PromotionalOffer.find(query)
      .populate('applicablePlans', 'name key price_monthly price_quarterly price_yearly price_one_time currency')
      .populate('promotionalPricing.planId', 'name key price_monthly price_quarterly price_yearly price_one_time currency')
      .sort({ priority: -1, createdAt: -1 });

    // Filter offers based on user type
    const filteredOffers = offers.filter(offer => {
      if (offer.targetAudience === 'all') return true;
      
      switch (userType) {
        case 'new_signup':
          return offer.applicableToNewSignups || offer.targetAudience === 'new_signups';
        case 'free_user':
          return offer.applicableToFreeUsers || offer.targetAudience === 'free_users';
        case 'existing_user':
          return offer.applicableToExistingUsers || offer.targetAudience === 'existing_users';
        default:
          return true;
      }
    });

    return NextResponse.json({
      success: true,
      offers: filteredOffers,
      count: filteredOffers.length
    });
  } catch (error) {
    console.error('Error fetching active promotional offers:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
