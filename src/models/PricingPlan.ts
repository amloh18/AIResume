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
  storageLimit: number; // in MB
  features: string[];
  status: 'active' | 'inactive';
  isPopular: boolean;
  isBestValue: boolean;
  sortOrder: number;
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
  storageLimit: {
    type: Number,
    default: 100, // 100MB default
    min: [0, 'Storage limit cannot be negative']
  },
  features: {
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
  }
}, {
  timestamps: true
});

// Index for better query performance
pricingPlanSchema.index({ key: 1 }, { unique: true });
pricingPlanSchema.index({ status: 1, sortOrder: 1 });
pricingPlanSchema.index({ billingCycle: 1, currency: 1 });

export default mongoose.models.PricingPlan || mongoose.model<IPricingPlan>('PricingPlan', pricingPlanSchema);
