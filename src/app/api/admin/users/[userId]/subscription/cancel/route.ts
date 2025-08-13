import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/database';
import User from '@/models/User';

export async function POST(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = params;
    const { when = 'now', note = 'Admin cancellation' } = await request.json();

    await connectToDatabase();

    // Verify user exists
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (when === 'now') {
      // Cancel immediately and downgrade to free
      await User.findByIdAndUpdate(userId, {
        currentPlanKey: 'free',
        'subscription.planKey': 'free',
        'subscription.status': 'cancelled',
        'subscription.currentPeriodEnd': new Date()
      });
    } else {
      // Cancel at period end
      await User.findByIdAndUpdate(userId, {
        'subscription.status': 'cancelled'
      });
    }

    // TODO: If user has active subscription with provider, cancel it there too
    // This would require integration with Stripe/Razorpay APIs

    return NextResponse.json({ 
      success: true, 
      message: `Subscription cancelled ${when === 'now' ? 'immediately' : 'at period end'}`,
      cancelledAt: new Date(),
      note
    });
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

