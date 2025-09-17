import mongoose, { Document, Schema } from 'mongoose';

export interface IJobApplication extends Document {
  userId: mongoose.Types.ObjectId | string;
  // cvId removed - relationships now managed through CVJourney
  jobTitle: string;
  company: string;
  jobUrl?: string;
  jobDescription?: string;
  sponsorship?: 'yes' | 'no' | 'unknown';
  location?: string;
  salary?: {
    min?: number;
    max?: number;
    currency?: string;
    period?: 'hourly' | 'monthly' | 'yearly';
  };
  status: 'created' | 'applied' | 'screening' | 'interview' | 'offer' | 'rejected' | 'accepted' | 'withdrawn';
  priority: 'low' | 'medium' | 'high';
  applicationDate?: Date;
  deadline?: Date;
  notes?: string;
  contacts: Array<{
    name: string;
    role?: string;
    email?: string;
    phone?: string;
    linkedin?: string;
  }>;
  interviews: Array<{
    type: 'phone' | 'video' | 'onsite' | 'technical' | 'behavioral';
    date: Date;
    duration?: number;
    interviewer?: string;
    notes?: string;
    outcome?: 'scheduled' | 'completed' | 'cancelled' | 'no-show';
    feedback?: string;
  }>;
  followUps: Array<{
    date: Date;
    type: 'email' | 'phone' | 'linkedin' | 'other';
    description: string;
    outcome?: string;
  }>;
  attachments: Array<{
    name: string;
    type: 'cv' | 'cover-letter' | 'certificate' | 'portfolio' | 'other';
    url: string;
    size: number;
  }>;
  tags: string[];
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const jobApplicationSchema = new Schema<IJobApplication>({
  userId: {
    type: Schema.Types.Mixed, // Allow both ObjectId and string
    required: true,
    index: true
  },
  // cvId removed - relationships now managed through CVJourney
  jobTitle: {
    type: String,
    required: [true, 'Job title is required'],
    trim: true,
    maxlength: [100, 'Job title cannot exceed 100 characters']
  },
  company: {
    type: String,
    required: [true, 'Company name is required'],
    trim: true,
    maxlength: [100, 'Company name cannot exceed 100 characters']
  },
  jobUrl: {
    type: String,
    trim: true,
    validate: {
      validator: function(v: string) {
        if (!v) return true;
        return /^https?:\/\/.+/.test(v);
      },
      message: 'Job URL must be a valid URL'
    }
  },
  jobDescription: {
    type: String,
    trim: true,
    maxlength: [5000, 'Job description cannot exceed 5000 characters']
  },
  sponsorship: {
    type: String,
    enum: ['yes', 'no', 'unknown'],
    default: 'unknown'
  },
  location: {
    type: String,
    trim: true,
    maxlength: [100, 'Location cannot exceed 100 characters']
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
  status: {
    type: String,
    enum: ['created', 'applied', 'screening', 'interview', 'offer', 'rejected', 'accepted', 'withdrawn'],
    default: 'created',
    required: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  applicationDate: {
    type: Date,
    required: false
  },
  deadline: {
    type: Date,
    validate: {
      validator: function(v: Date) {
        if (!v) return true;
        // Allow past dates for historical job applications
        return true;
      },
      message: 'Invalid deadline date'
    }
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [2000, 'Notes cannot exceed 2000 characters']
  },
  contacts: [{
    name: { type: String, required: true, trim: true },
    role: { type: String, trim: true },
    email: { type: String, trim: true },
    phone: { type: String, trim: true },
    linkedin: { type: String, trim: true }
  }],
  interviews: [{
    type: {
      type: String,
      enum: ['phone', 'video', 'onsite', 'technical', 'behavioral'],
      required: true
    },
    date: { type: Date, required: true },
    duration: { type: Number, min: 15, max: 480 }, // in minutes
    interviewer: { type: String, trim: true },
    notes: { type: String, trim: true, maxlength: 1000 },
    outcome: {
      type: String,
      enum: ['scheduled', 'completed', 'cancelled', 'no-show'],
      default: 'scheduled'
    },
    feedback: { type: String, trim: true, maxlength: 1000 }
  }],
  followUps: [{
    date: { type: Date, required: true },
    type: {
      type: String,
      enum: ['email', 'phone', 'linkedin', 'other'],
      required: true
    },
    description: { type: String, required: true, trim: true, maxlength: 500 },
    outcome: { type: String, trim: true, maxlength: 500 }
  }],
  attachments: [{
    name: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ['cv', 'cover-letter', 'certificate', 'portfolio', 'other'],
      required: true
    },
    url: { type: String, required: true, trim: true },
    size: { type: Number, required: true, min: 0 }
  }],
  tags: [{ type: String, trim: true }],
  isArchived: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      
      // Safely handle the daysSinceApplication calculation
      try {
        // Use doc instead of this for better reliability
        if (doc && doc.applicationDate && doc.applicationDate instanceof Date) {
          const now = new Date();
          const diffTime = Math.abs(now.getTime() - doc.applicationDate.getTime());
          ret.daysSinceApplication = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        } else {
          ret.daysSinceApplication = null;
        }
      } catch (error) {
        console.error('Error calculating daysSinceApplication in toJSON:', error);
        ret.daysSinceApplication = null;
      }
      
      return ret;
    }
  }
});

// Indexes for better query performance
jobApplicationSchema.index({ userId: 1, status: 1 });
jobApplicationSchema.index({ userId: 1, applicationDate: -1 });
jobApplicationSchema.index({ userId: 1, company: 1 });
jobApplicationSchema.index({ userId: 1, isArchived: 1 });
jobApplicationSchema.index({ 'contacts.email': 1 });



export default mongoose.models.JobApplication || mongoose.model<IJobApplication>('JobApplication', jobApplicationSchema); 