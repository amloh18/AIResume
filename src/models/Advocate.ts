import mongoose, { Document, Schema } from 'mongoose';

export interface IAdvocate extends Document {
  id: string;
  userId: mongoose.Types.ObjectId | string;
  name: string;
  email?: string;
  linkedinUrl?: string;
  relation: 'colleague' | 'friend' | 'alumni' | 'mentor' | 'other';
  company?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const advocateSchema = new Schema<IAdvocate>({
  userId: {
    type: Schema.Types.Mixed, // Allow both ObjectId and string
    required: true,
    index: true
  },
  name: {
    type: String,
    required: [true, 'Advocate name is required'],
    trim: true,
    maxlength: [100, 'Advocate name cannot exceed 100 characters']
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    validate: {
      validator: function(v: string) {
        if (!v) return true;
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: 'Invalid email address'
    }
  },
  linkedinUrl: {
    type: String,
    trim: true,
    validate: {
      validator: function(v: string) {
        if (!v) return true;
        return /^https?:\/\/.+/.test(v);
      },
      message: 'LinkedIn URL must be a valid URL'
    }
  },
  relation: {
    type: String,
    enum: ['colleague', 'friend', 'alumni', 'mentor', 'other'],
    required: true,
    default: 'other'
  },
  company: {
    type: String,
    trim: true,
    maxlength: [100, 'Company name cannot exceed 100 characters']
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Notes cannot exceed 1000 characters']
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret: any) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

// Indexes for better query performance
advocateSchema.index({ userId: 1, name: 1 });
advocateSchema.index({ userId: 1, email: 1 });
advocateSchema.index({ userId: 1, company: 1 });

export default mongoose.models.Advocate || mongoose.model<IAdvocate>('Advocate', advocateSchema);

