// @ts-nocheck
import Stripe from 'stripe';
import Tenant from '@/models/b2b/Tenant';
import { log } from '@/lib/edge-logger';

// Initialize Stripe instance
const stripeSecretKey = process.env.STRIPE_SECRET_KEY || '';
export const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2025-01-27.acacia' as any, // use compatible version
});

export class B2BBillingService {
  /**
   * Track API usage for a specific tenant and report it to Stripe.
   */
  static async trackUsage(tenantId: string, quantity: number = 1): Promise<void> {
    try {
      const tenant = await Tenant.findById(tenantId);
      
      if (!tenant) {
        log.error('Tenant not found for usage tracking', { tenantId });
        return;
      }

      // Increment local usage count
      tenant.apiUsageCount = (tenant.apiUsageCount || 0) + quantity;
      await tenant.save();

      // If tenant has a Stripe customer, report usage to Stripe for metered billing
      if (tenant.stripeCustomerId && stripeSecretKey) {
        await stripe.billing.meterEvents.create({
          event_name: 'api_request', // This needs to match the meter's event_name in Stripe
          payload: {
            stripe_customer_id: tenant.stripeCustomerId,
            value: quantity.toString(),
          }
        });
        log.info('Reported API usage to Stripe', { tenantId, quantity });
      }
    } catch (error: any) {
      log.error('Error tracking B2B API usage', { error: error.message, tenantId });
    }
  }

  /**
   * Set up Stripe Customer and Subscription for a B2B tenant
   * This would typically be called when a tenant upgrades to a paid tier
   */
  static async setupTenantBilling(tenantId: string, priceId: string): Promise<any> {
    try {
      const tenant = await Tenant.findById(tenantId);
      if (!tenant) throw new Error('Tenant not found');
      if (!stripeSecretKey) throw new Error('Stripe is not configured');

      let customerId = tenant.stripeCustomerId;

      // 1. Create or retrieve Stripe Customer
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: tenant.contactEmail,
          name: tenant.name,
          metadata: {
            tenantId: tenant._id.toString(),
            isB2B: 'true'
          }
        });
        customerId = customer.id;
        tenant.stripeCustomerId = customerId;
        await tenant.save();
      }

      // 2. Create Subscription (Metered Billing)
      const subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [
          {
            price: priceId, // The metered price ID in Stripe
          },
        ],
        metadata: {
          tenantId: tenant._id.toString()
        },
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
      });

      // 3. Save Subscription ID
      tenant.stripeSubscriptionId = subscription.id;
      // We don't need subscriptionItemId for the new meterEvents API, but we'll save it if needed
      if (subscription.items.data.length > 0) {
        tenant.stripeSubscriptionItemId = subscription.items.data[0].id;
      }
      await tenant.save();

      return {
        success: true,
        subscriptionId: subscription.id,
        clientSecret: (subscription.latest_invoice as any)?.payment_intent?.client_secret
      };
    } catch (error: any) {
      log.error('Error setting up tenant billing', { error: error.message, tenantId });
      throw error;
    }
  }
}
