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
  offerDetails?: {
    salary?: number;
    bonus?: string;
    equity?: string;
    deadline?: Date;
    status?: string;
  };
  status: 'draft' | 'created' | 'applied' | 'screening' | 'interview' | 'offer' | 'rejected' | 'accepted' | 'withdrawn';
  priority: 'low' | 'medium' | 'high';
  applicationDate?: Date;
  deadline?: Date;
  notes?: string;
  contactDetails?: {
    name?: string;
    email?: string;
    phone?: string;
    role?: string;
  };
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
  source?: 'extension' | 'manual' | 'import' | 'linkedin' | 'indeed' | 'company-website' | 'referral' | 'other';
  sourceUrl?: string;
  atsScore?: number;
  isArchived: boolean;
  // Phase 4: Intelligence & Automation fields
  matchScore?: number; // 0-100, job-specific match score (NULL for draft jobs)
  trustScore?: number; // 0-100, trust score derived from ghost-risk + transparency signals
  trustSnapshot?: {
    applicantsCount?: number;
    postedDateText?: string; // raw string (e.g., "2 weeks ago")
    postedAgeDays?: number;
    wasReposted?: boolean;
    repostCount?: number;
    ghostRiskLevel?: 'low' | 'medium' | 'high';
    lowProbability?: boolean;
  };
  transparencySnapshot?: {
    workMode?: 'remote' | 'hybrid' | 'onsite' | 'unknown';
    workModeStrict?: boolean;
    salaryDisclosed?: boolean;
    salarySource?: 'extracted' | 'estimated' | 'unknown';
  };
  missingKeywords?: string[]; // Job-specific missing keywords
  matchedSkills?: string[]; // Skills that match THIS job
  skillGapAnalysis?: {
    // Legacy format (backward compatibility)
    critical?: string[];
    important?: string[];
    recommendations?: string[];
    // Enhanced format
    overallMatchScore?: number;
    lastAnalyzed?: Date;
    jobDescriptionHash?: string;
    masterCVUpdatedAt?: Date;
    categories?: Array<{
      name: string;
      requiredSkills: number;
      matchedSkills: number;
      skills: Array<{
        name: string;
        status: 'mastered' | 'transferable' | 'critical-gap';
        priority: 'critical' | 'high' | 'medium';
        jdContext: string;
        cvEvidence?: string;
        courseRecommendation?: {
          provider: string;
          title: string;
          url: string;
          estimatedHours: number;
        };
        cvRephraseSuggestion?: string;
      }>;
    }>;
  }; // For THIS specific job
  jobDescriptionRaw?: string; // Original job description text for future analysis
  advocateId?: string; // Reference to Advocate (referral contact)
  createdAt: Date;
  updatedAt: Date;
}

const jobApplicationSchema = new Schema<IJobApplication>({
  userId: {
    type: Schema.Types.Mixed, // Allow both ObjectId and string
    required: true
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
      validator: function (v: string) {
        if (!v) return true;
        return /^https?:\/\/.+/.test(v);
      },
      message: 'Job URL must be a valid URL'
    }
  },
  jobDescription: {
    type: String,
    trim: true,
    maxlength: [50000, 'Job description cannot exceed 50000 characters']
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
  offerDetails: {
    salary: { type: Number, min: 0 },
    bonus: { type: String, trim: true },
    equity: { type: String, trim: true },
    deadline: { type: Date },
    status: { type: String, trim: true } // e.g., 'pending', 'accepted', 'declined', 'expired'
  },
  status: {
    type: String,
    enum: ['draft', 'created', 'applied', 'screening', 'interview', 'offer', 'rejected', 'accepted', 'withdrawn'],
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
      validator: function (v: Date) {
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
  contactDetails: {
    name: { type: String, trim: true },
    email: { type: String, trim: true },
    phone: { type: String, trim: true },
    role: { type: String, trim: true }
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
  source: {
    type: String,
    enum: ['extension', 'manual', 'import', 'linkedin', 'indeed', 'company-website', 'referral', 'other'],
    default: 'manual'
  },
  sourceUrl: {
    type: String,
    trim: true,
    maxlength: [500, 'Source URL cannot exceed 500 characters']
  },
  atsScore: {
    type: Number,
    min: 0,
    max: 100
  },
  // Phase 4: Intelligence & Automation fields
  matchScore: {
    type: Number,
    min: 0,
    max: 100
  },
  trustScore: {
    type: Number,
    min: 0,
    max: 100
  },
  trustSnapshot: {
    applicantsCount: { type: Number, min: 0 },
    postedDateText: { type: String, trim: true, maxlength: 100 },
    postedAgeDays: { type: Number, min: 0 },
    wasReposted: { type: Boolean },
    repostCount: { type: Number, min: 0 },
    ghostRiskLevel: { type: String, enum: ['low', 'medium', 'high'] },
    lowProbability: { type: Boolean }
  },
  transparencySnapshot: {
    workMode: {
      type: String,
      enum: ['remote', 'hybrid', 'onsite', 'unknown'],
      default: 'unknown'
    },
    workModeStrict: { type: Boolean },
    salaryDisclosed: { type: Boolean },
    salarySource: {
      type: String,
      enum: ['extracted', 'estimated', 'unknown'],
      default: 'unknown'
    }
  },
  missingKeywords: [{ type: String, trim: true }],
  matchedSkills: [{ type: String, trim: true }],
  skillGapAnalysis: {
    type: Schema.Types.Mixed, // Allow both legacy and enhanced formats
    default: {}
  },
  jobDescriptionRaw: {
    type: String,
    trim: true,
    maxlength: [50000, 'Raw job description cannot exceed 50000 characters']
  },
  advocateId: {
    type: String,
    trim: true
  },
  isArchived: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function (doc, ret: any) {
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
// Indexes for better query performance
// CRITICAL: Simple userId index for fast lookups (most common query pattern)
jobApplicationSchema.index({ userId: 1 }); // Primary index for user queries - should reduce query time significantly
jobApplicationSchema.index({ userId: 1, status: 1 });
jobApplicationSchema.index({ userId: 1, applicationDate: -1 });
jobApplicationSchema.index({ userId: 1, company: 1 });
jobApplicationSchema.index({ userId: 1, isArchived: 1 });
jobApplicationSchema.index({ 'contacts.email': 1 });



export default mongoose.models.JobApplication || mongoose.model<IJobApplication>('JobApplication', jobApplicationSchema); 