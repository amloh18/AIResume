import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getConnection } from '@/lib/database';
import { User } from '@/models';
import PolarService from '@/lib/payment/polar';
import RazorpayService from '@/lib/payment/razorpay';
import { LocationService } from '@/lib/payment/locationService';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    await getConnection();

    const body = await request.json();
    const { planName, amount, currency, paymentMethod, billingCycle, productPriceId, returnUrl } = body;

    if (!planName || !amount || !currency || !paymentMethod) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const partner = currency === 'INR' ? 'razorpay' : 'polar';

    if (partner === 'polar') {
      if (!productPriceId) {
        return NextResponse.json(
          { success: false, error: 'Product price ID is required for Polar' },
          { status: 400 }
        );
      }

      const polarResult = await PolarService.createCheckout({
        productPriceId: productPriceId,
        customerEmail: user.email,
        customerName: `${user.firstName} ${user.lastName}`,
        successUrl: returnUrl || `${process.env.NEXTAUTH_URL}/dashboard?success=true`,
        metadata: {
          userId: user._id.toString(),
          planName: planName,
          billingCycle: billingCycle || 'one-time'
        }
      });

      if (!polarResult.success) {
        return NextResponse.json(
          { success: false, error: polarResult.error },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        checkoutId: polarResult.checkoutId,
        checkoutUrl: polarResult.checkoutUrl,
        paymentMethod: 'polar'
      });

    } else {
      const razorpayResult = await RazorpayService.createOrder({
        amount: amount,
        currency: currency,
        receipt: `cv_circle_${Date.now()}`,
        notes: {
          userId: user._id.toString(),
          planName: planName,
          billingCycle: billingCycle || 'one-time'
        }
      });

      if (!razorpayResult.success) {
        return NextResponse.json(
          { success: false, error: razorpayResult.error },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        orderId: razorpayResult.orderId,
        amount: razorpayResult.amount,
        currency: razorpayResult.currency,
        paymentMethod: 'razorpay'
      });
    }

  } catch (error) {
    console.error('Error creating payment intent:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
