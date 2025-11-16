import mongoose, { Document, Schema } from 'mongoose';

export interface ICountryPricing extends Document {
  countryCode: string; // ISO country code: 'IN', 'US', 'GB', etc. (unique, indexed)
  countryName: string; // 'India', 'United States', etc.
  currency: string; // 'INR', 'USD', 'GBP', etc.
  currencySymbol: string; // '₹', '$', '£', etc.
  regionId: string; // Reference to PriceRegion.regionId
  planPrices: {
    free: {
      price: number; // Always 0
      planId: mongoose.Types.ObjectId; // Reference to free plan
    };
    dayPass: {
      price: number;
      planId: mongoose.Types.ObjectId; // Reference to day_pass plan
    };
    monthly: {
      price: number;
      planId: mongoose.Types.ObjectId; // Reference to pro_monthly plan
    };
    quarterly: {
      price: number;
      planId: mongoose.Types.ObjectId; // Reference to pro_quarterly plan
    };
    yearly: {
      price: number;
      planId: mongoose.Types.ObjectId; // Reference to pro_yearly plan
    };
  };
  stripePriceIds?: {
    dayPass?: string;
    monthly?: string;
    quarterly?: string;
    yearly?: string;
  };
  razorpayPlanIds?: {
    dayPass?: string;
    monthly?: string;
    quarterly?: string;
    yearly?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const countryPricingSchema = new Schema<ICountryPricing>(
  {
    countryCode: {
      type: String,
      required: [true, 'Country code is required'],
      unique: true,
      trim: true,
      uppercase: true
    },
    countryName: {
      type: String,
      required: [true, 'Country name is required'],
      trim: true
    },
    currency: {
      type: String,
      required: [true, 'Currency is required'],
      trim: true,
      uppercase: true
    },
    currencySymbol: {
      type: String,
      required: [true, 'Currency symbol is required'],
      trim: true
    },
    regionId: {
      type: String,
      required: [true, 'Region ID is required'],
      trim: true
    },
    planPrices: {
      free: {
        price: {
          type: Number,
          required: true,
          default: 0,
          min: [0, 'Free plan price cannot be negative']
        },
        planId: {
          type: Schema.Types.ObjectId,
          ref: 'PricingPlan',
          required: true
        }
      },
      dayPass: {
        price: {
          type: Number,
          required: true,
          min: [0, 'Day pass price cannot be negative']
        },
        planId: {
          type: Schema.Types.ObjectId,
          ref: 'PricingPlan',
          required: true
        }
      },
      monthly: {
        price: {
          type: Number,
          required: true,
          min: [0, 'Monthly price cannot be negative']
        },
        planId: {
          type: Schema.Types.ObjectId,
          ref: 'PricingPlan',
          required: true
        }
      },
      quarterly: {
        price: {
          type: Number,
          required: true,
          min: [0, 'Quarterly price cannot be negative']
        },
        planId: {
          type: Schema.Types.ObjectId,
          ref: 'PricingPlan',
          required: true
        }
      },
      yearly: {
        price: {
          type: Number,
          required: true,
          min: [0, 'Yearly price cannot be negative']
        },
        planId: {
          type: Schema.Types.ObjectId,
          ref: 'PricingPlan',
          required: true
        }
      }
    },
    stripePriceIds: {
      dayPass: String,
      monthly: String,
      quarterly: String,
      yearly: String
    },
    razorpayPlanIds: {
      dayPass: String,
      monthly: String,
      quarterly: String,
      yearly: String
    }
  },
  {
    timestamps: true
  }
);

// Indexes for better query performance
// Note: countryCode already has unique: true in schema definition, so unique index is created automatically
countryPricingSchema.index({ regionId: 1 });
countryPricingSchema.index({ currency: 1 });

// Create model
const CountryPricing = mongoose.models.CountryPricing || mongoose.model<ICountryPricing>('CountryPricing', countryPricingSchema);

export default CountryPricing;

