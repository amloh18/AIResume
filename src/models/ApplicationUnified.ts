/**
 * DEAD CODE INVENTORY (audit 2026-09-24, fix-tasks R8.1) — **do not extend**.
 *
 * No file in the repository imports `models/ApplicationUnified` (verified by grep 2026-09-24). The
 * live application record is `JobApplication` (+ `ApplicationJourney` for document staging), and the
 * divergence between these representations is precisely GAP-12, which fix-tasks Q4 placed out of
 * scope for this pass. Removal/convergence candidate — do not add a second writer.
 */
import mongoose, { Schema, Document } from 'mongoose';

export type CanonicalStage = 'saved' | 'staging' | 'applied' | 'interview' | 'offer' | 'rejected';

export type ApplicationMethod = 'manual' | 'auto';

export type ApplicationPriority = 'low' | 'medium' | 'high';

export interface IApplicationEvidence {
  confirmationId?: string;
  confirmationUrl?: string;
  confirmationText?: string;
  emailMessageId?: string;
  capturedAt?: Date;
  verificationConfidence?: number;
}

export interface IApplicationDocument extends Document {
  userId: mongoose.Types.ObjectId;
  jobId: mongoose.Types.ObjectId;
  
  // Current state
  currentStage: CanonicalStage;
  internalStatus: string;
  applicationMethod: ApplicationMethod;
  
  // References
  cvId?: mongoose.Types.ObjectId;
  coverLetterId?: mongoose.Types.ObjectId;
  
  // Automation
  automationEnabled: boolean;
  automationRunId?: string;
  attempts: number;
  
  // Intelligence
  matchScore?: number;
  trustScore?: number;
  trustSnapshot?: {
    applicantsCount?: number;
    postedDateText?: string;
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
  missingKeywords?: string[];
  matchedSkills?: string[];
  skillGapAnalysis?: any;
  
  // Tracker UI fields
  jobTitle: string;
  company: string;
  companyLogo?: string;
  location?: string;
  salary?: {
    min?: number;
    max?: number;
    currency?: string;
    period?: 'hourly' | 'monthly' | 'yearly';
  };
  status: string;
  priority: ApplicationPriority;
  applicationDate?: Date;
  deadline?: Date;
  notes?: string;
  tags: string[];
  
  // Contacts and interviews (from JobApplication)
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
  
  // Source tracking
  source?: string;
  sourceUrl?: string;
  atsType?: 'greenhouse' | 'lever' | 'workable' | 'naukri' | 'indeed' | 'adzuna' | 'ashby' | 'workday' | 'unknown';
  atsScore?: number;
  
  // Interview Coach (from JobApplication)
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
        rationale: string;
        edge: string;
        gap: string;
        sampleAnswer: string;
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
  extractedJd?: any;
  
  // Evidence (from Application)
  evidence?: IApplicationEvidence;
  
  // Archival
  isArchived: boolean;
  
  createdAt: Date;
  updatedAt: Date;
}

const ApplicationUnifiedSchema = new Schema<IApplicationDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    jobId: {
      type: Schema.Types.ObjectId,
      ref: 'Job',
      required: true,
      index: true,
    },
    
    // Current state
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
    
    // References
    cvId: { type: Schema.Types.ObjectId, ref: 'CV' },
    coverLetterId: { type: Schema.Types.ObjectId, ref: 'CoverLetter' },
    
    // Automation
    automationEnabled: { type: Boolean, default: false },
    automationRunId: { type: String },
    attempts: { type: Number, default: 0 },
    
    // Intelligence
    matchScore: { type: Number, min: 0, max: 100 },
    trustScore: { type: Number, min: 0, max: 100 },
    trustSnapshot: {
      applicantsCount: { type: Number, min: 0 },
      postedDateText: { type: String, trim: true, maxlength: 100 },
      postedAgeDays: { type: Number, min: 0 },
      wasReposted: { type: Boolean },
      repostCount: { type: Number, min: 0 },
      ghostRiskLevel: { type: String, enum: ['low', 'medium', 'high'] },
      lowProbability: { type: Boolean },
    },
    transparencySnapshot: {
      workMode: {
        type: String,
        enum: ['remote', 'hybrid', 'onsite', 'unknown'],
        default: 'unknown',
      },
      workModeStrict: { type: Boolean },
      salaryDisclosed: { type: Boolean },
      salarySource: {
        type: String,
        enum: ['extracted', 'estimated', 'unknown'],
        default: 'unknown',
      },
    },
    missingKeywords: [{ type: String, trim: true }],
    matchedSkills: [{ type: String, trim: true }],
    skillGapAnalysis: { type: Schema.Types.Mixed },
    
    // Tracker UI fields
    jobTitle: {
      type: String,
      required: [true, 'Job title is required'],
      trim: true,
      maxlength: [100, 'Job title cannot exceed 100 characters'],
    },
    company: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
      maxlength: [100, 'Company name cannot exceed 100 characters'],
    },
    companyLogo: {
      type: String,
      trim: true,
      maxlength: [1000, 'Company logo URL cannot exceed 1000 characters'],
    },
    location: {
      type: String,
      trim: true,
      maxlength: [100, 'Location cannot exceed 100 characters'],
    },
    salary: {
      min: { type: Number, min: 0 },
      max: { type: Number, min: 0 },
      currency: { type: String, default: 'USD' },
      period: {
        type: String,
        enum: ['hourly', 'monthly', 'yearly'],
        default: 'yearly',
      },
    },
    status: {
      type: String,
      enum: ['saved', 'created', 'applied', 'screening', 'interview', 'offer', 'rejected', 'accepted', 'withdrawn'],
      default: 'created',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
    applicationDate: { type: Date },
    deadline: { type: Date },
    notes: {
      type: String,
      trim: true,
      maxlength: [2000, 'Notes cannot exceed 2000 characters'],
    },
    tags: [{ type: String, trim: true }],
    
    // Contacts and interviews
    contactDetails: {
      name: { type: String, trim: true },
      email: { type: String, trim: true },
      phone: { type: String, trim: true },
      role: { type: String, trim: true },
    },
    contacts: [{
      name: { type: String, required: true, trim: true },
      role: { type: String, trim: true },
      email: { type: String, trim: true },
      phone: { type: String, trim: true },
      linkedin: { type: String, trim: true },
    }],
    interviews: [{
      type: {
        type: String,
        enum: ['phone', 'video', 'onsite', 'technical', 'behavioral'],
        required: true,
      },
      date: { type: Date, required: true },
      duration: { type: Number, min: 15, max: 480 },
      interviewer: { type: String, trim: true },
      notes: { type: String, trim: true, maxlength: 1000 },
      outcome: {
        type: String,
        enum: ['scheduled', 'completed', 'cancelled', 'no-show'],
        default: 'scheduled',
      },
      feedback: { type: String, trim: true, maxlength: 1000 },
    }],
    followUps: [{
      date: { type: Date, required: true },
      type: {
        type: String,
        enum: ['email', 'phone', 'linkedin', 'other'],
        required: true,
      },
      description: { type: String, required: true, trim: true, maxlength: 500 },
      outcome: { type: String, trim: true, maxlength: 500 },
    }],
    attachments: [{
      name: { type: String, required: true, trim: true },
      type: {
        type: String,
        enum: ['cv', 'cover-letter', 'certificate', 'portfolio', 'other'],
        required: true,
      },
      url: { type: String, required: true, trim: true },
      size: { type: Number, required: true, min: 0 },
    }],
    
    // Source tracking
    source: { type: String, trim: true },
    sourceUrl: {
      type: String,
      trim: true,
      maxlength: [500, 'Source URL cannot exceed 500 characters'],
    },
    atsType: {
      type: String,
      enum: ['greenhouse', 'lever', 'workable', 'naukri', 'indeed', 'adzuna', 'ashby', 'workday', 'unknown'],
      default: 'unknown',
    },
    atsScore: { type: Number, min: 0, max: 100 },
    
    // Interview Coach
    interviewCoach: {
      status: {
        type: String,
        enum: ['not_started', 'ready'],
        default: 'not_started',
      },
      generatedAt: { type: Date },
      linkedCvId: { type: Schema.Types.ObjectId, ref: 'CV' },
      readinessScore: { type: Number, default: 0, min: 0, max: 100 },
      modules: [{
        id: { type: String, required: true },
        name: { type: String, required: true },
        description: { type: String },
        questionIds: [{ type: String }],
      }],
      questions: [{
        id: { type: String, required: true },
        category: { type: String, required: true },
        question: { type: String, required: true },
        difficulty: {
          type: String,
          enum: ['Easy', 'Medium', 'Hard'],
          default: 'Medium',
        },
        aiContext: {
          rationale: { type: String },
          edge: { type: String },
          gap: { type: String },
          sampleAnswer: { type: String },
        },
        isSavedToCheatSheet: { type: Boolean, default: false },
        status: {
          type: String,
          enum: ['pending', 'drafted', 'completed'],
          default: 'pending',
        },
        userAnswer: { type: String, default: '' },
        feedback: {
          score: { type: Number, min: 0, max: 100 },
          strengths: [{ type: String }],
          improvements: [{ type: String }],
          refinedAnswer: { type: String },
          feedback_summary: { type: String },
          your_edge: { type: String },
        },
      }],
    },
    extractedJd: { type: Schema.Types.Mixed, default: null },
    
    // Evidence
    evidence: {
      confirmationId: { type: String },
      confirmationUrl: { type: String },
      confirmationText: { type: String },
      emailMessageId: { type: String },
      capturedAt: { type: Date },
      verificationConfidence: { type: Number },
    },
    
    // Archival
    isArchived: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret: any) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Indexes
ApplicationUnifiedSchema.index({ userId: 1, jobId: 1 }, { unique: true });
ApplicationUnifiedSchema.index({ userId: 1, currentStage: 1 });
ApplicationUnifiedSchema.index({ userId: 1, applicationMethod: 1 });
ApplicationUnifiedSchema.index({ userId: 1, createdAt: -1 });
ApplicationUnifiedSchema.index({ userId: 1, status: 1 });
ApplicationUnifiedSchema.index({ userId: 1, isArchived: 1 });
ApplicationUnifiedSchema.index({ source: 1, createdAt: -1 });

export default mongoose.models.ApplicationUnified ||
  mongoose.model<IApplicationDocument>('ApplicationUnified', ApplicationUnifiedSchema);
