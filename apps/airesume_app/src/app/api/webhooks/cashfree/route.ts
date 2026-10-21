import { NextRequest, NextResponse } from 'next/server';
import { CashfreeProvider } from '@/lib/payment/providers/cashfree';
import { getConnection } from '@/lib/database';
import WebhookLog from '@/models/WebhookLog';

const cashfreeProvider = new CashfreeProvider();

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-webhook-signature') || '';
    const timestamp = request.headers.get('x-webhook-timestamp') || '';

    const headers: Record<string, string> = {
      'x-webhook-signature': signature,
      'x-webhook-timestamp': timestamp,
    };

    // 1. Verify webhook signature
    const event = await cashfreeProvider.verifyWebhookEvent(rawBody, signature, headers);
    if (!event) {
      console.error('[Cashfree Webhook] Invalid signature or payload');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    await getConnection();

    // 2. Deduplicate by event ID
    const existingLog = await WebhookLog.findOne({
      provider: 'cashfree',
      externalId: event.id,
    });

    if (existingLog) {
      console.log(`[Cashfree Webhook] Duplicate event ignored: ${event.type} (${event.id})`);
      return NextResponse.json({ received: true, duplicate: true });
    }

    // 3. Process the event
    console.log(`[Cashfree Webhook] Processing: ${event.type} (${event.id})`);
    const result = await cashfreeProvider.handleWebhookEvent(event);

    // 4. Log the webhook result
    await WebhookLog.create({
      provider: 'cashfree',
      eventType: event.type,
      externalId: event.id,
      status: result.handled ? 'processed' : 'failed',
      payload: event.data,
      errorMessage: result.error,
      processedAt: new Date(),
    });

    if (!result.handled && result.error) {
      console.error(`[Cashfree Webhook] Failed to handle ${event.type}: ${result.error}`);
    }

    return NextResponse.json({
      received: true,
      handled: result.handled,
      action: result.action,
    });
  } catch (error: any) {
    console.error('[Cashfree Webhook] Error:', error.message);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
