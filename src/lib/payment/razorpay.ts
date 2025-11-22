import Razorpay from 'razorpay';

// Lazy initialization - check env vars at runtime, not module load time
// This ensures Vercel serverless functions have access to env vars when they're injected
let razorpayInstance: Razorpay | null = null;

/**
 * Get Razorpay instance with lazy initialization
 * Checks environment variables at runtime (when function is called)
 * rather than at module load time (which happens before Vercel injects env vars)
 */
function getRazorpayInstance(): Razorpay | null {
  // Always check at runtime - don't rely on cached value
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  
  if (!keyId || !keySecret) {
    return null;
  }
  
  // Create instance if not already created (lazy initialization with caching)
  if (!razorpayInstance) {
    razorpayInstance = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });
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
    const razorpayInstance = getRazorpayInstance();
    if (!razorpayInstance) {
      return {
        success: false,
        error: 'Razorpay is not configured',
      };
    }
    
    try {
      const order = await razorpayInstance.orders.create({
        amount: Math.round(params.amount * 100), // Convert to paise
        currency: params.currency,
        receipt: params.receipt,
        notes: params.notes,
      });

      return {
        success: true,
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        receipt: order.receipt,
      };
    } catch (error) {
      console.error('Razorpay createOrder error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
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
