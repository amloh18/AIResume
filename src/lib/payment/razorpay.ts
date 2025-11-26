import Razorpay from 'razorpay';

// Lazy initialization - check env vars at runtime, not module load time
// This ensures Vercel serverless functions have access to env vars when they're injected
let razorpayInstance: Razorpay | null = null;

/**
 * Get Razorpay instance with lazy initialization
 * Checks environment variables at runtime (when function is called)
 * rather than at module load time (which happens before Vercel injects env vars)
 * 
 * CRITICAL: In production (Vercel), ensure RAZORPAY_KEY_SECRET is set in:
 * - Vercel Dashboard → Project → Settings → Environment Variables
 * - Without NEXT_PUBLIC_ prefix (server-side only)
 * - Redeploy after adding environment variables
 */
function getRazorpayInstance(): Razorpay | null {
  // Always check at runtime - don't rely on cached value
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  
  // Detailed validation with helpful error messages
  if (!keyId && !keySecret) {
    console.error('❌ Razorpay Configuration Error: Both RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are missing.');
    console.error('   → Add RAZORPAY_KEY_ID to Vercel Environment Variables');
    console.error('   → Add RAZORPAY_KEY_SECRET to Vercel Environment Variables (without NEXT_PUBLIC_ prefix)');
    console.error('   → Redeploy after adding environment variables');
    return null;
  }
  
  if (!keyId) {
    console.error('❌ Razorpay Configuration Error: RAZORPAY_KEY_ID is missing.');
    console.error('   → Add RAZORPAY_KEY_ID to Vercel Environment Variables');
    console.error('   → Redeploy after adding environment variables');
    return null;
  }
  
  if (!keySecret) {
    console.error('❌ Razorpay Configuration Error: RAZORPAY_KEY_SECRET is missing.');
    console.error('   → This is the MOST COMMON issue on Vercel deployments');
    console.error('   → Add RAZORPAY_KEY_SECRET to Vercel Dashboard → Project → Settings → Environment Variables');
    console.error('   → Ensure it does NOT have NEXT_PUBLIC_ prefix (server-side only)');
    console.error('   → Redeploy after adding environment variables');
    return null;
  }
  
  // Validate key formats (helpful for detecting test vs live mode issues)
  const isTestKey = keyId.startsWith('rzp_test_');
  const isLiveKey = keyId.startsWith('rzp_live_');
  
  if (!isTestKey && !isLiveKey) {
    console.warn('⚠️  Razorpay Key ID format may be invalid. Expected format: rzp_test_... or rzp_live_...');
  }
  
  if (process.env.NODE_ENV === 'production' && isTestKey) {
    console.warn('⚠️  Using Razorpay TEST keys in production. Ensure this is intentional.');
  }
  
  // Create instance if not already created (lazy initialization with caching)
  if (!razorpayInstance) {
    try {
      razorpayInstance = new Razorpay({
        key_id: keyId,
        key_secret: keySecret,
      });
      console.log('✅ Razorpay instance initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Razorpay instance:', error);
      return null;
    }
  }
  
  return razorpayInstance;
}

// Export getter function for explicit runtime access
export function getRazorpay(): Razorpay | null {
  return getRazorpayInstance();
}

// Export as a constant for backward compatibility
// Note: This still evaluates at module load time, but we've updated all direct usages
// to use getRazorpay() function instead for runtime access
export const razorpay = getRazorpayInstance();

export interface CreateOrderParams {
  amount: number;
  currency: string;
  receipt: string;
  notes?: Record<string, string>;
}

export interface CreateCustomerParams {
  name: string;
  email: string;
  contact?: string;
  notes?: Record<string, string>;
}

export interface CreateSubscriptionParams {
  planId: string;
  customerId: string;
  notes?: Record<string, string>;
}

export class RazorpayService {
  // Create an order for one-time payments
  static async createOrder(params: CreateOrderParams) {
    // Validate environment variables before attempting to create order
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    
    if (!keySecret) {
      console.error('❌ Razorpay Order Creation Failed: RAZORPAY_KEY_SECRET is missing');
      console.error('   → Check Vercel Dashboard → Project → Settings → Environment Variables');
      console.error('   → Ensure RAZORPAY_KEY_SECRET is set (without NEXT_PUBLIC_ prefix)');
      console.error('   → Redeploy after adding environment variables');
      return {
        success: false,
        error: 'Razorpay secret key is not configured. Please check server environment variables.',
      };
    }
    
    if (!keyId) {
      console.error('❌ Razorpay Order Creation Failed: RAZORPAY_KEY_ID is missing');
      return {
        success: false,
        error: 'Razorpay key ID is not configured. Please check server environment variables.',
      };
    }
    
    const razorpayInstance = getRazorpayInstance();
    if (!razorpayInstance) {
      return {
        success: false,
        error: 'Razorpay is not configured. Please check server environment variables.',
      };
    }
    
    try {
      const order = await razorpayInstance.orders.create({
        amount: Math.round(params.amount * 100), // Convert to paise
        currency: params.currency,
        receipt: params.receipt,
        notes: params.notes,
      });

      console.log('✅ Razorpay order created successfully:', {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
      });

      return {
        success: true,
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        receipt: order.receipt,
      };
    } catch (error: any) {
      console.error('❌ Razorpay createOrder error:', error);
      
      // Extract detailed error information from Razorpay API
      let errorMessage = 'Failed to create Razorpay order';
      if (error?.error) {
        const razorpayError = error.error;
        errorMessage = razorpayError.description || razorpayError.message || errorMessage;
        console.error('Razorpay API Error Details:', {
          code: razorpayError.code,
          description: razorpayError.description,
          field: razorpayError.field,
          source: razorpayError.source,
          step: razorpayError.step,
          reason: razorpayError.reason,
        });
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
    const razorpayInstance = getRazorpayInstance();
    if (!razorpayInstance) {
      return {
        success: false,
        error: 'Razorpay is not configured',
      };
    }
    try {
      const customer = await razorpayInstance.customers.create({
        name: params.name,
        email: params.email,
        contact: params.contact,
        notes: params.notes,
      });

      return {
        success: true,
        customerId: customer.id,
        customer: customer,
      };
    } catch (error) {
      console.error('Razorpay createCustomer error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Create a subscription
  static async createSubscription(params: CreateSubscriptionParams) {
    const razorpayInstance = getRazorpayInstance();
    if (!razorpayInstance) {
      return {
        success: false,
        error: 'Razorpay is not configured',
      };
    }
    try {
      const subscription = await razorpayInstance.subscriptions.create({
        plan_id: params.planId,
        customer_notify: 1,
        notes: params.notes || {},
      } as any);

      return {
        success: true,
        subscriptionId: (subscription as any).id || '',
        subscription: subscription as any,
      };
    } catch (error) {
      console.error('Razorpay createSubscription error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Cancel a subscription
  static async cancelSubscription(subscriptionId: string) {
    const razorpayInstance = getRazorpayInstance();
    if (!razorpayInstance) {
      return {
        success: false,
        error: 'Razorpay is not configured',
      };
    }
    try {
      const subscription = await razorpayInstance.subscriptions.cancel(subscriptionId);
      return {
        success: true,
        subscription: subscription,
      };
    } catch (error) {
      console.error('Razorpay cancelSubscription error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Get subscription details
  static async getSubscription(subscriptionId: string) {
    const razorpayInstance = getRazorpayInstance();
    if (!razorpayInstance) {
      return {
        success: false,
        error: 'Razorpay is not configured',
      };
    }
    try {
      const subscription = await razorpayInstance.subscriptions.fetch(subscriptionId);
      return {
        success: true,
        subscription: subscription,
      };
    } catch (error) {
      console.error('Razorpay getSubscription error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Create a plan
  static async createPlan(params: {
    period: 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval: number;
    item: {
      name: string;
      amount: number;
      currency: string;
      description?: string;
    };
    notes?: Record<string, string>;
  }) {
    const razorpayInstance = getRazorpayInstance();
    if (!razorpayInstance) {
      return {
        success: false,
        error: 'Razorpay is not configured',
      };
    }
    try {
      const plan = await razorpayInstance.plans.create({
        period: params.period,
        interval: params.interval,
        item: params.item,
        notes: params.notes,
      });

      return {
        success: true,
        planId: plan.id,
        plan: plan,
      };
    } catch (error) {
      console.error('Razorpay createPlan error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Verify payment signature
  static verifyPaymentSignature(
    orderId: string,
    paymentId: string,
    signature: string
  ) {
    try {
      const text = `${orderId}|${paymentId}`;
      const crypto = require('crypto');
      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
        .update(text)
        .digest('hex');

      const isAuthentic = expectedSignature === signature;

      return {
        success: isAuthentic,
        isAuthentic,
        error: isAuthentic ? undefined : 'Invalid signature',
      };
    } catch (error) {
      console.error('Razorpay signature verification error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Verify webhook signature
  static verifyWebhookSignature(payload: string, signature: string) {
    try {
      const crypto = require('crypto');
      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET!)
        .update(payload)
        .digest('hex');

      const isAuthentic = expectedSignature === signature;

      if (isAuthentic) {
        const event = JSON.parse(payload);
        return {
          success: true,
          event: event,
        };
      } else {
        return {
          success: false,
          error: 'Invalid webhook signature',
        };
      }
    } catch (error) {
      console.error('Razorpay webhook verification error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Get payment details
  static async getPayment(paymentId: string) {
    const razorpayInstance = getRazorpayInstance();
    if (!razorpayInstance) {
      return {
        success: false,
        error: 'Razorpay is not configured',
      };
    }
    try {
      const payment = await razorpayInstance.payments.fetch(paymentId);
      return {
        success: true,
        payment: payment,
      };
    } catch (error) {
      console.error('Razorpay getPayment error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Refund payment
  static async refundPayment(paymentId: string, amount?: number, notes?: Record<string, string>) {
    const razorpayInstance = getRazorpayInstance();
    if (!razorpayInstance) {
      return {
        success: false,
        error: 'Razorpay is not configured',
      };
    }
    try {
      const refund = await razorpayInstance.payments.refund(paymentId, {
        amount: amount ? Math.round(amount * 100) : undefined,
        notes: notes,
      });

      return {
        success: true,
        refund: refund,
      };
    } catch (error) {
      console.error('Razorpay refundPayment error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

export default RazorpayService;
