import mongoose, { Document, Schema } from 'mongoose';

export interface IBetaTester extends Document {
  email: string;
  status: 'pending' | 'approved' | 'rejected';
  source?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const betaTesterSchema = new Schema<IBetaTester>({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    validate: {
      validator: function(v: string) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: 'Please provide a valid email address'
    }
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  source: {
    type: String,
    trim: true,
    maxlength: [100, 'Source cannot exceed 100 characters']
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      return ret;
    }
  }
});

// Create index for email
betaTesterSchema.index({ email: 1 }, { unique: true });
betaTesterSchema.index({ status: 1 });
betaTesterSchema.index({ createdAt: -1 });

export default mongoose.models.BetaTester || mongoose.model<IBetaTester>('BetaTester', betaTesterSchema);
