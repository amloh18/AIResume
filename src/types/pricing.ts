export interface PricingPlan {
  _id?: string;
  id?: string;
  key: string;
  name: string;
  description: string;
  price_monthly?: number;
  price_quarterly?: number;
  price_yearly?: number;
  price_one_time?: number;
  currency: string;
  features: string[];
  notIncludedFeatures?: string[];
  isPopular?: boolean;
  isBestValue?: boolean;
  displayOnLanding?: boolean;
  targetAudience?: string;
  // Promotional pricing
  promotionalPrice_monthly?: number;
  promotionalPrice_quarterly?: number;
  promotionalPrice_yearly?: number;
  promotionalPrice_one_time?: number;
  promotionValidFrom?: string;
  promotionValidUntil?: string;
  promotionDescription?: string;
  isPromotionActive?: boolean;
  effectivePrice?: {
    monthly?: number;
    quarterly?: number;
    yearly?: number;
    oneTime?: number;
  };
  billingCycle?: 'monthly' | 'quarterly' | 'yearly' | 'one-time';
  maxCVs?: number;
  maxExports?: number;
  storageLimit?: number;
  status?: 'active' | 'inactive';
  sortOrder?: number;
  stripePriceId_monthly?: string;
  stripePriceId_quarterly?: string;
  stripePriceId_yearly?: string;
  stripePriceId_one_time?: string;
  razorpayPlanId_monthly?: string;
  razorpayPlanId_quarterly?: string;
  razorpayPlanId_yearly?: string;
  dayPassDuration?: number;
}

export interface PricingData {
  originalPrice: number;
  originalCurrency: string;
  convertedPrice: number;
  convertedCurrency: string;
  exchangeRate: number;
  paymentPartner: 'polar' | 'razorpay';
}

