import mongoose, { Document, Schema } from 'mongoose';

export interface IUserBillingProfile extends Document {
  userId: mongoose.Types.ObjectId;
  billingCountryCode: string; // ISO country code
  billingCurrency: string; // Currency code (USD, EUR, etc.)
  taxId?: string; // VAT ID, GST number, etc.
  billingAddress?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const userBillingProfileSchema = new Schema<IUserBillingProfile>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    unique: true
  },
  billingCountryCode: {
    type: String,
    required: [true, 'Billing country code is required'],
    trim: true,
    uppercase: true,
    maxlength: [2, 'Country code must be 2 characters']
  },
  billingCurrency: {
    type: String,
    required: [true, 'Billing currency is required'],
    trim: true,
    uppercase: true,
    maxlength: [3, 'Currency code must be 3 characters']
  },
  taxId: {
    type: String,
    trim: true,
    maxlength: [50, 'Tax ID cannot exceed 50 characters']
  },
  billingAddress: {
    street: {
      type: String,
      trim: true,
      maxlength: [200, 'Street address cannot exceed 200 characters']
    },
    city: {
      type: String,
      trim: true,
      maxlength: [100, 'City cannot exceed 100 characters']
    },
    state: {
      type: String,
      trim: true,
      maxlength: [100, 'State cannot exceed 100 characters']
    },
    postalCode: {
      type: String,
      trim: true,
      maxlength: [20, 'Postal code cannot exceed 20 characters']
    },
    country: {
      type: String,
      trim: true,
      maxlength: [100, 'Country cannot exceed 100 characters']
    }
  }
}, {
  timestamps: true
});

// Indexes for better query performance
// Note: userId index is automatically created by unique: true constraint on the field
userBillingProfileSchema.index({ billingCountryCode: 1 });
userBillingProfileSchema.index({ billingCurrency: 1 });

export default mongoose.models.UserBillingProfile || mongoose.model<IUserBillingProfile>('UserBillingProfile', userBillingProfileSchema);

