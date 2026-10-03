import { NextRequest, NextResponse } from 'next/server';
import { getActiveProviderName, checkProviderHealth } from '@/lib/payment/paymentProvider';
import PaymentProviderSettings from '@/models/PaymentProviderSettings';
import { getConnection } from '@/lib/database';

export async function GET() {
  try {
    await getConnection();

    const activeProvider = await getActiveProviderName();
    const settings = await PaymentProviderSettings.findOne().lean() as any;
    const health = await checkProviderHealth();

    return NextResponse.json({
      activeProvider,
      health,
      stripe: {
        enabled: settings?.stripe?.enabled ?? true,
        publishableKey: settings?.stripe?.publishableKey || process.env.STRIPE_PUBLISHABLE_KEY || null,
      },
      razorpay: {
        enabled: settings?.razorpay?.enabled ?? true,
      },
    });
  } catch (error: any) {
    console.error('[Payment Provider] Error:', error.message);
    return NextResponse.json({ error: 'Failed to fetch payment provider info' }, { status: 500 });
  }
}
