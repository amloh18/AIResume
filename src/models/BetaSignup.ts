import mongoose, { Schema, Document } from 'mongoose';

export interface IBetaSignup extends Document {
  email: string;
  createdAt: Date;
  updatedAt: Date;
  status: 'pending' | 'approved' | 'rejected';
  notes?: string;
}

const BetaSignupSchema = new Schema<IBetaSignup>({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email address']
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  notes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Index for faster queries
BetaSignupSchema.index({ status: 1 });
BetaSignupSchema.index({ createdAt: -1 });

export default mongoose.models.BetaSignup || mongoose.model<IBetaSignup>('BetaSignup', BetaSignupSchema);

