import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getConnection } from '@/lib/database';
import Coupon from '@/models/Coupon';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { code, plan } = await request.json();

    if (!code) {
      return NextResponse.json(
        { success: false, error: 'Coupon code is required' },
        { status: 400 }
      );
    }

    await getConnection();

    const coupon = await Coupon.findOne({ code: code.toUpperCase() });

    if (!coupon) {
      return NextResponse.json(
        { success: false, error: 'Invalid coupon code' },
        { status: 404 }
      );
    }

    // Validate coupon
    const validation = coupon.isValid();
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.reason },
        { status: 400 }
      );
    }

    // Check if coupon is applicable to the selected plan
    // Support both plan keys and plan IDs
    if (plan) {
      const hasApplicablePlans = coupon.applicablePlans.length > 0 || (coupon.applicablePlanKeys && coupon.applicablePlanKeys.length > 0);
      
      if (hasApplicablePlans) {
        const isApplicable = 
          coupon.applicablePlans.includes(plan) || 
          (coupon.applicablePlanKeys && coupon.applicablePlanKeys.includes(plan));
        
        if (!isApplicable) {
          return NextResponse.json(
            { success: false, error: 'This coupon is not applicable to the selected plan' },
            { status: 400 }
          );
        }
      }
    }

    // Return coupon details
    return NextResponse.json({
      success: true,
      data: {
        code: coupon.code,
        type: coupon.type,
        discountValue: coupon.discountValue,
        trialDays: coupon.trialDays,
        requiresCreditCard: coupon.requiresCreditCard,
        description: coupon.description,
        applicablePlans: coupon.applicablePlans,
        applicablePlanKeys: coupon.applicablePlanKeys || []
      }
    });
  } catch (error) {
    console.error('Error validating coupon:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}


