import mongoose, { Document, Schema } from 'mongoose';

export interface ITransaction extends Document {
  invoiceId?: mongoose.Types.ObjectId;
  paymentMethodId?: mongoose.Types.ObjectId;
  amount: number; // Can be negative for refunds
  status: 'success' | 'failed' | 'refunded' | 'pending' | 'chargeback' | 'dispute';
  gatewayReferenceId: string; // Stripe/Polar transaction ID
  gateway: 'stripe' | 'razorpay' | 'polar' | 'admin';
  failureReason?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const transactionSchema = new Schema<ITransaction>({
  invoiceId: {
    type: Schema.Types.ObjectId,
    ref: 'Invoice'
  },
  paymentMethodId: {
    type: Schema.Types.ObjectId,
    ref: 'PaymentMethod'
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required']
    // Note: Can be negative for refunds, so no min constraint
  },
  status: {
    type: String,
    required: [true, 'Status is required'],
    enum: ['success', 'failed', 'refunded', 'pending', 'chargeback', 'dispute'],
    default: 'pending'
  },
  gatewayReferenceId: {
    type: String,
    required: [true, 'Gateway reference ID is required'],
    trim: true
  },
  gateway: {
    type: String,
    required: [true, 'Gateway is required'],
    enum: ['stripe', 'razorpay', 'polar', 'admin']
  },
  failureReason: {
    type: String,
    trim: true,
    maxlength: [500, 'Failure reason cannot exceed 500 characters']
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Indexes for better query performance
transactionSchema.index({ invoiceId: 1 });
transactionSchema.index({ paymentMethodId: 1 });
transactionSchema.index({ status: 1 });
transactionSchema.index({ createdAt: -1 });
transactionSchema.index({ gatewayReferenceId: 1 }, { unique: true });
transactionSchema.index({ gateway: 1, status: 1 });

export default mongoose.models.Transaction || mongoose.model<ITransaction>('Transaction', transactionSchema);

