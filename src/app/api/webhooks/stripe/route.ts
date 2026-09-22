import { NextRequest, NextResponse } from 'next/server';
import { StripeProvider } from '@/lib/payment/providers/stripe';
import { getConnection } from '@/lib/database';
import WebhookLog from '@/models/WebhookLog';

const stripeProvider = new StripeProvider();

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('stripe-signature') || '';

    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      console.error('[Stripe Webhook] STRIPE_WEBHOOK_SECRET is missing');
      return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
    }

    // 1. Verify webhook signature
    const event = await stripeProvider.verifyWebhookEvent(rawBody, signature);
    if (!event) {
      console.error('[Stripe Webhook] Invalid signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    await getConnection();

    // 2. Deduplicate by Stripe event ID (unique compound index enforced)
    const existingLog = await WebhookLog.findOne({
      provider: 'stripe',
      externalId: event.id,
    });

    if (existingLog) {
      console.log(`[Stripe Webhook] Duplicate event ignored: ${event.type} (${event.id})`);
      return NextResponse.json({ received: true, duplicate: true });
    }

    // 3. Process the event
    console.log(`[Stripe Webhook] Processing: ${event.type} (${event.id})`);
    const result = await stripeProvider.handleWebhookEvent(event);

    // 4. Log the webhook result
    await WebhookLog.create({
      provider: 'stripe',
      eventType: event.type,
      externalId: event.id,
      status: result.handled ? 'processed' : 'failed',
      payload: event.data,
      errorMessage: result.error,
      processedAt: new Date(),
    });

    if (!result.handled && result.error) {
      console.error(`[Stripe Webhook] Failed to handle ${event.type}: ${result.error}`);
    }

    return NextResponse.json({
      received: true,
      handled: result.handled,
      action: result.action,
    });
  } catch (error: any) {
    console.error('[Stripe Webhook] Error:', error.message);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
