import mongoose, { Document, Schema } from 'mongoose';

export interface IUKSponsor extends Document {
  companyName: string;
  normalizedName: string;
  licenceNumber?: string;
  status: string;
  expiryDate?: Date;
  updatedAt: Date;
}

const ukSponsorSchema = new Schema<IUKSponsor>({
  companyName: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  normalizedName: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  licenceNumber: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  expiryDate: {
    type: Date
  }
}, {
  timestamps: { createdAt: false, updatedAt: true }
});

// Compound index for efficient lookups
ukSponsorSchema.index({ normalizedName: 1, status: 1 });
ukSponsorSchema.index({ companyName: 1 });

export default mongoose.models.UKSponsor || mongoose.model<IUKSponsor>('UKSponsor', ukSponsorSchema);

