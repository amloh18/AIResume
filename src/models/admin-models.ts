// Admin-specific models and functions
export * from './admin';

// Lazy imports to prevent build-time issues
let PricingPlan: any = null;
let DiscountCode: any = null;
let Subscription: any = null;
let User: any = null;
let Template: any = null;
let Testimonial: any = null;
let Newsletter: any = null;
let Invoice: any = null;
let PaymentMethod: any = null;
let EmailCampaign: any = null;

// Lazy loading function
const loadModels = async () => {
  if (typeof window !== 'undefined') {
    return null; // Don't load models on client side
  }
  
  try {
    const models = await import('./index');
    PricingPlan = models.PricingPlan;
    DiscountCode = models.DiscountCode;
    Subscription = models.Subscription;
    User = models.User;
    Template = models.Template;
    Testimonial = models.Testimonial;
    Newsletter = models.Newsletter;
    Invoice = models.Invoice;
    PaymentMethod = models.PaymentMethod;
    EmailCampaign = models.EmailCampaign;
    return models;
  } catch (error) {
    console.error('Error loading models:', error);
    return null;
  }
};

// Backward compatibility functions with lazy loading
export const getAdminPricingPlan = async () => {
  if (!PricingPlan) {
    await loadModels();
  }
  if (!PricingPlan) {
    console.error('PricingPlan model is not available');
    return null;
  }
  return PricingPlan;
};

export const getAdminDiscountCode = async () => {
  if (!DiscountCode) {
    await loadModels();
  }
  if (!DiscountCode) {
    console.error('DiscountCode model is not available');
    return null;
  }
  return DiscountCode;
};

export const getAdminSubscription = async () => {
  if (!Subscription) {
    await loadModels();
  }
  if (!Subscription) {
    console.error('Subscription model is not available');
    return null;
  }
  return Subscription;
};

export const getAdminUser = async () => {
  if (!User) {
    await loadModels();
  }
  if (!User) {
    console.error('User model is not available');
    return null;
  }
  return User;
};

export const getAdminTemplate = async () => {
  if (!Template) {
    await loadModels();
  }
  if (!Template) {
    console.error('Template model is not available');
    return null;
  }
  return Template;
};

export const getAdminTestimonial = async () => {
  if (!Testimonial) {
    await loadModels();
  }
  if (!Testimonial) {
    console.error('Testimonial model is not available');
    return null;
  }
  return Testimonial;
};

export const getAdminNewsletter = async () => {
  if (!Newsletter) {
    await loadModels();
  }
  if (!Newsletter) {
    console.error('Newsletter model is not available');
    return null;
  }
  return Newsletter;
};

export const getAdminInvoice = async () => {
  if (!Invoice) {
    await loadModels();
  }
  if (!Invoice) {
    console.error('Invoice model is not available');
    return null;
  }
  return Invoice;
};

export const getAdminPaymentMethod = async () => {
  if (!PaymentMethod) {
    await loadModels();
  }
  if (!PaymentMethod) {
    console.error('PaymentMethod model is not available');
    return null;
  }
  return PaymentMethod;
};

export const getAdminEmailCampaign = async () => {
  if (!EmailCampaign) {
    await loadModels();
  }
  if (!EmailCampaign) {
    console.error('EmailCampaign model is not available');
    return null;
  }
  return EmailCampaign;
};
