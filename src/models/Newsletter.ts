import mongoose, { Document, Schema } from 'mongoose';

export interface INewsletter extends Document {
  email: string;
  isActive: boolean;
  subscribedAt: Date;
  source: string; // 'footer', 'popup', 'landing', etc.
  userAgent?: string;
  ipAddress?: string;
  createdAt: Date;
  updatedAt: Date;
}

const newsletterSchema = new Schema<INewsletter>({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  subscribedAt: {
    type: Date,
    default: Date.now
  },
  source: {
    type: String,
    required: [true, 'Source is required'],
    enum: ['footer', 'popup', 'landing', 'other'],
    default: 'footer'
  },
  userAgent: {
    type: String,
    default: null
  },
  ipAddress: {
    type: String,
    default: null
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      return ret;
    }
  }
});

// Index for email lookup
newsletterSchema.index({ email: 1 }, { unique: true });

export default mongoose.models.Newsletter || mongoose.model<INewsletter>('Newsletter', newsletterSchema);
