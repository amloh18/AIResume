// Admin models that use the cvcircle_admin database
import mongoose from 'mongoose';
import { getAdminConnection } from '@/lib/admin-database-connection';

// Import the original schemas
import { ITemplate, templateSchema } from './Template';
import { IDiscountCode, discountCodeSchema } from './DiscountCode';
import { IInvoice, invoiceSchema } from './Invoice';
import { INewsletter, newsletterSchema } from './Newsletter';
import { IPaymentMethod, paymentMethodSchema } from './PaymentMethod';
import { IPricingPlan, pricingPlanSchema } from './PricingPlan';
import { ISubscription, subscriptionSchema } from './Subscription';
import { ITestimonial, testimonialSchema } from './Testimonial';

// Create admin model instances that use the admin database connection
let adminConnection: mongoose.Connection | null = null;

async function getAdminModels() {
  if (!adminConnection) {
    adminConnection = await getAdminConnection();
  }
  return adminConnection;
}

// Admin Template Model
export async function getAdminTemplate() {
  const conn = await getAdminModels();
  return conn.model<ITemplate>('Template', templateSchema);
}

// Admin DiscountCode Model
export async function getAdminDiscountCode() {
  const conn = await getAdminModels();
  return conn.model<IDiscountCode>('DiscountCode', discountCodeSchema);
}

// Admin Invoice Model
export async function getAdminInvoice() {
  const conn = await getAdminModels();
  return conn.model<IInvoice>('Invoice', invoiceSchema);
}

// Admin Newsletter Model
export async function getAdminNewsletter() {
  const conn = await getAdminModels();
  return conn.model<INewsletter>('Newsletter', newsletterSchema);
}

// Admin PaymentMethod Model
export async function getAdminPaymentMethod() {
  const conn = await getAdminModels();
  return conn.model<IPaymentMethod>('PaymentMethod', paymentMethodSchema);
}

// Admin PricingPlan Model
export async function getAdminPricingPlan() {
  const conn = await getAdminModels();
  return conn.model<IPricingPlan>('PricingPlan', pricingPlanSchema);
}

// Admin Subscription Model
export async function getAdminSubscription() {
  const conn = await getAdminModels();
  return conn.model<ISubscription>('Subscription', subscriptionSchema);
}

// Admin Testimonial Model
export async function getAdminTestimonial() {
  const conn = await getAdminModels();
  return conn.model<ITestimonial>('Testimonial', testimonialSchema);
}

// Helper function to get admin models synchronously
export function getAdminModelSync(modelName: string) {
  if (!adminConnection) {
    throw new Error('Admin connection not initialized. Call getAdminModels() first.');
  }
  
  switch (modelName) {
    case 'Template':
      return adminConnection.model<ITemplate>('Template', templateSchema);
    case 'DiscountCode':
      return adminConnection.model<IDiscountCode>('DiscountCode', discountCodeSchema);
    case 'Invoice':
      return adminConnection.model<IInvoice>('Invoice', invoiceSchema);
    case 'Newsletter':
      return adminConnection.model<INewsletter>('Newsletter', newsletterSchema);
    case 'PaymentMethod':
      return adminConnection.model<IPaymentMethod>('PaymentMethod', paymentMethodSchema);
    case 'PricingPlan':
      return adminConnection.model<IPricingPlan>('PricingPlan', pricingPlanSchema);
    case 'Subscription':
      return adminConnection.model<ISubscription>('Subscription', subscriptionSchema);
    case 'Testimonial':
      return adminConnection.model<ITestimonial>('Testimonial', testimonialSchema);
    default:
      throw new Error(`Unknown admin model: ${modelName}`);
  }
}

// Initialize admin models
export async function initializeAdminModels() {
  try {
    await getAdminModels();
    console.log('✅ Admin models initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize admin models:', error);
    throw error;
  }
}
