import mongoose, { Document, Schema } from 'mongoose';

export interface IPriceRegion extends Document {
  regionId: string; // e.g., "GBP_DEFAULT", "USD_1", "EUR_1"
  isDefault: boolean;
  currency: string; // "GBP", "USD", "EUR", etc.
  currencySymbol: string; // "£", "$", "€", etc.
  plans: {
    dayPass: number;
    monthly: number;
    quarterly: number;
    yearly: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const priceRegionSchema = new Schema<IPriceRegion>(
  {
    regionId: {
      type: String,
      required: [true, 'Region ID is required'],
      unique: true,
      trim: true,
      index: true,
    },
    isDefault: {
      type: Boolean,
      default: false,
      // Index defined separately below to avoid duplicate
    },
    currency: {
      type: String,
      required: [true, 'Currency is required'],
      trim: true,
      uppercase: true,
    },
    currencySymbol: {
      type: String,
      required: [true, 'Currency symbol is required'],
      trim: true,
    },
    plans: {
      dayPass: {
        type: Number,
        required: true,
        min: [0, 'Day pass price cannot be negative'],
      },
      monthly: {
        type: Number,
        required: true,
        min: [0, 'Monthly price cannot be negative'],
      },
      quarterly: {
        type: Number,
        required: true,
        min: [0, 'Quarterly price cannot be negative'],
      },
      yearly: {
        type: Number,
        required: true,
        min: [0, 'Yearly price cannot be negative'],
      },
    },
  },
  {
    timestamps: true,
  }
);

// Ensure only one default region exists
priceRegionSchema.index({ isDefault: 1 }, { unique: true, sparse: true });

// Create model
const PriceRegion = mongoose.models.PriceRegion || mongoose.model<IPriceRegion>('PriceRegion', priceRegionSchema);

export default PriceRegion;

