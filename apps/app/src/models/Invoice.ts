import mongoose, { Document, Schema } from 'mongoose';

export interface IInvoice extends Document {
  userId: mongoose.Types.ObjectId | string;
  invoiceNumber: string;
  subtotal: number; // Price before taxes/discounts
  taxAmount: number; // Tax amount
  amount: number; // Total amount (subtotal + taxAmount - discounts)
  currency: string;
  status: 'paid' | 'pending' | 'failed' | 'cancelled' | 'refunded' | 'partially_refunded';
  planName: string;
  planId: mongoose.Types.ObjectId;
  subscriptionId?: mongoose.Types.ObjectId; // Link to subscription
  billingCycle: 'monthly' | 'quarterly' | 'yearly' | 'one-time';
  paymentMethodId?: mongoose.Types.ObjectId;
  paymentMethodType?: string;
  paymentMethodLast4?: string;
  paidAt?: Date;
  dueDate: Date;
  invoiceDate: Date; // Date invoice was generated
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
  subtotal: {
    type: Number,
    required: [true, 'Subtotal is required'],
    min: [0, 'Subtotal cannot be negative']
  },
  taxAmount: {
    type: Number,
    required: [true, 'Tax amount is required'],
    min: [0, 'Tax amount cannot be negative'],
    default: 0
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
    enum: ['paid', 'pending', 'failed', 'cancelled', 'refunded', 'partially_refunded'],
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
  subscriptionId: {
    type: Schema.Types.ObjectId,
    ref: 'Subscription'
  },
  billingCycle: {
    type: String,
    enum: ['monthly', 'quarterly', 'yearly', 'one-time'],
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
  invoiceDate: {
    type: Date,
    required: [true, 'Invoice date is required'],
    default: Date.now
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

// Generate sequential invoice number before saving
invoiceSchema.pre('save', async function(next) {
  if (!this.invoiceNumber) {
    try {
      // Get the count of invoices for the current year
      const year = new Date().getFullYear();
      const yearStart = new Date(year, 0, 1);
      const yearEnd = new Date(year, 11, 31, 23, 59, 59);
      
      const Invoice = mongoose.model('Invoice');
      const count = await Invoice.countDocuments({
        invoiceDate: { $gte: yearStart, $lte: yearEnd }
      });
      
      // Generate sequential number: INV-2024-0001, INV-2024-0002, etc.
      const sequentialNumber = String(count + 1).padStart(4, '0');
      this.invoiceNumber = `INV-${year}-${sequentialNumber}`;
    } catch (error) {
      // Fallback to date-based format if count fails
      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      this.invoiceNumber = `INV-${year}${month}${day}-${random}`;
    }
  }
  next();
});

// Index for better query performance
invoiceSchema.index({ userId: 1, status: 1 });
invoiceSchema.index({ userId: 1, createdAt: -1 });
invoiceSchema.index({ invoiceNumber: 1 }, { unique: true });
invoiceSchema.index({ subscriptionId: 1 });
invoiceSchema.index({ 'metadata.polarCheckoutId': 1 }, { sparse: true });

// Schema export removed - no longer needed for admin models

export default mongoose.models.Invoice || mongoose.model<IInvoice>('Invoice', invoiceSchema);
