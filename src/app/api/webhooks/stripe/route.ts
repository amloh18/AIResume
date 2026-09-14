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

    // Verify webhook event
    const event = await stripeProvider.verifyWebhookEvent(rawBody, signature);
    if (!event) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    await getConnection();

    // Idempotency check
    const existingLog = await WebhookLog.findOne({
      provider: 'stripe',
      eventType: event.type,
      externalId: event.id,
      status: 'processed',
    });

    if (existingLog) {
      return NextResponse.json({ received: true, duplicate: true });
    }

    // Process the event
    const result = await stripeProvider.handleWebhookEvent(event);

    // Log the webhook
    await WebhookLog.create({
      provider: 'stripe',
      eventType: event.type,
      externalId: event.id,
      status: result.handled ? 'processed' : 'failed',
      payload: event.data,
      error: result.error,
      processedAt: new Date(),
    });

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
