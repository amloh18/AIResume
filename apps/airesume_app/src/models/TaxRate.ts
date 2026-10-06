import mongoose, { Document, Schema } from 'mongoose';

export interface ITaxRate extends Document {
  countryCode: string; // ISO country code: 'US', 'GB', 'IN', etc.
  regionCode?: string; // State/province code (optional)
  taxType: 'VAT' | 'GST' | 'Sales Tax' | 'Other';
  rate: number; // Percentage (e.g., 20 for 20%)
  effectiveFrom: Date;
  effectiveUntil?: Date; // Optional - if not set, rate is currently active
  isActive: boolean;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

const taxRateSchema = new Schema<ITaxRate>({
  countryCode: {
    type: String,
    required: [true, 'Country code is required'],
    trim: true,
    uppercase: true,
    maxlength: [2, 'Country code must be 2 characters']
  },
  regionCode: {
    type: String,
    trim: true,
    uppercase: true
  },
  taxType: {
    type: String,
    required: [true, 'Tax type is required'],
    enum: ['VAT', 'GST', 'Sales Tax', 'Other'],
    default: 'VAT'
  },
  rate: {
    type: Number,
    required: [true, 'Tax rate is required'],
    min: [0, 'Tax rate cannot be negative'],
    max: [100, 'Tax rate cannot exceed 100%']
  },
  effectiveFrom: {
    type: Date,
    required: [true, 'Effective from date is required'],
    default: Date.now
  },
  effectiveUntil: {
    type: Date
  },
  isActive: {
    type: Boolean,
    default: true
  },
  description: {
    type: String,
    trim: true,
    maxlength: [200, 'Description cannot exceed 200 characters']
  }
}, {
  timestamps: true
});

// Indexes for better query performance
taxRateSchema.index({ countryCode: 1, regionCode: 1, isActive: 1 });
taxRateSchema.index({ countryCode: 1, effectiveFrom: 1, effectiveUntil: 1 });
taxRateSchema.index({ isActive: 1 });

// Virtual to check if tax rate is currently effective
taxRateSchema.virtual('isCurrentlyEffective').get(function() {
  if (!this.isActive) return false;
  const now = new Date();
  if (now < this.effectiveFrom) return false;
  if (this.effectiveUntil && now > this.effectiveUntil) return false;
  return true;
});

export default mongoose.models.TaxRate || mongoose.model<ITaxRate>('TaxRate', taxRateSchema);

