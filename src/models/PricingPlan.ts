import mongoose, { Document, Schema } from 'mongoose';

export interface IPricingPlan extends Document {
  key: 'free' | 'day_pass' | 'pro_monthly' | 'pro_quarterly' | 'pro_yearly';
  name: string;
  description: string;
  price_monthly?: number;
  price_quarterly?: number;
  price_yearly?: number;
  price_one_time?: number;
  currency: string;
  billingCycle: 'one-time' | 'monthly' | 'quarterly' | 'yearly';
  maxCVs: number;
  maxExports: number;
  maxCoverLetters: number;
  maxJobs: number;
  maxJourneys: number;
  storageLimit: number; // in MB
  features: string[];
  notIncludedFeatures: string[];
  status: 'active' | 'inactive';
  isPopular: boolean;
  isBestValue: boolean;
  sortOrder: number;
  displayOnLanding: boolean;
  targetAudience: 'all' | 'new_signups' | 'free_users' | 'existing_users';
  // Promotional pricing
  promotionalPrice_monthly?: number;
  promotionalPrice_quarterly?: number;
  promotionalPrice_yearly?: number;
  promotionalPrice_one_time?: number;
  promotionValidFrom?: Date;
  promotionValidUntil?: Date;
  promotionDescription?: string;
  // Provider IDs
  stripePriceId_monthly?: string;
  stripePriceId_quarterly?: string;
  stripePriceId_yearly?: string;
  stripePriceId_one_time?: string;
  razorpayPlanId_monthly?: string;
  razorpayPlanId_quarterly?: string;
  razorpayPlanId_yearly?: string;
  // Day Pass specific
  dayPassDuration?: number; // in hours
  // Time-based fields
  durationInDays?: number; // 1, 30, 90, 365
  durationType?: 'hour' | 'day' | 'month' | 'year';
  // Regional pricing
  regionalPricing?: Array<{
    region: string; // 'IN', 'US', 'EU', 'GB', etc.
    currency: string;
    price: number;
    displayPrice: string;
    stripePriceId?: string; // Region-specific Stripe price ID
    razorpayPlanId?: string; // Region-specific Razorpay plan ID
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const pricingPlanSchema = new Schema<IPricingPlan>({
  key: {
    type: String,
    required: [true, 'Plan key is required'],
    enum: ['free', 'day_pass', 'pro_monthly', 'pro_quarterly', 'pro_yearly']
  },
  name: {
    type: String,
    required: [true, 'Plan name is required'],
    trim: true,
    maxlength: [100, 'Plan name cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Plan description is required'],
    trim: true,
    maxlength: [500, 'Plan description cannot exceed 500 characters']
  },
  price_monthly: {
    type: Number,
    min: [0, 'Price cannot be negative']
  },
  price_quarterly: {
    type: Number,
    min: [0, 'Price cannot be negative']
  },
  price_yearly: {
    type: Number,
    min: [0, 'Price cannot be negative']
  },
  price_one_time: {
    type: Number,
    min: [0, 'Price cannot be negative']
  },
  currency: {
    type: String,
    required: [true, 'Currency is required'],
    default: 'EUR',
    enum: ['EUR', 'USD', 'INR']
  },
  billingCycle: {
    type: String,
    required: [true, 'Billing cycle is required'],
    enum: ['one-time', 'monthly', 'quarterly', 'yearly'],
    default: 'monthly'
  },
  maxCVs: {
    type: Number,
    required: [true, 'Maximum CVs limit is required'],
    min: [0, 'CV limit cannot be negative'],
    default: 3
  },
  maxExports: {
    type: Number,
    required: [true, 'Maximum exports limit is required'],
    min: [0, 'Export limit cannot be negative'],
    default: 1
  },
  maxCoverLetters: {
    type: Number,
    required: [true, 'Maximum cover letters limit is required'],
    min: [0, 'Cover letter limit cannot be negative'],
    default: 3
  },
  maxJobs: {
    type: Number,
    required: [true, 'Maximum jobs limit is required'],
    min: [0, 'Job limit cannot be negative'],
    default: 5
  },
  maxJourneys: {
    type: Number,
    required: [true, 'Maximum journeys limit is required'],
    min: [0, 'Journey limit cannot be negative'],
    default: 5
  },
  storageLimit: {
    type: Number,
    default: 100, // 100MB default
    min: [0, 'Storage limit cannot be negative']
  },
  features: {
    type: [String],
    default: []
  },
  notIncludedFeatures: {
    type: [String],
    default: []
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  isPopular: {
    type: Boolean,
    default: false
  },
  isBestValue: {
    type: Boolean,
    default: false
  },
  sortOrder: {
    type: Number,
    default: 0
  },
  displayOnLanding: {
    type: Boolean,
    default: true
  },
  targetAudience: {
    type: String,
    enum: ['all', 'new_signups', 'free_users', 'existing_users'],
    default: 'all'
  },
  // Promotional pricing
  promotionalPrice_monthly: {
    type: Number,
    min: [0, 'Promotional price cannot be negative']
  },
  promotionalPrice_quarterly: {
    type: Number,
    min: [0, 'Promotional price cannot be negative']
  },
  promotionalPrice_yearly: {
    type: Number,
    min: [0, 'Promotional price cannot be negative']
  },
  promotionalPrice_one_time: {
    type: Number,
    min: [0, 'Promotional price cannot be negative']
  },
  promotionValidFrom: {
    type: Date
  },
  promotionValidUntil: {
    type: Date
  },
  promotionDescription: {
    type: String,
    trim: true,
    maxlength: [200, 'Promotion description cannot exceed 200 characters']
  },
  // Provider IDs
  stripePriceId_monthly: String,
  stripePriceId_quarterly: String,
  stripePriceId_yearly: String,
  stripePriceId_one_time: String,
  razorpayPlanId_monthly: String,
  razorpayPlanId_quarterly: String,
  razorpayPlanId_yearly: String,
  // Day Pass specific
  dayPassDuration: {
    type: Number,
    default: 24, // 24 hours default
    min: [1, 'Day pass duration must be at least 1 hour']
  },
  // Time-based fields
  durationInDays: {
    type: Number,
    min: [0, 'Duration cannot be negative']
    // 1 for day pass, 30 for monthly, 90 for quarterly, 365 for yearly
  },
  durationType: {
    type: String,
    enum: ['hour', 'day', 'month', 'year'],
    default: 'day'
  },
  // Regional pricing
  regionalPricing: [{
    region: {
      type: String,
      required: true,
      trim: true
    },
    currency: {
      type: String,
      required: true,
      trim: true
    },
    price: {
      type: Number,
      required: true,
      min: [0, 'Price cannot be negative']
    },
    displayPrice: {
      type: String,
      required: true,
      trim: true
    },
    stripePriceId: String,
    razorpayPlanId: String
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for checking if promotion is active
pricingPlanSchema.virtual('isPromotionActive').get(function() {
  if (!this.promotionValidFrom || !this.promotionValidUntil) return false;
  const now = new Date();
  return now >= this.promotionValidFrom && now <= this.promotionValidUntil;
});

// Virtual for getting effective price based on promotion
pricingPlanSchema.virtual('effectivePrice').get(function() {
  const isActive = this.get('isPromotionActive');
  if (isActive) {
    return {
      monthly: this.promotionalPrice_monthly || this.price_monthly,
      quarterly: this.promotionalPrice_quarterly || this.price_quarterly,
      yearly: this.promotionalPrice_yearly || this.price_yearly,
      oneTime: this.promotionalPrice_one_time || this.price_one_time
    };
  }
  return {
    monthly: this.price_monthly,
    quarterly: this.price_quarterly,
    yearly: this.price_yearly,
    oneTime: this.price_one_time
  };
});

// Index for better query performance
pricingPlanSchema.index({ key: 1 }, { unique: true });
pricingPlanSchema.index({ status: 1, sortOrder: 1 });
pricingPlanSchema.index({ billingCycle: 1, currency: 1 });
pricingPlanSchema.index({ displayOnLanding: 1, targetAudience: 1 });
pricingPlanSchema.index({ promotionValidFrom: 1, promotionValidUntil: 1 });
pricingPlanSchema.index({ 'regionalPricing.region': 1 });

// Export the schema for use in admin models
export { pricingPlanSchema };

export default mongoose.models.PricingPlan || mongoose.model<IPricingPlan>('PricingPlan', pricingPlanSchema);
