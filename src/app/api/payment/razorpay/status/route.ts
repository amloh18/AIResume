import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getConnection } from '@/lib/database';
import User from '@/models/User';
import Invoice from '@/models/Invoice';

/**
 * Payment Status Polling Endpoint
 * 
 * Allows frontend to poll payment status after verification.
 * Returns current state of payment processing.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await getConnection();

    const { searchParams } = new URL(request.url);
    const paymentId = searchParams.get('paymentId');

    if (!paymentId) {
      return NextResponse.json({ error: 'Payment ID required' }, { status: 400 });
    }

    // Get user
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if invoice exists (payment processed)
    const invoice = await Invoice.findOne({
      userId: user._id.toString(),
      'metadata.razorpayPaymentId': paymentId,
      status: 'paid'
    });

    if (invoice) {
      // Payment processed - get current subscription status
      const updatedUser = await User.findById(user._id);
      const subscription = updatedUser?.subscription;
      
      return NextResponse.json({
        success: true,
        processed: true,
        invoice: {
          id: invoice._id.toString(),
          amount: invoice.amount,
          currency: invoice.currency,
          planName: invoice.planName,
          paidAt: invoice.paidAt
        },
        subscription: subscription ? {
          planKey: subscription.planKey,
          status: subscription.status,
          currentPeriodEnd: subscription.currentPeriodEnd,
          expiresAt: subscription.endDate
        } : null
      });
    }

    // Payment not yet processed
    return NextResponse.json({
      success: true,
      processed: false,
      pending: true,
      message: 'Payment verification in progress. Webhook processing...'
    });

  } catch (error) {
    console.error('Payment status check error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

