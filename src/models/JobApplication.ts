import mongoose, { Document, Schema } from 'mongoose';
import {
  JOB_APPLICATION_SOURCES,
  sanitizeJobApplicationSource,
  type JobApplicationSource,
} from '@/lib/jobs/jobApplicationSource';

export interface IJobApplication extends Document {
  userId: mongoose.Types.ObjectId | string;
  // cvId removed - relationships now managed through CVJourney
  jobId?: string; // Original job catalog ID (from jobs collection)
  jobTitle: string;
  company: string;
  companyLogo?: string; // Resolved company logo URL
  appliedAt?: Date; // When the application was actually submitted (first applied-like status)
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
  status: 'saved' | 'created' | 'applied' | 'screening' | 'interview' | 'offer' | 'rejected' | 'accepted' | 'withdrawn';
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
  source?: JobApplicationSource;
  sourceUrl?: string;
  atsType?: 'greenhouse' | 'lever' | 'workable' | 'naukri' | 'indeed' | 'adzuna' | 'ashby' | 'workday' | 'unknown';
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

  // Interview Coach - Embedded interview preparation data
  interviewCoach?: {
    status: 'not_started' | 'ready';
    generatedAt?: Date;
    linkedCvId?: mongoose.Types.ObjectId;
    readinessScore: number;
    modules: Array<{
      id: string;
      name: string;
      description: string;
      questionIds: string[];
    }>;
    questions: Array<{
      id: string;
      category: string;
      question: string;
      difficulty: 'Easy' | 'Medium' | 'Hard';
      aiContext: {
        rationale: string;    // Why this is asked
        edge: string;         // Your strength
        gap: string;          // The weakness/risk
        sampleAnswer: string; // STAR method sample script
      };
      isSavedToCheatSheet: boolean;
      status: 'pending' | 'drafted' | 'completed';
      userAnswer: string;
      feedback?: {
        score: number;
        strengths: string[];
        improvements: string[];
        refinedAnswer: string;
        feedback_summary?: string;
        your_edge?: string;
      };
    }>;
  };
  extractedJd?: any; // Stores rich AI extracted details mapped to .vscode/job_refine.md schema

  // ── State Machine (merged from Application model) ──────────────────
  currentStage: 'saved' | 'staging' | 'applied' | 'interview' | 'offer' | 'rejected';
  internalStatus:
    | 'saved'
    | 'staging_cv_generating'
    | 'staging_cover_letter_generating'
    | 'staging_ready'
    | 'queued'
    | 'processing'
    | 'form_detected'
    | 'submitting'
    | 'verification'
    | 'applied'
    | 'automation_failed'
    | 'automation_unknown'
    | 'review_required'
    | 'interview'
    | 'offer'
    | 'rejected';
  applicationMethod: 'manual' | 'auto';
  cvId?: mongoose.Types.ObjectId | string;
  coverLetterId?: mongoose.Types.ObjectId | string;
  automationEnabled: boolean;
  automationRunId?: string;
  attempts: number;
  maxAttempts: number;
  stageHistory: Array<{
    stage: string;
    internalStatus: string;
    changedAt: Date;
    reason?: string;
    source: 'user' | 'automation' | 'automation_worker' | 'email_intelligence' | 'admin' | 'system';
  }>;
  evidence?: {
    confirmationId?: string;
    confirmationUrl?: string;
    confirmationText?: string;
    emailMessageId?: string;
    capturedAt?: Date;
    verificationConfidence?: number;
  };
  // ── Retry / Backoff (Phase 6) ──────────────────────────────────────
  nextRetryAt?: Date;
  retryBackoffMs: number;
  deadLetter: boolean;
  deadLetterReason?: string;

  createdAt: Date;
  updatedAt: Date;
}

const jobApplicationSchema = new Schema<IJobApplication>({
  userId: {
    type: Schema.Types.Mixed, // Allow both ObjectId and string
    required: true
  },
  // cvId removed - relationships now managed through CVJourney
  jobId: {
    type: String,
    trim: true,
    default: undefined,
  },
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
  companyLogo: {
    type: String,
    trim: true,
    maxlength: [1000, 'Company logo URL cannot exceed 1000 characters']
  },
  appliedAt: {
    type: Date,
    required: false
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
    enum: ['draft', 'saved', 'created', 'applied', 'screening', 'interview', 'offer', 'rejected', 'accepted', 'withdrawn'],
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
    enum: JOB_APPLICATION_SOURCES,
    default: 'manual'
  },
  sourceUrl: {
    type: String,
    trim: true,
    maxlength: [500, 'Source URL cannot exceed 500 characters']
  },
  atsType: {
    type: String,
    enum: ['greenhouse', 'lever', 'workable', 'naukri', 'indeed', 'adzuna', 'ashby', 'workday', 'unknown'],
    default: 'unknown',
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
  // Interview Coach - Embedded interview preparation data
  interviewCoach: {
    status: {
      type: String,
      enum: ['not_started', 'ready'],
      default: 'not_started'
    },
    generatedAt: { type: Date },
    linkedCvId: { type: Schema.Types.ObjectId, ref: 'CV' },
    readinessScore: { type: Number, default: 0, min: 0, max: 100 },
    modules: [{
      id: { type: String, required: true },
      name: { type: String, required: true },
      description: { type: String },
      questionIds: [{ type: String }]
    }],
    questions: [{
      id: { type: String, required: true },
      category: { type: String, required: true },
      question: { type: String, required: true },
      difficulty: {
        type: String,
        enum: ['Easy', 'Medium', 'Hard'],
        default: 'Medium'
      },
      aiContext: {
        rationale: { type: String },    // Why this is asked
        edge: { type: String },         // Your strength
        gap: { type: String },          // The weakness/risk
        sampleAnswer: { type: String }  // STAR method sample script
      },
      isSavedToCheatSheet: { type: Boolean, default: false },
      status: {
        type: String,
        enum: ['pending', 'drafted', 'completed'],
        default: 'pending'
      },
      userAnswer: { type: String, default: '' },
      feedback: {
        score: { type: Number, min: 0, max: 100 },
        strengths: [{ type: String }],
        improvements: [{ type: String }],
        refinedAnswer: { type: String },
        feedback_summary: { type: String },
        your_edge: { type: String }
      }
    }]
  },
  extractedJd: {
    type: Schema.Types.Mixed,
    default: null
  },
  isArchived: {
    type: Boolean,
    default: false
  },
  // ── State Machine fields ──────────────────────────────────────────
  currentStage: {
    type: String,
    enum: ['saved', 'staging', 'applied', 'interview', 'offer', 'rejected'],
    default: 'saved',
    index: true,
  },
  internalStatus: {
    type: String,
    default: 'saved',
    index: true,
  },
  applicationMethod: {
    type: String,
    enum: ['manual', 'auto'],
    default: 'manual',
  },
  cvId: { type: Schema.Types.Mixed },
  coverLetterId: { type: Schema.Types.Mixed },
  automationEnabled: { type: Boolean, default: false },
  automationRunId: { type: String },
  attempts: { type: Number, default: 0 },
  maxAttempts: { type: Number, default: 3 },
  stageHistory: [{
    stage: { type: String, required: true },
    internalStatus: { type: String, required: true },
    changedAt: { type: Date, default: Date.now },
    reason: { type: String },
    source: {
      type: String,
      // `automation_worker` is what the application worker and the state machine
      // actually send (see processApplication.ts / stateMachine.ts). `automation`
      // is kept for backward compatibility with existing documents.
      enum: ['user', 'automation', 'automation_worker', 'email_intelligence', 'admin', 'system'],
      default: 'user',
    },
  }],
  evidence: {
    confirmationId: { type: String },
    confirmationUrl: { type: String },
    confirmationText: { type: String },
    emailMessageId: { type: String },
    capturedAt: { type: Date },
    verificationConfidence: { type: Number },
  },
  // ── Retry / Backoff ───────────────────────────────────────────────
  nextRetryAt: { type: Date },
  retryBackoffMs: { type: Number, default: 0 },
  deadLetter: { type: Boolean, default: false, index: true },
  deadLetterReason: { type: String }
}, {
  timestamps: true,
  toJSON: {
    transform: function (doc, ret: any) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      
      // Ensure extractedJd is passed to client
      if (doc.extractedJd) {
        ret.extractedJd = doc.extractedJd;
      }

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
jobApplicationSchema.index({ userId: 1 }); // Primary index for user queries
jobApplicationSchema.index({ userId: 1, status: 1 });
jobApplicationSchema.index({ userId: 1, applicationDate: -1 });
jobApplicationSchema.index({ userId: 1, company: 1 });
jobApplicationSchema.index({ userId: 1, isArchived: 1 });
jobApplicationSchema.index({ userId: 1, currentStage: 1 });
jobApplicationSchema.index({ userId: 1, internalStatus: 1 });
jobApplicationSchema.index({ deadLetter: 1, nextRetryAt: 1 });
jobApplicationSchema.index({ 'contacts.email': 1 });

// Dedup: compound unique index prevents duplicate jobs per user
// Sparse so null jobUrls don't conflict
jobApplicationSchema.index(
  { userId: 1, jobTitle: 1, company: 1 },
  { unique: true, name: 'user_job_dedup' }
);

jobApplicationSchema.pre('validate', function (next) {
  this.source = sanitizeJobApplicationSource(this.source);
  next();
});

const ExistingJobApplication = mongoose.models.JobApplication as mongoose.Model<IJobApplication> | undefined;
if (ExistingJobApplication) {
  const sourcePath = ExistingJobApplication.schema.path('source') as { enumValues?: string[]; options?: { enum?: string[] } } | undefined;
  if (sourcePath) {
    sourcePath.enumValues = [...JOB_APPLICATION_SOURCES];
    if (sourcePath.options) sourcePath.options.enum = [...JOB_APPLICATION_SOURCES];
  }
  const schemaWithFlag = ExistingJobApplication.schema as typeof ExistingJobApplication.schema & { __sourceSanitizeHook?: boolean };
  if (!schemaWithFlag.__sourceSanitizeHook) {
    schemaWithFlag.pre('validate', function (next) {
      this.source = sanitizeJobApplicationSource(this.source);
      next();
    });
    schemaWithFlag.__sourceSanitizeHook = true;
  }
}

export default ExistingJobApplication || mongoose.model<IJobApplication>('JobApplication', jobApplicationSchema, 'jobapplications'); 