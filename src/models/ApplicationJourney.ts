import mongoose, { Schema, Document } from 'mongoose';

export interface IApplicationJourney extends Document {
  journeyId?: string; // Unique journey identifier
  userId: string;
  jobId: string;
  cvId?: string; // Single source of truth for CV-Job relationship
  coverLetterId?: string; // Single source of truth for CoverLetter-Job relationship
  status: 'in-progress' | 'completed' | 'paused' | 'processing_documents' | 'creation_failed' | 'ready';
  currentStep: number;
  totalSteps: number;
  atsScore?: number;
  atsScoreJobId?: string;
  jobTitle: string;
  company: string;
  journeyType: 'standard' | 'creative' | 'technical' | 'leadership' | 'custom';
  steps: Array<{
    stepId: number;
    name: string;
    status: 'pending' | 'active' | 'completed';
    completedAt?: Date;
    data?: any;
  }>;
  // New fields for journey completion system
  completedAt?: Date;
  lastWorkedOn: Date;
  atsScoreHistory: Array<{
    score: number;
    calculatedAt: Date;
    cvVersion?: string;
  }>;
  downloadHistory: Array<{
    type: 'zip' | 'cv' | 'coverLetter' | 'jobDescription';
    downloadedAt: Date;
  }>;
  journeyDuration?: number; // in minutes
  applicationDate?: Date; // when moved to applied
  generationState?: {
    status: 'queued' | 'in_progress' | 'completed' | 'failed';
    mode: 'tailored' | 'fallback';
    reasonCode: string;
    title: string;
    summary: string;
    supportMessage: string;
    nextAction: string;
    nextActionLabel: string;
    isTailoredEligible: boolean;
    aiCreditsRemaining?: number;
    aiCreditsLimit?: number;
    fallbackCreated?: boolean;
    failureMessage?: string;
    documents: {
      cv: 'queued' | 'created' | 'failed';
      coverLetter: 'queued' | 'created' | 'failed';
    };
    updatedAt: string;
  };
  // Job-Landing Intelligence Layer
  intelligence?: {
    tailoringMode: 'standard' | 'standout';
    overallMatch: number;
    hardRequirementMatch: number;
    keywordCoverage: number;
    totalKeywords: number;
    canReuse: boolean;
  };
  // Application automation artifacts
  artifacts?: {
    atsType?: string;
    detectedFields?: Array<{
      label: string;
      type: string;
      required: boolean;
      filled: boolean;
      fillMethod: 'deterministic' | 'ai' | 'skipped' | 'error';
      value?: string;
      error?: string;
    }>;
    screenshots?: Array<{
      url: string;
      capturedAt: Date;
      context: 'before_submit' | 'on_error' | 'captcha_detected' | 'field_detection';
    }>;
    fillAudit?: {
      totalFields: number;
      filledFields: number;
      skippedFields: number;
      errorFields: number;
      filledAt: Date;
      duration: number; // milliseconds
    };
    submissionAttempt?: {
      attemptedAt: Date;
      success: boolean;
      error?: string;
      httpStatusCode?: number;
      responseSnippet?: string;
    };
    dryRun?: boolean;
  };
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    lastAccessedAt: Date;
    completedAt?: Date;
    tags?: string[];
    notes?: string;
  };
}

const ApplicationJourneySchema = new Schema<IApplicationJourney>({
  journeyId: {
    type: String
    // Note: Index not needed here - not used in compound indexes
  },
  userId: {
    type: String,
    required: true
    // Note: Index defined in compound indexes below
  },
  jobId: {
    type: String,
    required: true
    // Note: Index defined in compound index below
  },
  cvId: {
    type: String
    // Note: Index can be added if needed for specific queries
  },
  coverLetterId: {
    type: String
    // Note: Index can be added if needed for specific queries
  },
  status: {
    type: String,
    enum: ['in-progress', 'completed', 'paused', 'processing_documents', 'creation_failed', 'ready'],
    default: 'in-progress'
    // Note: Index defined in compound indexes below
  },
  currentStep: {
    type: Number,
    default: 1,
    min: 1,
    max: 5
  },
  totalSteps: {
    type: Number,
    default: 5
  },
  atsScore: {
    type: Number,
    min: 0,
    max: 100
  },
  atsScoreJobId: {
    type: String
  },
  jobTitle: {
    type: String,
    required: true
  },
  company: {
    type: String,
    required: true
  },
  journeyType: {
    type: String,
    enum: ['standard', 'creative', 'technical', 'leadership', 'custom'],
    default: 'standard'
    // Note: Index only if needed for filtering queries
  },
  steps: [{
    stepId: {
      type: Number,
      required: true
    },
    name: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'active', 'completed'],
      default: 'pending'
    },
    completedAt: {
      type: Date
    },
    data: {
      type: Schema.Types.Mixed
    }
  }],
  // New fields for journey completion system
  completedAt: {
    type: Date
    // Note: Index defined in compound index below
  },
  lastWorkedOn: {
    type: Date,
    default: Date.now
    // Note: Index defined in compound index below
  },
  atsScoreHistory: [{
    score: {
      type: Number,
      required: true,
      min: 0,
      max: 100
    },
    calculatedAt: {
      type: Date,
      required: true,
      default: Date.now
    },
    cvVersion: {
      type: String
    }
  }],
  downloadHistory: [{
    type: {
      type: String,
      enum: ['zip', 'cv', 'coverLetter', 'jobDescription'],
      required: true
    },
    downloadedAt: {
      type: Date,
      required: true,
      default: Date.now
    }
  }],
  journeyDuration: {
    type: Number,
    min: 0
  },
  applicationDate: {
    type: Date
    // Note: Index defined as standalone below
  },
  generationState: {
    type: Schema.Types.Mixed
  },
  intelligence: {
    type: Schema.Types.Mixed
    // Stores Job-Landing Intelligence Layer data:
    // { tailoringMode, overallMatch, hardRequirementMatch, keywordCoverage, totalKeywords, canReuse }
  },
  artifacts: {
    atsType: {
      type: String,
      enum: ['greenhouse', 'lever', 'ashby', 'workday', 'workable', 'icims', 'smartrecruiters', 'unknown'],
    },
    detectedFields: [{
      label: { type: String, required: true },
      type: { type: String, required: true },
      required: { type: Boolean, default: false },
      filled: { type: Boolean, default: false },
      fillMethod: {
        type: String,
        enum: ['deterministic', 'ai', 'skipped', 'error'],
        default: 'skipped',
      },
      value: { type: String },
      error: { type: String },
    }],
    screenshots: [{
      url: { type: String, required: true },
      capturedAt: { type: Date, default: Date.now },
      context: {
        type: String,
        enum: ['before_submit', 'on_error', 'captcha_detected', 'field_detection'],
        required: true,
      },
    }],
    fillAudit: {
      totalFields: { type: Number, default: 0 },
      filledFields: { type: Number, default: 0 },
      skippedFields: { type: Number, default: 0 },
      errorFields: { type: Number, default: 0 },
      filledAt: { type: Date },
      duration: { type: Number, default: 0 },
    },
    submissionAttempt: {
      attemptedAt: { type: Date },
      success: { type: Boolean, default: false },
      error: { type: String },
      httpStatusCode: { type: Number },
      responseSnippet: { type: String },
    },
    dryRun: {
      type: Boolean,
      default: false,
    },
  },
  metadata: {
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    },
    lastAccessedAt: {
      type: Date,
      default: Date.now
    },
    completedAt: {
      type: Date
    },
    tags: [{
      type: String
    }],
    notes: {
      type: String
    }
  }
}, {
  timestamps: true
});

// Optimized indexes for better query performance
ApplicationJourneySchema.index({ userId: 1, status: 1 }); // Compound index for common queries (without updatedAt since timestamps: true handles it)
ApplicationJourneySchema.index({ userId: 1, jobId: 1 }); // Index for performance, uniqueness handled in API
// Removed duplicate { status: 1 } index - already covered by { userId: 1, status: 1 } compound index
ApplicationJourneySchema.index({ userId: 1, completedAt: -1 }); // For completed journeys queries
ApplicationJourneySchema.index({ userId: 1, lastWorkedOn: -1 }); // For inactivity detection
ApplicationJourneySchema.index({ applicationDate: -1 }); // For application date queries
// Note: cvId and coverLetterId indexes are already defined in field definitions above

// Update the updatedAt and lastWorkedOn fields on save
ApplicationJourneySchema.pre('save', function(next) {
  this.metadata.updatedAt = new Date();
  this.lastWorkedOn = new Date();
  next();
});

export const ApplicationJourney = mongoose.models.ApplicationJourney || mongoose.model<IApplicationJourney>('ApplicationJourney', ApplicationJourneySchema);

export default ApplicationJourney;
