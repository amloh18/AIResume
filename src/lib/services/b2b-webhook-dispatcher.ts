import crypto from 'crypto';

export class WebhookDispatcher {
  static async dispatch(
    webhookUrl: string,
    webhookSecret: string,
    eventType: string,
    payload: any
  ): Promise<boolean> {
    if (!webhookUrl || !webhookSecret) {
      console.warn('Webhook URL or Secret is missing, skipping dispatch.');
      return false;
    }

    const timestamp = Date.now().toString();
    const eventId = crypto.randomUUID();

    const body = JSON.stringify({
      id: eventId,
      type: eventType,
      created: new Date().toISOString(),
      data: payload
    });

    // Generate cryptographic signature
    const signaturePayload = `${timestamp}.${body}`;
    const signature = crypto
      .createHmac('sha256', webhookSecret)
      .update(signaturePayload)
      .digest('hex');

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'CVCircle-Webhook-Timestamp': timestamp,
          'CVCircle-Webhook-Signature': `v1=${signature}`
        },
        body
      });

      if (!response.ok) {
        console.error(`Webhook dispatch failed with status ${response.status}: ${response.statusText}`);
        return false;
      }

      console.log(`Webhook dispatched successfully to ${webhookUrl}`);
      return true;
    } catch (error) {
      console.error('Webhook dispatch error:', error);
      return false;
    }
  }
}
