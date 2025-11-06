import mongoose, { Document, Schema } from 'mongoose';

export interface ICoupon extends Document {
  code: string;
  type: 'percentage' | 'fixed' | 'trial';
  discountValue?: number; // Percentage (0-100) or fixed amount
  trialDays?: number; // Number of trial days
  maxUses: number;
  usedCount: number;
  validFrom: Date;
  validUntil: Date;
  applicablePlans: string[]; // Array of plan keys (e.g., 'pro_monthly', 'pro_quarterly') or plan IDs
  applicablePlanKeys?: string[]; // Array of plan keys for easier filtering
  requiresCreditCard: boolean;
  isActive: boolean;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

const couponSchema = new Schema<ICoupon>({
  code: {
    type: String,
    required: [true, 'Coupon code is required'],
    unique: true,
    uppercase: true,
    trim: true,
    maxlength: [20, 'Coupon code cannot exceed 20 characters']
  },
  type: {
    type: String,
    enum: ['percentage', 'fixed', 'trial'],
    required: [true, 'Coupon type is required']
  },
  discountValue: {
    type: Number,
    min: 0,
    validate: {
      validator: function(this: ICoupon, value: number) {
        if (this.type === 'percentage') {
          return value >= 0 && value <= 100;
        }
        return true;
      },
      message: 'Discount percentage must be between 0 and 100'
    }
  },
  trialDays: {
    type: Number,
    min: 1,
    max: 365,
    validate: {
      validator: function(this: ICoupon, value: number) {
        if (this.type === 'trial') {
          return value > 0;
        }
        return true;
      },
      message: 'Trial days must be greater than 0 for trial coupons'
    }
  },
  maxUses: {
    type: Number,
    required: true,
    min: -1, // -1 means unlimited
    default: -1
  },
  usedCount: {
    type: Number,
    default: 0,
    min: 0
  },
  validFrom: {
    type: Date,
    required: true,
    default: Date.now
  },
  validUntil: {
    type: Date,
    required: true
  },
  applicablePlans: [{
    type: String // Can be plan IDs or plan keys
  }],
  applicablePlanKeys: [{
    type: String,
    enum: ['free', 'day_pass', 'pro_monthly', 'pro_quarterly', 'pro_yearly']
  }],
  requiresCreditCard: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  description: {
    type: String,
    maxlength: [200, 'Description cannot exceed 200 characters']
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret: any) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

// Indexes
// Note: code index is automatically created by unique: true constraint
couponSchema.index({ validFrom: 1, validUntil: 1 });
couponSchema.index({ isActive: 1 });

// Methods
couponSchema.methods.isValid = function(): { valid: boolean; reason?: string } {
  const now = new Date();
  
  if (!this.isActive) {
    return { valid: false, reason: 'This coupon is no longer active' };
  }
  
  if (now < this.validFrom) {
    return { valid: false, reason: 'This coupon is not yet valid' };
  }
  
  if (now > this.validUntil) {
    return { valid: false, reason: 'This coupon has expired' };
  }
  
  if (this.maxUses !== -1 && this.usedCount >= this.maxUses) {
    return { valid: false, reason: 'This coupon has reached its usage limit' };
  }
  
  return { valid: true };
};

couponSchema.methods.incrementUsage = async function() {
  this.usedCount += 1;
  await this.save();
};

export default mongoose.models.Coupon || mongoose.model<ICoupon>('Coupon', couponSchema);


