import mongoose, { Document, Schema } from 'mongoose';

export interface IPaymentMethod extends Document {
  userId: mongoose.Types.ObjectId | string;
  firebaseUid?: string; // Firebase UID for user identification
  type: 'credit_card' | 'paypal' | 'bank_transfer';
  provider: 'visa' | 'mastercard' | 'amex' | 'discover' | 'paypal' | 'stripe';
  last4?: string;
  brand?: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault: boolean;
  isActive: boolean;
  email?: string; // For PayPal
  accountName?: string;
  createdAt: Date;
  updatedAt: Date;
}

const paymentMethodSchema = new Schema<IPaymentMethod>({
  userId: {
    type: Schema.Types.Mixed, // Allow both ObjectId and string
    required: [true, 'User ID is required']
  },
  firebaseUid: {
    type: String,
    sparse: true, // Allows multiple null values
    index: true // Index for efficient Firebase UID queries
  },
  type: {
    type: String,
    enum: ['credit_card', 'paypal', 'bank_transfer'],
    required: [true, 'Payment method type is required']
  },
  provider: {
    type: String,
    enum: ['visa', 'mastercard', 'amex', 'discover', 'paypal', 'stripe'],
    required: [true, 'Provider is required']
  },
  last4: {
    type: String,
    maxlength: 4,
    validate: {
      validator: function(v: string) {
        return /^\d{4}$/.test(v);
      },
      message: 'Last 4 digits must be exactly 4 numbers'
    }
  },
  brand: {
    type: String,
    trim: true
  },
  expiryMonth: {
    type: Number,
    min: 1,
    max: 12
  },
  expiryYear: {
    type: Number,
    min: new Date().getFullYear()
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  email: {
    type: String,
    lowercase: true,
    trim: true
  },
  accountName: {
    type: String,
    trim: true,
    maxlength: [100, 'Account name cannot exceed 100 characters']
  }
}, {
  timestamps: true
});

// Ensure only one default payment method per user
paymentMethodSchema.index({ userId: 1, isDefault: 1 }, { unique: true, partialFilterExpression: { isDefault: true } });

// Index for better query performance
paymentMethodSchema.index({ userId: 1, isActive: 1 });

// Export the schema for use in admin models
export { paymentMethodSchema };

export default mongoose.models.PaymentMethod || mongoose.model<IPaymentMethod>('PaymentMethod', paymentMethodSchema);
