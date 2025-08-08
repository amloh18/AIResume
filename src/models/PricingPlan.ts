import mongoose, { Document, Schema } from 'mongoose';

export interface IPricingPlan extends Document {
  name: string;
  description: string;
  price: number;
  currency: string;
  billingCycle: 'monthly' | 'yearly' | 'one-time';
  maxCVs: number;
  maxExports: number;
  storageLimit: number; // in MB
  features: string[];
  status: 'active' | 'inactive';
  isPopular: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const pricingPlanSchema = new Schema<IPricingPlan>({
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
  price: {
    type: Number,
    required: [true, 'Plan price is required'],
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
    enum: ['monthly', 'yearly', 'one-time'],
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
  sortOrder: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Index for better query performance
pricingPlanSchema.index({ status: 1, sortOrder: 1 });
pricingPlanSchema.index({ billingCycle: 1, currency: 1 });

export default mongoose.models.PricingPlan || mongoose.model<IPricingPlan>('PricingPlan', pricingPlanSchema);
