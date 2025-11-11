import mongoose, { Document, Schema } from 'mongoose';

export interface ISubscription extends Document {
  userId: mongoose.Types.ObjectId; // FIXED: Enforce ObjectId type only
  planId: mongoose.Types.ObjectId;
  status: 'active' | 'inactive' | 'cancelled' | 'past_due' | 'unpaid';
  startDate: Date;
  endDate: Date;
  billingCycle: 'monthly' | 'quarterly' | 'yearly' | 'one-time'; // FIXED: Added quarterly
  amount: number;
  currency: string;
  paymentMethod: 'stripe' | 'razorpay';
  paymentProviderId: string; // Stripe/Razorpay subscription ID
  discountCodeId?: mongoose.Types.ObjectId;
  discountAmount?: number;
  finalAmount: number;
  nextBillingDate?: Date;
  cancelledAt?: Date;
  cancellationReason?: string;
  metadata: {
    stripeCustomerId?: string;
    razorpayCustomerId?: string;
    invoiceUrl?: string;
    receiptUrl?: string;
  };
  createdAt: Date;
  updatedAt: Date;
  // Virtual properties
  isActive: boolean;
  daysRemaining: number;
}

const subscriptionSchema = new Schema<ISubscription>({
  // FIXED: Enforce ObjectId type for proper database relationships
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
    // Note: Index defined in compound index below for better performance
  },
  planId: {
    type: Schema.Types.ObjectId,
    ref: 'PricingPlan',
    required: [true, 'Plan ID is required']
  },
  status: {
    type: String,
    required: [true, 'Status is required'],
    enum: ['active', 'inactive', 'cancelled', 'past_due', 'unpaid'],
    default: 'inactive'
  },
  startDate: {
    type: Date,
    required: [true, 'Start date is required'],
    default: Date.now
  },
  endDate: {
    type: Date,
    required: [true, 'End date is required']
  },
  // FIXED: Added 'quarterly' to match actual subscription plans
  billingCycle: {
    type: String,
    required: [true, 'Billing cycle is required'],
    enum: ['monthly', 'quarterly', 'yearly', 'one-time'],
    default: 'monthly'
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0, 'Amount cannot be negative']
  },
  // EXPANDED: Support all regional currencies
  currency: {
    type: String,
    required: [true, 'Currency is required'],
    default: 'GBP',
    enum: ['EUR', 'USD', 'GBP', 'CAD', 'AUD', 'INR', 'PKR', 'PLN']
  },
  paymentMethod: {
    type: String,
    required: [true, 'Payment method is required'],
    enum: ['stripe', 'razorpay']
  },
  paymentProviderId: {
    type: String,
    required: [true, 'Payment provider ID is required']
  },
  discountCodeId: {
    type: Schema.Types.ObjectId,
    ref: 'DiscountCode'
  },
  discountAmount: {
    type: Number,
    min: [0, 'Discount amount cannot be negative'],
    default: 0
  },
  finalAmount: {
    type: Number,
    required: [true, 'Final amount is required'],
    min: [0, 'Final amount cannot be negative']
  },
  nextBillingDate: {
    type: Date
  },
  cancelledAt: {
    type: Date
  },
  cancellationReason: {
    type: String,
    maxlength: [500, 'Cancellation reason cannot exceed 500 characters']
  },
  metadata: {
    stripeCustomerId: String,
    razorpayCustomerId: String,
    invoiceUrl: String,
    receiptUrl: String
  }
}, {
  timestamps: true
});

// Index for better query performance
subscriptionSchema.index({ userId: 1, status: 1 });
subscriptionSchema.index({ status: 1, endDate: 1 });
subscriptionSchema.index({ paymentProviderId: 1 });
subscriptionSchema.index({ nextBillingDate: 1 });

// Virtual for checking if subscription is active
subscriptionSchema.virtual('isActive').get(function() {
  const now = new Date();
  return this.status === 'active' && now >= this.startDate && now <= this.endDate;
});

// Virtual for days remaining
subscriptionSchema.virtual('daysRemaining').get(function() {
  if (!this.isActive) return 0;
  const now = new Date();
  const diffTime = this.endDate.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Method to cancel subscription
subscriptionSchema.methods.cancel = function(reason?: string) {
  this.status = 'cancelled';
  this.cancelledAt = new Date();
  if (reason) {
    this.cancellationReason = reason;
  }
  return this.save();
};

// Method to renew subscription
subscriptionSchema.methods.renew = function(newEndDate: Date) {
  this.status = 'active';
  this.endDate = newEndDate;
  this.cancelledAt = undefined;
  this.cancellationReason = undefined;
  return this.save();
};

// Schema export removed - no longer needed for admin models

export default mongoose.models.Subscription || mongoose.model<ISubscription>('Subscription', subscriptionSchema);
