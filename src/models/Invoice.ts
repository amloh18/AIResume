import mongoose, { Document, Schema } from 'mongoose';

export interface IInvoice extends Document {
  userId: mongoose.Types.ObjectId | string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  status: 'paid' | 'pending' | 'failed' | 'cancelled' | 'refunded';
  planName: string;
  planId: mongoose.Types.ObjectId;
  billingCycle: 'monthly' | 'yearly' | 'one-time';
  paymentMethodId?: mongoose.Types.ObjectId;
  paymentMethodType?: string;
  paymentMethodLast4?: string;
  paidAt?: Date;
  dueDate: Date;
  description?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const invoiceSchema = new Schema<IInvoice>({
  userId: {
    type: Schema.Types.Mixed, // Allow both ObjectId and string
    required: [true, 'User ID is required']
  },
  invoiceNumber: {
    type: String,
    required: [true, 'Invoice number is required'],
    trim: true
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0, 'Amount cannot be negative']
  },
  currency: {
    type: String,
    required: [true, 'Currency is required'],
    default: 'USD',
    enum: ['USD', 'EUR', 'GBP', 'CAD', 'AUD']
  },
  status: {
    type: String,
    enum: ['paid', 'pending', 'failed', 'cancelled', 'refunded'],
    default: 'pending'
  },
  planName: {
    type: String,
    required: [true, 'Plan name is required'],
    trim: true
  },
  planId: {
    type: Schema.Types.ObjectId,
    ref: 'PricingPlan',
    required: [true, 'Plan ID is required']
  },
  billingCycle: {
    type: String,
    enum: ['monthly', 'yearly', 'one-time'],
    required: [true, 'Billing cycle is required']
  },
  paymentMethodId: {
    type: Schema.Types.ObjectId,
    ref: 'PaymentMethod'
  },
  paymentMethodType: {
    type: String,
    enum: ['visa', 'mastercard', 'amex', 'discover', 'paypal']
  },
  paymentMethodLast4: {
    type: String,
    maxlength: 4
  },
  paidAt: {
    type: Date
  },
  dueDate: {
    type: Date,
    required: [true, 'Due date is required']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  metadata: {
    type: Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Generate invoice number before saving
invoiceSchema.pre('save', function(next) {
  if (!this.invoiceNumber) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    this.invoiceNumber = `INV-${year}${month}${day}-${random}`;
  }
  next();
});

// Index for better query performance
invoiceSchema.index({ userId: 1, status: 1 });
invoiceSchema.index({ userId: 1, createdAt: -1 });
invoiceSchema.index({ invoiceNumber: 1 }, { unique: true });

// Schema export removed - no longer needed for admin models

export default mongoose.models.Invoice || mongoose.model<IInvoice>('Invoice', invoiceSchema);
