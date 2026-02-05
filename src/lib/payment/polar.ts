import { Polar } from '@polar-sh/sdk';

let polarInstance: Polar | null = null;

function getPolarInstance(): Polar | null {
  const accessToken = process.env.POLAR_ACCESS_TOKEN;
  
  if (!accessToken) {
    console.error('❌ Polar Configuration Error: POLAR_ACCESS_TOKEN is missing.');
    console.error('   → Add POLAR_ACCESS_TOKEN to Vercel Dashboard → Project → Settings → Environment Variables');
    console.error('   → Ensure it does NOT have NEXT_PUBLIC_ prefix (server-side only)');
    console.error('   → Redeploy after adding environment variables');
    return null;
  }
  
  const isTestKey = accessToken.startsWith('polar_oat_') || accessToken.includes('sandbox');
  
  if (process.env.NODE_ENV === 'production' && isTestKey) {
    console.warn('⚠️  Using Polar TEST keys in production. Ensure this is intentional.');
  }
  
  if (!polarInstance) {
    try {
      polarInstance = new Polar({
        accessToken: accessToken,
        server: process.env.POLAR_MODE || 'production'
      });
      console.log('✅ Polar instance initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Polar instance:', error);
      return null;
    }
  }
  
  return polarInstance;
}

export function getPolar(): Polar | null {
  return getPolarInstance();
}

export const polar = getPolarInstance();

export interface CreateCheckoutParams {
  productPriceId: string;
  customerId?: string;
  customerEmail?: string;
  customerName?: string;
  successUrl: string;
  metadata?: Record<string, string>;
}

export interface CheckoutResponse {
  id: string;
  url: string;
  status: string;
  amount: number;
  currency: string;
}

export class PolarService {
  static async createCheckout(params: CreateCheckoutParams) {
    const accessToken = process.env.POLAR_ACCESS_TOKEN;
    
    if (!accessToken) {
      console.error('❌ Polar Checkout Creation Failed: POLAR_ACCESS_TOKEN is missing');
      console.error('   → Check Vercel Dashboard → Project → Settings → Environment Variables');
      console.error('   → Ensure POLAR_ACCESS_TOKEN is set (without NEXT_PUBLIC_ prefix)');
      console.error('   → Redeploy after adding environment variables');
      return {
        success: false,
        error: 'Polar access token is not configured. Please check server environment variables.',
      };
    }
    
    const polarInstance = getPolarInstance();
    if (!polarInstance) {
      return {
        success: false,
        error: 'Polar is not configured. Please check server environment variables.',
      };
    }
    
    try {
      const checkout = await polarInstance.checkouts.create({
        productPriceId: params.productPriceId,
        successUrl: params.successUrl,
        customerEmail: params.customerEmail,
        customerName: params.customerName,
        metadata: params.metadata,
      });

      console.log('✅ Polar checkout created successfully:', {
        checkoutId: checkout.id,
        url: checkout.url,
        status: checkout.status,
      });

      return {
        success: true,
        checkoutId: checkout.id,
        checkoutUrl: checkout.url,
        status: checkout.status,
        checkout: checkout,
      };
    } catch (error: any) {
      console.error('❌ Polar createCheckout error:', error);
      
      let errorMessage = 'Failed to create Polar checkout';
      if (error?.message) {
        errorMessage = error.message;
        console.error('Polar API Error Details:', {
          message: error.message,
          status: error.status,
          statusText: error.statusText,
        });
        
        if (error.message?.toLowerCase().includes('api key') || 
            error.message?.toLowerCase().includes('authentication')) {
          console.error('⚠️  This error suggests POLAR_ACCESS_TOKEN may be incorrect or missing');
          console.error('   → Verify the access token in Vercel Environment Variables');
          console.error('   → Ensure it matches your Polar Dashboard');
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

  static async getCheckout(checkoutId: string) {
    const polarInstance = getPolarInstance();
    if (!polarInstance) {
      return {
        success: false,
        error: 'Polar is not configured',
      };
    }
    
    try {
      const checkout = await polarInstance.checkouts.get({
        id: checkoutId,
      });

      return {
        success: true,
        checkout: checkout,
      };
    } catch (error) {
      console.error('Polar getCheckout error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  static async listProducts() {
    const polarInstance = getPolarInstance();
    if (!polarInstance) {
      return {
        success: false,
        error: 'Polar is not configured',
      };
    }
    
    try {
      const products = await polarInstance.products.list({});
      return {
        success: true,
        products: products,
      };
    } catch (error) {
      console.error('Polar listProducts error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  static async getProduct(productId: string) {
    const polarInstance = getPolarInstance();
    if (!polarInstance) {
      return {
        success: false,
        error: 'Polar is not configured',
      };
    }
    
    try {
      const product = await polarInstance.products.get({
        id: productId,
      });
      return {
        success: true,
        product: product,
      };
    } catch (error) {
      console.error('Polar getProduct error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  static verifyWebhookSignature(payload: string, signature: string) {
    const webhookSecret = process.env.POLAR_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('❌ Polar Webhook Verification Failed: POLAR_WEBHOOK_SECRET is missing');
      return {
        success: false,
        error: 'Polar webhook secret is not configured',
      };
    }
    
    try {
      const crypto = require('crypto');
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
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
      console.error('Polar webhook verification error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

export default PolarService;
