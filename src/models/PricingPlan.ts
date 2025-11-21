import mongoose, { Document, Schema } from 'mongoose';

export interface IPricingPlan extends Document {
  key: 'free' | 'day_pass' | 'pro_monthly' | 'pro_quarterly' | 'pro_yearly';
  name: string;
  description: string;
  // REMOVED: price_monthly, price_quarterly, price_yearly, price_one_time (now in CountryPricing)
  // REMOVED: currency (now in CountryPricing)
  // KEEP: billingCycle - this is plan structure metadata, not pricing
  billingCycle: 'one-time' | 'monthly' | 'quarterly' | 'yearly';
  // Credit-based system (replaces maxCVs, maxJobs, maxJourneys, maxExports, maxCoverLetters)
  credits: {
    cvCredits: number; // -1 for unlimited
    exportCredits: number; // -1 for unlimited
    atsCheckCredits: number; // -1 for unlimited
    jobCredits: number; // -1 for unlimited
    resetSchedule: 'monthly' | 'quarterly' | 'yearly' | 'one-time' | 'never';
  };
  // Legacy fields (deprecated - use credits instead)
  maxCVs?: number;
  maxExports?: number;
  maxCoverLetters?: number;
  maxJobs?: number;
  maxJourneys?: number;
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
  // Reference to CountryPricing ObjectIds
  // All prices and currency come from CountryPricing collection via these references
  // Option 1: Default CountryPricing (fallback when user's country not found)
  defaultCountryPricingId?: mongoose.Types.ObjectId;
  // Option 2: Map of country codes to CountryPricing ObjectIds (for country-specific pricing)
  // Format: { 'GB': ObjectId, 'US': ObjectId, 'IN': ObjectId, ... }
  countryPricingMap?: Map<string, mongoose.Types.ObjectId>;
  // DEPRECATED: Regional pricing array - kept for backward compatibility during migration
  regionalPricing?: Array<{
    region: string;
    currency: string;
    billingCycle?: 'monthly' | 'quarterly' | 'yearly' | 'one-time';
    price: number;
    displayPrice: string;
    stripePriceId?: string;
    razorpayPlanId?: string;
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
  // REMOVED: price_monthly, price_quarterly, price_yearly, price_one_time
  // Prices are now stored in CountryPricing collection and referenced via ObjectIds
  // REMOVED: currency field - currency comes from CountryPricing collection
  billingCycle: {
    type: String,
    required: [true, 'Billing cycle is required'],
    enum: ['one-time', 'monthly', 'quarterly', 'yearly'],
    default: 'monthly'
  },
  // Credit-based system (primary)
  credits: {
    cvCredits: {
      type: Number,
      required: [true, 'CV credits are required'],
      min: [-1, 'CV credits cannot be less than -1 (unlimited)'],
      default: 1
    },
    exportCredits: {
      type: Number,
      required: [true, 'Export credits are required'],
      min: [-1, 'Export credits cannot be less than -1 (unlimited)'],
      default: 1
    },
    atsCheckCredits: {
      type: Number,
      required: [true, 'ATS check credits are required'],
      min: [-1, 'ATS check credits cannot be less than -1 (unlimited)'],
      default: 0
    },
    jobCredits: {
      type: Number,
      required: [true, 'Job credits are required'],
      min: [-1, 'Job credits cannot be less than -1 (unlimited)'],
      default: 1
    },
    resetSchedule: {
      type: String,
      required: [true, 'Credit reset schedule is required'],
      enum: ['monthly', 'quarterly', 'yearly', 'one-time', 'never'],
      default: 'monthly'
    }
  },
  // Legacy fields (deprecated - kept for backward compatibility)
  maxCVs: {
    type: Number,
    min: [0, 'CV limit cannot be negative']
  },
  maxExports: {
    type: Number,
    min: [0, 'Export limit cannot be negative']
  },
  maxCoverLetters: {
    type: Number,
    min: [0, 'Cover letter limit cannot be negative']
  },
  maxJobs: {
    type: Number,
    min: [0, 'Job limit cannot be negative']
  },
  maxJourneys: {
    type: Number,
    min: [0, 'Journey limit cannot be negative']
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
  // Reference to default CountryPricing ObjectId (fallback when user's country not found)
  defaultCountryPricingId: {
    type: Schema.Types.ObjectId,
    ref: 'CountryPricing',
    required: false
  },
  // Map of country codes to CountryPricing ObjectIds
  // Allows plans to reference multiple country-specific pricing records
  countryPricingMap: {
    type: Map,
    of: Schema.Types.ObjectId,
    default: new Map()
  },
  // Note: Regional pricing has been moved to CountryPricing collection (normalized structure)
  // This field is kept for backward compatibility during migration
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
    billingCycle: {
      type: String,
      enum: ['monthly', 'quarterly', 'yearly', 'one-time'],
      required: false // Optional: if not specified, applies to all cycles
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

// DEPRECATED: effectivePrice virtual - prices now come from CountryPricing
// This virtual is kept for backward compatibility but should not be used
// Prices should be fetched from CountryPricing collection via defaultCountryPricingId or countryPricingMap
pricingPlanSchema.virtual('effectivePrice').get(function() {
  // Return empty object - prices must be fetched from CountryPricing
  return {
    monthly: undefined,
    quarterly: undefined,
    yearly: undefined,
    oneTime: undefined
  };
});

// Index for better query performance
pricingPlanSchema.index({ key: 1 }, { unique: true });
pricingPlanSchema.index({ status: 1, sortOrder: 1 });
pricingPlanSchema.index({ billingCycle: 1 }); // Removed currency from index (now in CountryPricing)
pricingPlanSchema.index({ displayOnLanding: 1, targetAudience: 1 });
pricingPlanSchema.index({ promotionValidFrom: 1, promotionValidUntil: 1 });
pricingPlanSchema.index({ defaultCountryPricingId: 1 });
pricingPlanSchema.index({ 'countryPricingMap': 1 }); // Index for country pricing map lookups
// Note: regionalPricing index kept for backward compatibility during migration
pricingPlanSchema.index({ 'regionalPricing.region': 1 });

// Export the schema for use in admin models
export { pricingPlanSchema };

export default mongoose.models.PricingPlan || mongoose.model<IPricingPlan>('PricingPlan', pricingPlanSchema);
