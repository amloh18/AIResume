import Stripe from 'stripe';

// Only create Stripe instance if API key is available
const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-08-27.basil' as const,
    })
  : null;

// Export the stripe instance for direct access
export { stripe };

export interface CreatePaymentIntentParams {
  amount: number;
  currency: string;
  customerId?: string;
  metadata?: Record<string, string>;
  description?: string;
}

export interface CreateCustomerParams {
  email: string;
  name?: string;
  metadata?: Record<string, string>;
}

export interface CreateSubscriptionParams {
  customerId: string;
  priceId: string;
  metadata?: Record<string, string>;
}

export class StripeService {
  // Create a payment intent for one-time payments
  static async createPaymentIntent(params: CreatePaymentIntentParams) {
    if (!stripe) {
      return {
        success: false,
        error: 'Stripe is not configured',
      };
    }
    
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(params.amount * 100), // Convert to cents
        currency: params.currency.toLowerCase(),
        customer: params.customerId,
        metadata: params.metadata,
        description: params.description,
        automatic_payment_methods: {
          enabled: true,
        },
      });

      return {
        success: true,
        paymentIntentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
      };
    } catch (error) {
      console.error('Stripe createPaymentIntent error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Create a customer
  static async createCustomer(params: CreateCustomerParams) {
    if (!stripe) {
      return {
        success: false,
        error: 'Stripe is not configured',
      };
    }
    
    try {
      const customer = await stripe.customers.create({
        email: params.email,
        name: params.name,
        metadata: params.metadata,
      });

      return {
        success: true,
        customerId: customer.id,
        customer: customer,
      };
    } catch (error) {
      console.error('Stripe createCustomer error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Create a subscription
  static async createSubscription(params: CreateSubscriptionParams) {
    if (!stripe) {
      return {
        success: false,
        error: 'Stripe is not configured',
      };
    }
    
    try {
      const subscription = await stripe.subscriptions.create({
        customer: params.customerId,
        items: [{ price: params.priceId }],
        metadata: params.metadata,
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
      });

      return {
        success: true,
        subscriptionId: subscription.id,
        subscription: subscription,
        clientSecret: (subscription.latest_invoice as any)?.payment_intent?.client_secret,
      };
    } catch (error) {
      console.error('Stripe createSubscription error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Cancel a subscription
  static async cancelSubscription(subscriptionId: string) {
    if (!stripe) {
      return {
        success: false,
        error: 'Stripe is not configured',
      };
    }
    
    try {
      const subscription = await stripe.subscriptions.cancel(subscriptionId);
      return {
        success: true,
        subscription: subscription,
      };
    } catch (error) {
      console.error('Stripe cancelSubscription error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Get subscription details
  static async getSubscription(subscriptionId: string) {
    if (!stripe) {
      return {
        success: false,
        error: 'Stripe is not configured',
      };
    }
    
    try {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      return {
        success: true,
        subscription: subscription,
      };
    } catch (error) {
      console.error('Stripe getSubscription error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Create a price for a product
  static async createPrice(params: {
    productId: string;
    unitAmount: number;
    currency: string;
    recurring?: {
      interval: 'day' | 'week' | 'month' | 'year';
      intervalCount?: number;
    };
  }) {
    if (!stripe) {
      return {
        success: false,
        error: 'Stripe is not configured',
      };
    }
    
    try {
      const price = await stripe.prices.create({
        product: params.productId,
        unit_amount: Math.round(params.unitAmount * 100),
        currency: params.currency.toLowerCase(),
        recurring: params.recurring,
      });

      return {
        success: true,
        priceId: price.id,
        price: price,
      };
    } catch (error) {
      console.error('Stripe createPrice error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Create a product
  static async createProduct(params: {
    name: string;
    description?: string;
    metadata?: Record<string, string>;
  }) {
    if (!stripe) {
      return {
        success: false,
        error: 'Stripe is not configured',
      };
    }
    
    try {
      const product = await stripe.products.create({
        name: params.name,
        description: params.description,
        metadata: params.metadata,
      });

      return {
        success: true,
        productId: product.id,
        product: product,
      };
    } catch (error) {
      console.error('Stripe createProduct error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Verify webhook signature
  static verifyWebhookSignature(payload: string, signature: string) {
    if (!stripe) {
      return {
        success: false,
        error: 'Stripe is not configured',
      };
    }
    
    try {
      const event = stripe.webhooks.constructEvent(
        payload,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
      return {
        success: true,
        event: event,
      };
    } catch (error) {
      console.error('Stripe webhook verification error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

export default StripeService;
