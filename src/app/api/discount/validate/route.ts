import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getConnection } from '@/lib/database';
import { getAdminDiscountCode, getAdminPricingPlan } from '@/models/admin-models';
import { LocationService } from '@/lib/payment/locationService';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await getConnection();

    const { code, planId, amount } = await request.json();

    if (!code || !planId || amount === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Find the discount code
    const DiscountCode = await getAdminDiscountCode();
    const discountCode = await DiscountCode.findOne({ 
      code: code.toUpperCase(),
      isActive: true 
    });

    if (!discountCode) {
      return NextResponse.json({
        success: false,
        error: 'Invalid discount code'
      });
    }

    // Check if code is still valid
    if (!discountCode.isValid) {
      return NextResponse.json({
        success: false,
        error: 'Discount code has expired or reached usage limit'
      });
    }

    // Ensure discount type has a valid value, default to 'percentage' if not set
    if (!discountCode.discountType) {
      discountCode.discountType = 'percentage';
    }

    if (!['percentage', 'fixed'].includes(discountCode.discountType)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid discount code configuration'
      });
    }

    // Get user location for currency conversion
    const userLocation = await LocationService.getLocationData();

    // Check minimum order value (convert to user's currency if needed)
    if (discountCode.minimumOrderValue) {
      let minimumAmount = discountCode.minimumOrderValue;
      if (discountCode.currency !== userLocation.currency) {
        // Convert minimum order value to user's currency
        const converted = LocationService.convertPrice(
          discountCode.minimumOrderValue,
          discountCode.currency,
          userLocation.currency
        );
        minimumAmount = converted.convertedPrice;
      }

      if (amount < minimumAmount) {
        return NextResponse.json({
          success: false,
          error: `Minimum order value of ${Math.round(minimumAmount)} ${userLocation.currencySymbol} required`
        });
      }
    }

    // Check if code applies to this plan
    // Support both plan IDs and plan keys
    if (discountCode.applicablePlans && discountCode.applicablePlans.length > 0) {
      const PricingPlan = await getAdminPricingPlan();
      const plan = await PricingPlan.findById(planId);
      
      if (!plan) {
        return NextResponse.json({
          success: false,
          error: 'Plan not found'
        });
      }
      
      // Check if code applies to plan ID or plan key
      const isApplicable = 
        discountCode.applicablePlans.includes(plan._id.toString()) ||
        discountCode.applicablePlans.includes(plan.key);
      
      if (!isApplicable) {
        return NextResponse.json({
          success: false,
          error: 'Discount code is not applicable to this plan'
        });
      }
    }
    
    // Also check applicablePlanKeys if available (for Coupon model compatibility)
    if (discountCode.applicablePlanKeys && discountCode.applicablePlanKeys.length > 0) {
      const PricingPlan = await getAdminPricingPlan();
      const plan = await PricingPlan.findById(planId);
      
      if (!plan || !discountCode.applicablePlanKeys.includes(plan.key)) {
        return NextResponse.json({
          success: false,
          error: 'Discount code is not applicable to this plan'
        });
      }
    }

    // Calculate discount amount
    let discountAmount = 0;
    if (discountCode.discountType === 'percentage') {
      discountAmount = (amount * discountCode.discountValue) / 100;
    } else {
      // For fixed discounts, convert to user's currency if needed
      if (discountCode.currency === userLocation.currency) {
        discountAmount = discountCode.discountValue;
      } else {
        const converted = LocationService.convertPrice(
          discountCode.discountValue,
          discountCode.currency,
          userLocation.currency
        );
        discountAmount = converted.convertedPrice;
      }
    }

    // Don't discount more than the order value
    discountAmount = Math.min(discountAmount, amount);

    return NextResponse.json({
      success: true,
      discount: {
        code: discountCode.code,
        description: discountCode.description,
        discountType: discountCode.discountType,
        discountValue: discountCode.discountValue,
        currency: discountCode.currency,
        discountAmount: discountAmount,
        finalAmount: amount - discountAmount
      }
    });

  } catch (error) {
    console.error('Error validating discount code:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
