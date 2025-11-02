import mongoose, { Document, Schema } from 'mongoose';

export interface IPromotionalOffer extends Document {
  title: string;
  description: string;
  targetAudience: 'all' | 'new_signups' | 'free_users' | 'existing_users';
  applicableToNewSignups: boolean;
  applicableToFreeUsers: boolean;
  applicableToExistingUsers: boolean;
  validFrom: Date;
  validUntil: Date;
  isActive: boolean;
  priority: number; // Higher number = higher priority for stacking
  applicablePlans: mongoose.Types.ObjectId[]; // References to PricingPlan
  promotionalPricing: {
    planId: mongoose.Types.ObjectId;
    promotionalPrice_monthly?: number;
    promotionalPrice_quarterly?: number;
    promotionalPrice_yearly?: number;
    promotionalPrice_one_time?: number;
  }[];
  bannerText?: string;
  bannerColor?: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  // Virtual properties
  isCurrentlyValid: boolean;
  daysRemaining: number;
}

const promotionalOfferSchema = new Schema<IPromotionalOffer>({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  targetAudience: {
    type: String,
    required: [true, 'Target audience is required'],
    enum: ['all', 'new_signups', 'free_users', 'existing_users'],
    default: 'all'
  },
  applicableToNewSignups: {
    type: Boolean,
    default: false
  },
  applicableToFreeUsers: {
    type: Boolean,
    default: false
  },
  applicableToExistingUsers: {
    type: Boolean,
    default: false
  },
  validFrom: {
    type: Date,
    required: [true, 'Valid from date is required'],
    default: Date.now
  },
  validUntil: {
    type: Date,
    required: [true, 'Valid until date is required']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  priority: {
    type: Number,
    default: 1,
    min: [1, 'Priority must be at least 1']
  },
  applicablePlans: [{
    type: Schema.Types.ObjectId,
    ref: 'PricingPlan'
  }],
  promotionalPricing: [{
    planId: {
      type: Schema.Types.ObjectId,
      ref: 'PricingPlan',
      required: true
    },
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
    }
  }],
  bannerText: {
    type: String,
    trim: true,
    maxlength: [200, 'Banner text cannot exceed 200 characters']
  },
  bannerColor: {
    type: String,
    trim: true,
    maxlength: [20, 'Banner color cannot exceed 20 characters'],
    default: '#10b981' // Default green color
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Creator is required']
  }
}, {
  timestamps: true
});

// Virtual for checking if offer is currently valid
promotionalOfferSchema.virtual('isCurrentlyValid').get(function() {
  if (!this.isActive) return false;
  const now = new Date();
  return now >= this.validFrom && now <= this.validUntil;
});

// Virtual for days remaining
promotionalOfferSchema.virtual('daysRemaining').get(function() {
  if (!this.isCurrentlyValid) return 0;
  const now = new Date();
  const diffTime = this.validUntil.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Method to check if offer applies to user type
promotionalOfferSchema.methods.appliesToUser = function(userType: 'new_signup' | 'free_user' | 'existing_user') {
  if (this.targetAudience === 'all') return true;
  
  switch (userType) {
    case 'new_signup':
      return this.applicableToNewSignups || this.targetAudience === 'new_signups';
    case 'free_user':
      return this.applicableToFreeUsers || this.targetAudience === 'free_users';
    case 'existing_user':
      return this.applicableToExistingUsers || this.targetAudience === 'existing_users';
    default:
      return false;
  }
};

// Index for better query performance
promotionalOfferSchema.index({ isActive: 1, validFrom: 1, validUntil: 1 });
promotionalOfferSchema.index({ targetAudience: 1, isActive: 1 });
promotionalOfferSchema.index({ priority: -1, isActive: 1 });
promotionalOfferSchema.index({ createdBy: 1 });

// Export the schema for use in admin models
export { promotionalOfferSchema };

export default mongoose.models.PromotionalOffer || mongoose.model<IPromotionalOffer>('PromotionalOffer', promotionalOfferSchema);
