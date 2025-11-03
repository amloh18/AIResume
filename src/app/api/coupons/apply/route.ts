import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getConnection } from '@/lib/database';
import Coupon from '@/models/Coupon';
import User from '@/models/User';

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

    if (!code || !plan) {
      return NextResponse.json(
        { success: false, error: 'Coupon code and plan are required' },
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
    if (coupon.applicablePlans.length > 0 && !coupon.applicablePlans.includes(plan)) {
      return NextResponse.json(
        { success: false, error: 'This coupon is not applicable to the selected plan' },
        { status: 400 }
      );
    }

    // Get user
    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Apply coupon based on type
    let subscriptionUpdate: any = {
      plan,
      status: 'active'
    };

    if (coupon.type === 'trial' && coupon.trialDays) {
      // Trial coupon - grant trial period
      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + coupon.trialDays);
      
      subscriptionUpdate = {
        ...subscriptionUpdate,
        trialEndDate,
        isTrialActive: true,
        appliedCoupon: {
          code: coupon.code,
          appliedAt: new Date(),
          type: 'trial',
          trialDays: coupon.trialDays
        }
      };
    } else if (coupon.type === 'percentage' || coupon.type === 'fixed') {
      // Discount coupon
      subscriptionUpdate = {
        ...subscriptionUpdate,
        appliedCoupon: {
          code: coupon.code,
          appliedAt: new Date(),
          type: coupon.type,
          discountValue: coupon.discountValue
        }
      };
    }

    // Update user subscription
    await User.findByIdAndUpdate(
      session.user.id,
      {
        $set: { subscription: subscriptionUpdate }
      }
    );

    // Increment coupon usage
    await coupon.incrementUsage();

    return NextResponse.json({
      success: true,
      message: coupon.type === 'trial' 
        ? `Trial activated! You have ${coupon.trialDays} days of ${plan} plan access.`
        : `Coupon applied successfully!`,
      data: {
        subscription: subscriptionUpdate
      }
    });
  } catch (error) {
    console.error('Error applying coupon:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}


