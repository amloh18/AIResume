import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
// Removed - using Clerk now
import connectDB from '@/lib/database';
import { DiscountCode, PricingPlan } from '@/models';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { code, planId, amount } = await request.json();

    if (!code || !planId || amount === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Find the discount code
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

    // Check minimum order value
    if (discountCode.minimumOrderValue && amount < discountCode.minimumOrderValue) {
      return NextResponse.json({
        success: false,
        error: `Minimum order value of ${discountCode.minimumOrderValue} ${discountCode.currency} required`
      });
    }

    // Check if code applies to this plan
    if (discountCode.applicablePlans.length > 0) {
      const plan = await PricingPlan.findById(planId);
      if (!plan || !discountCode.applicablePlans.includes(plan._id)) {
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
      discountAmount = discountCode.discountValue;
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
