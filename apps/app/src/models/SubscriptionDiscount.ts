import mongoose, { Document, Schema } from 'mongoose';

export interface ISubscriptionDiscount extends Document {
  subscriptionId: mongoose.Types.ObjectId;
  discountId?: mongoose.Types.ObjectId; // Reference to DiscountCode
  couponId?: mongoose.Types.ObjectId; // Reference to Coupon
  discountAmount: number;
  discountType: 'percentage' | 'fixed' | 'trial';
  discountValue?: number; // Original discount value (percentage or fixed amount)
  appliedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const subscriptionDiscountSchema = new Schema<ISubscriptionDiscount>({
  subscriptionId: {
    type: Schema.Types.ObjectId,
    ref: 'Subscription',
    required: [true, 'Subscription ID is required']
  },
  discountId: {
    type: Schema.Types.ObjectId,
    ref: 'DiscountCode'
  },
  couponId: {
    type: Schema.Types.ObjectId,
    ref: 'Coupon'
  },
  discountAmount: {
    type: Number,
    required: [true, 'Discount amount is required'],
    min: [0, 'Discount amount cannot be negative']
  },
  discountType: {
    type: String,
    required: [true, 'Discount type is required'],
    enum: ['percentage', 'fixed', 'trial'],
    default: 'fixed'
  },
  discountValue: {
    type: Number,
    min: [0, 'Discount value cannot be negative']
  },
  appliedAt: {
    type: Date,
    required: [true, 'Applied at date is required'],
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for better query performance
subscriptionDiscountSchema.index({ subscriptionId: 1 });
subscriptionDiscountSchema.index({ discountId: 1 });
subscriptionDiscountSchema.index({ couponId: 1 });

// Ensure at least one of discountId or couponId is provided
subscriptionDiscountSchema.pre('validate', function(next) {
  if (!this.discountId && !this.couponId) {
    next(new Error('Either discountId or couponId must be provided'));
  } else {
    next();
  }
});

export default mongoose.models.SubscriptionDiscount || mongoose.model<ISubscriptionDiscount>('SubscriptionDiscount', subscriptionDiscountSchema);

