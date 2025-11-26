import Stripe from 'stripe';

// Lazy initialization - check env vars at runtime, not module load time
// This ensures Vercel serverless functions have access to env vars when they're injected
let stripeInstance: Stripe | null = null;

/**
 * Get Stripe instance with lazy initialization
 * Checks environment variables at runtime (when function is called)
 * rather than at module load time (which happens before Vercel injects env vars)
 * 
 * CRITICAL: In production (Vercel), ensure STRIPE_SECRET_KEY is set in:
 * - Vercel Dashboard → Project → Settings → Environment Variables
 * - Without NEXT_PUBLIC_ prefix (server-side only)
 * - Redeploy after adding environment variables
 */
function getStripeInstance(): Stripe | null {
  // Always check at runtime - don't rely on cached value
  const secretKey = process.env.STRIPE_SECRET_KEY;
  
  // Detailed validation with helpful error messages
  if (!secretKey) {
    console.error('❌ Stripe Configuration Error: STRIPE_SECRET_KEY is missing.');
    console.error('   → This is the MOST COMMON issue on Vercel deployments');
    console.error('   → Add STRIPE_SECRET_KEY to Vercel Dashboard → Project → Settings → Environment Variables');
    console.error('   → Ensure it does NOT have NEXT_PUBLIC_ prefix (server-side only)');
    console.error('   → Redeploy after adding environment variables');
    return null;
  }
  
  // Validate key format (helpful for detecting test vs live mode issues)
  const isTestKey = secretKey.startsWith('sk_test_');
  const isLiveKey = secretKey.startsWith('sk_live_');
  
  if (!isTestKey && !isLiveKey) {
    console.warn('⚠️  Stripe Secret Key format may be invalid. Expected format: sk_test_... or sk_live_...');
  }
  
  if (process.env.NODE_ENV === 'production' && isTestKey) {
    console.warn('⚠️  Using Stripe TEST keys in production. Ensure this is intentional.');
  }
  
  // Create instance if not already created (lazy initialization with caching)
  if (!stripeInstance) {
    try {
      stripeInstance = new Stripe(secretKey, {
        apiVersion: '2024-11-20.acacia',
      });
      console.log('✅ Stripe instance initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Stripe instance:', error);
      return null;
    }
  }
  
  return stripeInstance;
}

// Export getter function for explicit runtime access
export function getStripe(): Stripe | null {
  return getStripeInstance();
}

// Export as a constant for backward compatibility
// Note: This still evaluates at module load time, but we've updated all direct usages
// to use getStripe() function instead for runtime access
export const stripe = getStripeInstance();

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
    // Validate environment variables before attempting to create payment intent
    const secretKey = process.env.STRIPE_SECRET_KEY;
    
    if (!secretKey) {
      console.error('❌ Stripe Payment Intent Creation Failed: STRIPE_SECRET_KEY is missing');
      console.error('   → Check Vercel Dashboard → Project → Settings → Environment Variables');
      console.error('   → Ensure STRIPE_SECRET_KEY is set (without NEXT_PUBLIC_ prefix)');
      console.error('   → Redeploy after adding environment variables');
      return {
        success: false,
        error: 'Stripe secret key is not configured. Please check server environment variables.',
      };
    }
    
    const stripeInstance = getStripeInstance();
    if (!stripeInstance) {
      return {
        success: false,
        error: 'Stripe is not configured. Please check server environment variables.',
      };
    }
    
    try {
      const paymentIntent = await stripeInstance.paymentIntents.create({
        amount: Math.round(params.amount * 100), // Convert to cents
        currency: params.currency.toLowerCase(),
        customer: params.customerId,
        metadata: params.metadata,
        description: params.description,
        automatic_payment_methods: {
          enabled: true,
        },
      });

      console.log('✅ Stripe payment intent created successfully:', {
        paymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
      });

      return {
        success: true,
        paymentIntentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
      };
    } catch (error: any) {
      console.error('❌ Stripe createPaymentIntent error:', error);
      
      // Extract detailed error information from Stripe API
      let errorMessage = 'Failed to create Stripe payment intent';
      if (error?.type) {
        errorMessage = error.message || errorMessage;
        console.error('Stripe API Error Details:', {
          type: error.type,
          code: error.code,
          message: error.message,
          param: error.param,
          decline_code: error.decline_code,
        });
        
        // Check for common errors
        if (error.message?.toLowerCase().includes('api key') || 
            error.message?.toLowerCase().includes('authentication')) {
          console.error('⚠️  This error suggests STRIPE_SECRET_KEY may be incorrect or missing');
          console.error('   → Verify the secret key in Vercel Environment Variables');
          console.error('   → Ensure it matches your Stripe Dashboard (Test vs Live mode)');
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  // Create a customer
  static async createCustomer(params: CreateCustomerParams) {
    const stripeInstance = getStripeInstance();
    if (!stripeInstance) {
      return {
        success: false,
        error: 'Stripe is not configured',
      };
    }
    
    try {
      const customer = await stripeInstance.customers.create({
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
    const stripeInstance = getStripeInstance();
    if (!stripeInstance) {
      return {
        success: false,
        error: 'Stripe is not configured',
      };
    }
    
    try {
      const subscription = await stripeInstance.subscriptions.create({
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
    const stripeInstance = getStripeInstance();
    if (!stripeInstance) {
      return {
        success: false,
        error: 'Stripe is not configured',
      };
    }
    
    try {
      const subscription = await stripeInstance.subscriptions.cancel(subscriptionId);
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
    const stripeInstance = getStripeInstance();
    if (!stripeInstance) {
      return {
        success: false,
        error: 'Stripe is not configured',
      };
    }
    
    try {
      const subscription = await stripeInstance.subscriptions.retrieve(subscriptionId);
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
    const stripeInstance = getStripeInstance();
    if (!stripeInstance) {
      return {
        success: false,
        error: 'Stripe is not configured',
      };
    }
    
    try {
      const price = await stripeInstance.prices.create({
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
    const stripeInstance = getStripeInstance();
    if (!stripeInstance) {
      return {
        success: false,
        error: 'Stripe is not configured',
      };
    }
    
    try {
      const product = await stripeInstance.products.create({
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
    const stripeInstance = getStripeInstance();
    if (!stripeInstance) {
      return {
        success: false,
        error: 'Stripe is not configured',
      };
    }
    
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('❌ Stripe Webhook Verification Failed: STRIPE_WEBHOOK_SECRET is missing');
      return {
        success: false,
        error: 'Stripe webhook secret is not configured',
      };
    }
    
    try {
      const event = stripeInstance.webhooks.constructEvent(
        payload,
        signature,
        webhookSecret
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
