import mongoose, { Document, Schema } from 'mongoose';

export interface IInvoiceItem extends Document {
  invoiceId: mongoose.Types.ObjectId;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number; // quantity * unitPrice
  type: 'subscription' | 'proration' | 'setup_fee' | 'refund' | 'discount' | 'tax' | 'other';
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const invoiceItemSchema = new Schema<IInvoiceItem>({
  invoiceId: {
    type: Schema.Types.ObjectId,
    ref: 'Invoice',
    required: [true, 'Invoice ID is required']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [0, 'Quantity cannot be negative'],
    default: 1
  },
  unitPrice: {
    type: Number,
    required: [true, 'Unit price is required']
    // Can be negative for refunds/discounts
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required']
    // Can be negative for refunds/discounts
  },
  type: {
    type: String,
    required: [true, 'Item type is required'],
    enum: ['subscription', 'proration', 'setup_fee', 'refund', 'discount', 'tax', 'other'],
    default: 'subscription'
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Indexes for better query performance
invoiceItemSchema.index({ invoiceId: 1 });
invoiceItemSchema.index({ type: 1 });

// Auto-calculate amount before saving
invoiceItemSchema.pre('save', function(next) {
  if (this.isModified('quantity') || this.isModified('unitPrice')) {
    this.amount = this.quantity * this.unitPrice;
  }
  next();
});

export default mongoose.models.InvoiceItem || mongoose.model<IInvoiceItem>('InvoiceItem', invoiceItemSchema);

