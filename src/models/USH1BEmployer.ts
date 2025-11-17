import mongoose, { Document, Schema } from 'mongoose';

export interface IUSH1BEmployer extends Document {
  employerName: string;
  normalizedName: string;
  fein?: string;
  lastFiledYear?: number;
  updatedAt: Date;
}

const usH1BEmployerSchema = new Schema<IUSH1BEmployer>({
  employerName: {
    type: String,
    required: true,
    trim: true
  },
  normalizedName: {
    type: String,
    required: true,
    trim: true
  },
  fein: {
    type: String,
    trim: true
  },
  lastFiledYear: {
    type: Number,
    min: 2000,
    max: 2100
  }
}, {
  timestamps: { createdAt: false, updatedAt: true }
});

// Compound index for efficient lookups
usH1BEmployerSchema.index({ normalizedName: 1, lastFiledYear: -1 });
usH1BEmployerSchema.index({ employerName: 1 });

export default mongoose.models.USH1BEmployer || mongoose.model<IUSH1BEmployer>('USH1BEmployer', usH1BEmployerSchema);

