import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getConnection } from '@/lib/database';
import PaymentProviderSettings from '@/models/PaymentProviderSettings';
import { getActiveProviderName, checkProviderHealth } from '@/lib/payment/paymentProvider';
import User from '@/models/User';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await getConnection();

    // Verify admin
    const user = await User.findOne({ email: session.user.email }).select('role').lean();
    if (!user || (user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const settings = await PaymentProviderSettings.findOne().lean();
    const health = await checkProviderHealth();
    const activeProvider = await getActiveProviderName();

    return NextResponse.json({
      activeProvider,
      settings: settings || { activeProvider: 'razorpay', stripe: { enabled: true }, razorpay: { enabled: true } },
      health,
    });
  } catch (error: any) {
    console.error('[Admin] Payment provider settings error:', error.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await getConnection();

    const user = await User.findOne({ email: session.user.email }).select('role').lean();
    if (!user || (user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { activeProvider } = body;

    if (!activeProvider || !['stripe', 'razorpay'].includes(activeProvider)) {
      return NextResponse.json({ error: 'Invalid provider. Must be "stripe" or "razorpay".' }, { status: 400 });
    }

    // Check that the target provider is healthy
    const health = await checkProviderHealth();
    if (!health[activeProvider as keyof typeof health]) {
      return NextResponse.json({
        error: `Cannot switch to ${activeProvider}: provider is not configured or unhealthy`,
        health,
      }, { status: 400 });
    }

    await PaymentProviderSettings.findOneAndUpdate(
      {},
      {
        activeProvider,
        updatedBy: session.user.email,
        ...(activeProvider === 'stripe' ? { 'stripe.enabled': true, 'razorpay.enabled': false } : {}),
        ...(activeProvider === 'razorpay' ? { 'razorpay.enabled': true, 'stripe.enabled': false } : {}),
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({ success: true, activeProvider });
  } catch (error: any) {
    console.error('[Admin] Update payment provider error:', error.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
