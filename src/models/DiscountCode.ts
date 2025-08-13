import mongoose, { Document, Schema } from 'mongoose';

export interface IDiscountCode extends Document {
  code: string;
  description: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  currency: string;
  maxUses: number;
  usedCount: number;
  validFrom: Date;
  validUntil: Date;
  applicablePlans: string[]; // Array of plan IDs
  minimumOrderValue?: number;
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const discountCodeSchema = new Schema<IDiscountCode>({
  code: {
    type: String,
    required: [true, 'Discount code is required'],
    trim: true,
    uppercase: true,
    maxlength: [20, 'Discount code cannot exceed 20 characters']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    maxlength: [200, 'Description cannot exceed 200 characters']
  },
  discountType: {
    type: String,
    required: [true, 'Discount type is required'],
    enum: ['percentage', 'fixed'],
    default: 'percentage'
  },
  discountValue: {
    type: Number,
    required: [true, 'Discount value is required'],
    min: [0, 'Discount value cannot be negative']
  },
  currency: {
    type: String,
    required: [true, 'Currency is required'],
    default: 'EUR',
    enum: ['EUR', 'USD', 'INR']
  },
  maxUses: {
    type: Number,
    required: [true, 'Maximum uses is required'],
    min: [1, 'Maximum uses must be at least 1'],
    default: 100
  },
  usedCount: {
    type: Number,
    default: 0,
    min: [0, 'Used count cannot be negative']
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
  applicablePlans: [{
    type: Schema.Types.ObjectId,
    ref: 'PricingPlan'
  }],
  minimumOrderValue: {
    type: Number,
    min: [0, 'Minimum order value cannot be negative']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Creator is required']
  }
}, {
  timestamps: true
});

// Index for better query performance
discountCodeSchema.index({ code: 1 });
discountCodeSchema.index({ isActive: 1, validUntil: 1 });
discountCodeSchema.index({ usedCount: 1, maxUses: 1 });

// Virtual for checking if code is still valid
discountCodeSchema.virtual('isValid').get(function() {
  const now = new Date();
  return this.isActive && 
         this.usedCount < this.maxUses && 
         now >= this.validFrom && 
         now <= this.validUntil;
});

// Virtual for remaining uses
discountCodeSchema.virtual('remainingUses').get(function() {
  return Math.max(0, this.maxUses - this.usedCount);
});

// Method to validate and apply discount
discountCodeSchema.methods.validateAndApply = function(orderValue: number, planId: string) {
  if (!this.isValid) {
    throw new Error('Discount code is not valid');
  }

  if (this.minimumOrderValue && orderValue < this.minimumOrderValue) {
    throw new Error(`Minimum order value of ${this.minimumOrderValue} ${this.currency} required`);
  }

  if (this.applicablePlans.length > 0 && !this.applicablePlans.includes(planId)) {
    throw new Error('Discount code is not applicable to this plan');
  }

  let discountAmount = 0;
  if (this.discountType === 'percentage') {
    discountAmount = (orderValue * this.discountValue) / 100;
  } else {
    discountAmount = this.discountValue;
  }

  return Math.min(discountAmount, orderValue); // Don't discount more than the order value
};

// Method to increment usage
discountCodeSchema.methods.incrementUsage = function() {
  if (this.usedCount >= this.maxUses) {
    throw new Error('Discount code usage limit exceeded');
  }
  this.usedCount += 1;
  return this.save();
};

export default mongoose.models.DiscountCode || mongoose.model<IDiscountCode>('DiscountCode', discountCodeSchema);
