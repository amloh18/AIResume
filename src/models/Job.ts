import mongoose, { Document, Schema } from 'mongoose';

export interface IJob extends Document {
  jobid: string;
  title: string;
  company: string;
  description: string;
  sourceUrl: string;
  createdAt: Date;
  deadline?: Date;
  salary?: {
    min?: number;
    max?: number;
    currency?: string;
    period?: string;
  };
  sponsorship: boolean;
  userId?: mongoose.Types.ObjectId;
}

const jobSchema = new Schema<IJob>({
  jobid: {
    type: String,
    required: true,
    trim: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: [200, 'Job title cannot exceed 200 characters']
  },
  company: {
    type: String,
    required: true,
    trim: true,
    maxlength: [100, 'Company name cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: [10000, 'Job description cannot exceed 10000 characters']
  },
  sourceUrl: {
    type: String,
    required: true,
    trim: true,
    validate: {
      validator: function(v: string) {
        return /^https?:\/\/.+/.test(v);
      },
      message: 'Source URL must be a valid URL'
    }
  },
  deadline: {
    type: Date,
    validate: {
      validator: function(v: Date) {
        if (!v) return true;
        return v > new Date();
      },
      message: 'Deadline must be in the future'
    }
  },
  salary: {
    min: { type: Number, min: 0 },
    max: { type: Number, min: 0 },
    currency: { type: String, default: 'USD' },
    period: {
      type: String,
      enum: ['hourly', 'monthly', 'yearly'],
      default: 'yearly'
    }
  },
  sponsorship: {
    type: Boolean,
    default: false
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: false
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

// Indexes for better query performance
jobSchema.index({ jobid: 1 }, { unique: true });
jobSchema.index({ userId: 1 });
jobSchema.index({ company: 1 });
jobSchema.index({ title: 1 });
jobSchema.index({ createdAt: -1 });

export default mongoose.models.Job || mongoose.model<IJob>('Job', jobSchema); 